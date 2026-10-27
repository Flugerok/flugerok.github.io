/*
  passport.js
  -----------
  Логика, специфичная для страниц паспорта изделия (passport/*.html).
  Подключается только на этих страницах, отдельно от product.js.

  Делает две вещи:
  1. Считает и показывает, сколько дней прошло с даты изготовления
     (дата на странице записана как data-date="ГГГГ-ММ-ДД", а сам
     подсчёт делает браузер посетителя в момент открытия страницы).
  2. Открывает фотографии этого экземпляра в полноэкранном модальном
     окне на этой же странице, с перелистыванием стрелками, клавишами
     ← → и свайпом на телефоне — вместо перехода на отдельную картинку.
*/

document.addEventListener("DOMContentLoaded", () => {
  initDaysSince();
  initPassportGallery();
});

/* ---------- Сколько дней прошло с даты изготовления ---------- */
function initDaysSince() {
  const el = document.querySelector(".js-days-ago");
  if (!el) return;
  const iso = el.dataset.date;
  if (!iso) return;

  const made = new Date(iso + "T00:00:00");
  if (isNaN(made.getTime())) return;

  const now = new Date();
  const diffMs = now.setHours(0, 0, 0, 0) - made.setHours(0, 0, 0, 0);
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) return; // дата изготовления в будущем — на всякий случай ничего не показываем
  el.textContent = `(прошло ${days} ${pluralDays(days)})`;
}

function pluralDays(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "дня";
  return "дней";
}

/* ---------- Фотогалерея с полноэкранным просмотром ---------- */
function initPassportGallery() {
  const photoLinks = Array.from(document.querySelectorAll(".js-passport-photo"));
  const lightbox = document.querySelector(".js-lightbox");
  if (!photoLinks.length || !lightbox) return;

  const content = lightbox.querySelector(".js-lightbox-content");
  const closeBtn = lightbox.querySelector(".js-lightbox-close");
  const overlay = lightbox.querySelector(".js-lightbox-overlay");
  const prevBtn = lightbox.querySelector(".js-lightbox-prev");
  const nextBtn = lightbox.querySelector(".js-lightbox-next");
  if (!content) return;

  const media = photoLinks.map((a) => ({
    src: a.getAttribute("href"),
    alt: a.querySelector("img") ? a.querySelector("img").alt : "",
  }));
  let current = 0;

  function show(index) {
    current = (index + media.length) % media.length;
    content.innerHTML = `<img src="${media[current].src}" alt="${media[current].alt}">`;
  }
  function open(index) {
    show(index);
    lightbox.classList.add("is-open");
    document.body.classList.add("no-scroll");
  }
  function close() {
    lightbox.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
    content.innerHTML = ""; // на всякий случай, если когда-нибудь добавится видео
  }

  photoLinks.forEach((a, i) => {
    a.addEventListener("click", (e) => {
      e.preventDefault(); // вместо перехода по ссылке — открываем модальное окно
      open(i);
    });
  });

  const multiple = media.length > 1;
  if (prevBtn) prevBtn.hidden = !multiple;
  if (nextBtn) nextBtn.hidden = !multiple;
  if (prevBtn) prevBtn.addEventListener("click", () => show(current - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => show(current + 1));
  if (closeBtn) closeBtn.addEventListener("click", close);
  if (overlay) overlay.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") show(current + 1);
    if (e.key === "ArrowLeft") show(current - 1);
  });

  let touchStartX = null;
  lightbox.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });
  lightbox.addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
    touchStartX = null;
  }, { passive: true });
}
