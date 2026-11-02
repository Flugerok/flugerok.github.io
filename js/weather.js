/*
  weather.js
  ----------
  Небольшой информер с температурой и ветром — тематически в духе
  сайта (флюгер = ветер). Работает без backend: обращается напрямую
  из браузера к бесплатным API без ключа.

  Источники данных:
  - Open-Meteo (https://open-meteo.com) — сама погода и ветер.
  - BigDataCloud reverse-geocode-client — название города по
    координатам, нужно только при определении местоположения.

  Какой город показывается:
  1. Если посетитель когда-то нажимал "Мой город" — запоминается его
     место (в localStorage браузера, только на его устройстве, на
     сервер ничего не уходит; координаты округляются до ~1 км) и при
     следующих заходах сразу показывается оно, а не Минск.
  2. Если браузеру уже выдано разрешение на геопозицию для сайта —
     место обновляется само, без повторных вопросов (если посетитель
     переехал дальше чем на ~5 км, показания и город обновятся).
  3. Иначе — город по умолчанию из js/config.js (weatherCity,
     weatherLat, weatherLon; по умолчанию Минск). Запрос разрешения
     у посетителя появляется ТОЛЬКО по клику на кнопку "Мой город".

  Вентилятор-значок: крутится непрерывно, а скорость вращения
  пропорциональна реальной скорости ветра (слабый — медленно, сильный
  — быстро). Вращение считается здесь, в скрипте, и плавно меняется
  при смене показаний. Для посетителей с настройкой "уменьшить
  движение" в ОС вентилятор не вращается.

  Если что-то не загрузилось (нет сети и т.п.) — информер просто
  остаётся скрытым, без ошибок на экране.
*/

