/*
  weather.js
  ----------
  Небольшой информер с температурой и ветром — тематически в духе
  сайта (флюгер = ветер). Работает без backend: обращается напрямую
  из браузера к бесплатным API без ключа (ключ негде было бы спрятать
  на статическом сайте).

  Источники данных:
  - Open-Meteo (https://open-meteo.com) — сама погода и ветер.
  - BigDataCloud reverse-geocode-client — определение названия города
    по координатам, нужно только при нажатии "Мой город".
  Оба сервиса бесплатны, не требуют API-ключа и разрешают запросы
  прямо из браузера (CORS).

  По умолчанию показывается город из js/config.js
  (SITE_CONFIG.weatherCity/weatherLat/weatherLon — по умолчанию Минск).
  Кнопка "Мой город" запрашивает геолокацию — ТОЛЬКО по клику
  посетителя, браузер сам покажет системный запрос разрешения.

  Значок рядом с показаниями — маленький вентилятор (четыре лопасти):
  он крутится непрерывно, а скорость вращения зависит от реальной
  скорости ветра по данным Open-Meteo — слабый ветер крутит его
  медленно, сильный — заметно быстрее. Направление ветра показывается
  рядом текстом (например "СЗ"), отдельно от иконки. Для посетителей,
  которым анимации мешают (настройка "уменьшить движение" в ОС),
  вращение отключается само — вентилятор остаётся неподвижным.

  Если что-то не загрузилось (нет сети, посетитель отказал в
  геолокации и т.п.) — информер просто остаётся скрытым, без ошибок
  на экране.
*/

document.addEventListener("DOMContentLoaded", () => {
  const chip = document.querySelector(".js-weather-chip");
  if (!chip || typeof SITE_CONFIG === "undefined") return;

  const textEl = chip.querySelector(".js-weather-text");
  const iconEl = chip.querySelector(".js-weather-icon") || chip.querySelector(".weather-chip__icon");
  const locateBtn = chip.querySelector(".js-weather-locate");
  if (!textEl) return;

  const defaultCity = SITE_CONFIG.weatherCity || "Минск";
  const defaultLat = SITE_CONFIG.weatherLat != null ? SITE_CONFIG.weatherLat : 53.9006;
  const defaultLon = SITE_CONFIG.weatherLon != null ? SITE_CONFIG.weatherLon : 27.5590;

  loadWeather(defaultLat, defaultLon, defaultCity);

  if (locateBtn) {
    locateBtn.addEventListener("click", () => {
      if (!navigator.geolocation) return;
      locateBtn.disabled = true;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const city = await reverseGeocode(latitude, longitude);
          await loadWeather(latitude, longitude, city || "Ваш город");
          locateBtn.disabled = false;
        },
        () => {
          locateBtn.disabled = false; // посетитель отказал в доступе — просто ничего не меняем
        },
        { timeout: 8000 }
      );
    });
  }

  async function loadWeather(lat, lon, cityLabel) {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
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

      textEl.textContent = `${cityLabel}: ${sign}${temp}°C, ветер ${wind} м/с ${dir}`;
      if (iconEl) iconEl.style.setProperty("--spin-duration", `${spinDurationFromWind(c.wind_speed_10m)}s`);
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

  // Скорость ветра (м/с) -> длительность одного оборота вентилятора (сек).
  // Чем сильнее ветер, тем короче оборот (быстрее крутится).
  // Сверху и снизу ограничиваем, чтобы вентилятор не "замирал" в штиль
  // и не мельтешил без остановки в сильный ветер.
  function spinDurationFromWind(speedMs) {
    const raw = 14 / (speedMs + 1.2);
    return Math.round(Math.min(7, Math.max(0.9, raw)) * 10) / 10;
  }
});