document.addEventListener("DOMContentLoaded", () => {
  const chip = document.querySelector(".js-weather-chip");
  if (!chip || typeof SITE_CONFIG === "undefined") return;

  const textEl = chip.querySelector(".js-weather-text");
  const iconEl = chip.querySelector(".js-weather-icon") || chip.querySelector(".weather-chip__icon");
  const locateBtn = chip.querySelector(".js-weather-locate");
  if (!textEl) return;

  const STORAGE_KEY = "flugerok_weather_place";
  const SAME_PLACE_KM = 5;

  const defaultPlace = {
    city: SITE_CONFIG.weatherCity || "Минск",
    lat: SITE_CONFIG.weatherLat != null ? SITE_CONFIG.weatherLat : 53.9006,
    lon: SITE_CONFIG.weatherLon != null ? SITE_CONFIG.weatherLon : 27.5590,
  };

  /* ---------- Вращение вентилятора по скорости ветра ---------- */
  const reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let angle = 0;
  let degPerSec = 0;
  let lastTs = null;
  let rafId = null;

  // Скорость ветра (м/с) -> градусов в секунду. Линейная зависимость:
  // 1 м/с ~ 40°/с (оборот за 9 с), 3 м/с ~ 3 с, 10 м/с ~ 0,9 с,
  // 20 м/с ~ 0,45 с. Нижняя граница — чтобы в штиль вентилятор едва
  // заметно двигался, верхняя — чтобы не превращался в мельтешение.
  function degPerSecFromWind(speedMs) {
    return Math.min(900, Math.max(12, speedMs * 40));
  }

  function spinTick(ts) {
    if (lastTs !== null) {
      const dt = Math.min((ts - lastTs) / 1000, 0.1); // защита от скачка после паузы вкладки
      angle = (angle + degPerSec * dt) % 360;
      iconEl.style.transform = `rotate(${angle.toFixed(1)}deg)`;
    }
    lastTs = ts;
    rafId = requestAnimationFrame(spinTick);
  }

  function setWindSpeed(speedMs) {
    degPerSec = degPerSecFromWind(speedMs);
    if (iconEl && !reduceMotion && rafId === null) {
      rafId = requestAnimationFrame(spinTick);
    }
  }

  /* ---------- Хранение выбранного места ---------- */
  function readSavedPlace() {
    try {
      const v = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (v && isFinite(v.lat) && isFinite(v.lon) && v.city) return v;
    } catch (e) {}
    return null;
  }

  function savePlace(place) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(place));
    } catch (e) {}
  }

  function distanceKm(a, b) {
    const R = 6371;
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLon = rad(b.lon - a.lon);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /* ---------- Погода ---------- */
  async function showWeather(place) {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
        `&current=temperature_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("weather request failed");
      const data = await res.json();
      const c = data.current;
      if (!c || typeof c.temperature_2m !== "number") throw new Error("no current data");

      const temp = Math.round(c.temperature_2m);
      const wind = Math.round(c.wind_speed_10m * 10) / 10;
      const dir = compassDirection(c.wind_direction_10m);
      const sign = temp > 0 ? "+" : "";

      textEl.textContent = `${place.city}: ${sign}${temp}°C, ветер ${wind} м/с ${dir}`;
      chip.title = `Ветер ${wind} м/с — чем он сильнее, тем быстрее крутится вентилятор`;
      setWindSpeed(c.wind_speed_10m);
      chip.hidden = false;
    } catch (e) {
      // тихо ничего не показываем — сайт не должен выглядеть сломанным
    }
  }

  async function reverseGeocode(lat, lon) {
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ru`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return data.city || data.locality || data.principalSubdivision || null;
    } catch (e) {
      return null;
    }
  }

  function compassDirection(deg) {
    const dirs = ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"];
    const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
    return dirs[idx];
  }

  /* ---------- Определение местоположения ---------- */
  // Возвращает Promise с { lat, lon } или reject с ошибкой геолокации
  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("no geolocation"));
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: Math.round(pos.coords.latitude * 100) / 100,
            lon: Math.round(pos.coords.longitude * 100) / 100,
          }),
        (err) => reject(err),
        { timeout: 8000, maximumAge: 10 * 60 * 1000 }
      );
    });
  }

  // Определяет место, сохраняет его и показывает погоду.
  // Если место почти не изменилось по сравнению с сохранённым — берём
  // сохранённое название города, чтобы не делать лишний запрос.
  async function detectAndShow(savedPlace) {
    const pos = await getPosition();
    if (savedPlace && distanceKm(savedPlace, pos) < SAME_PLACE_KM) return savedPlace;
    const city = (await reverseGeocode(pos.lat, pos.lon)) || "Ваш город";
    const place = { city, lat: pos.lat, lon: pos.lon };
    savePlace(place);
    await showWeather(place);
    return place;
  }

  async function geolocationState() {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const st = await navigator.permissions.query({ name: "geolocation" });
        return st.state; // "granted" | "prompt" | "denied"
      }
    } catch (e) {}
    return null;
  }

  /* ---------- Запуск ---------- */
  (async function init() {
    const saved = readSavedPlace();
    const state = await geolocationState();

    if (saved) {
      await showWeather(saved);
      if (state === "granted") {
        // разрешение уже выдано — тихо проверяем, не сменилось ли место
        detectAndShow(saved).catch(() => {});
      }
      return;
    }

    if (state === "granted") {
      try {
        await detectAndShow(null);
        return;
      } catch (e) {
        // не получилось определить — показываем город по умолчанию
      }
    }
    await showWeather(defaultPlace);
  })();

  if (locateBtn) {
    locateBtn.addEventListener("click", async () => {
      locateBtn.disabled = true;
      try {
        await detectAndShow(null);
        locateBtn.title = "Показать погоду в моём городе";
      } catch (err) {
        if (err && err.code === 1) {
          locateBtn.title = "Доступ к геопозиции запрещён — разрешите его для сайта в настройках браузера";
        }
      } finally {
        locateBtn.disabled = false;
      }
    });
  }
});
