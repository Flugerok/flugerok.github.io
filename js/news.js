/*
  news.js (js/)
  -------------
  Отрисовывает блок "Новости орнитологии" на главной странице из
  данных data/news.js. Показывает первые 3 записи из массива NEWS.
  Если файл с новостями не подключён или пуст — секция просто
  остаётся пустой, без ошибок на экране.

  Про картинки: если у новости указано поле image (ссылка на фото с
  Pexels/Unsplash — см. объяснение в data/news.js), показывается
  настоящая фотография с подписью автора. Если фото не загрузилось
  (например ссылка устарела) ИЛИ поле image не указано — вместо
  сломанной картинки подставляется небольшая нарисованная иллюстрация
  (выбирается полем icon: "finch"/"eagle"/"swan"/по умолчанию).
*/

document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".js-news-grid");
  if (!container || typeof NEWS === "undefined" || !NEWS.length) return;

  NEWS.slice(0, 3).forEach((item) => {
    container.appendChild(createNewsCard(item));
  });
});

const NEWS_ICONS = {
  // Зяблик / мелкая птица на ветке
  finch: `
    <ellipse cx="28" cy="38" rx="16" ry="12" stroke="#8C5A34" stroke-width="2"/>
    <circle cx="44" cy="26" r="8" stroke="#8C5A34" stroke-width="2"/>
    <path d="M51 25 L59 23 L51 29 Z" fill="#8C5A34"/>
    <circle cx="46" cy="24" r="1.4" fill="#8C5A34"/>
    <path d="M16 38 Q 8 34 6 26" stroke="#8C5A34" stroke-width="2" stroke-linecap="round"/>
    <line x1="24" y1="50" x2="22" y2="58" stroke="#8C5A34" stroke-width="2" stroke-linecap="round"/>
    <line x1="34" y1="50" x2="36" y2="58" stroke="#8C5A34" stroke-width="2" stroke-linecap="round"/>
    <line x1="8" y1="58" x2="56" y2="58" stroke="#C99A6A" stroke-width="2"/>
  `,
  // Орёл / хищная птица в полёте (вид сверху, раскрытые крылья)
  eagle: `
    <path d="M32 24 L4 16 L22 30 L4 34 L26 36 L32 46 L38 36 L60 34 L42 30 L60 16 L32 24 Z"
      stroke="#8C5A34" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="32" cy="26" r="2" fill="#8C5A34"/>
  `,
  // Лебедь / изогнутая шея
  swan: `
    <path d="M16 48 C 14 38, 20 30, 30 30 C 26 26, 26 20, 30 16 C 33 13, 38 13, 40 16"
      stroke="#8C5A34" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="41" cy="15" r="2.6" stroke="#8C5A34" stroke-width="2"/>
    <circle cx="42" cy="14.3" r="0.9" fill="#8C5A34"/>
    <path d="M30 30 C 34 44, 26 50, 14 48 C 10 47.5, 8 48, 8 48"
      stroke="#8C5A34" stroke-width="2" stroke-linecap="round"/>
    <path d="M6 54 Q 30 58 56 50" stroke="#C99A6A" stroke-width="2" stroke-linecap="round"/>
  `,
  // По умолчанию — обобщённый силуэт птицы в полёте
  default: `
    <path d="M6 40 C 16 28, 26 26, 32 32 C 38 22, 50 16, 58 18 C 52 24, 48 28, 48 32
             C 54 32, 58 36, 58 40 C 50 38, 44 40, 40 46 C 34 40, 26 38, 18 42
             C 14 44, 9 44, 6 40 Z"
      stroke="#8C5A34" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="46" cy="24" r="1.6" fill="#8C5A34"/>
  `,
};

function newsIconSvg(iconKey) {
  const inner = NEWS_ICONS[iconKey] || NEWS_ICONS.default;
  return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createNewsCard(item) {
  const card = document.createElement("a");
  card.className = "news-card";
  card.href = item.url;
  card.target = "_blank";
  card.rel = "noopener";

  const mediaHtml = item.image
    ? `<img src="${item.image}" alt="${escapeHtml(item.title)}" loading="lazy" width="900" height="394">`
    : newsIconSvg(item.icon);

  const metaText = item.credit
    ? `${item.source} · ${item.date} · фото: ${item.credit}`
    : `${item.source} · ${item.date}`;

  card.innerHTML = `
    <div class="news-card__media" aria-hidden="true">${mediaHtml}</div>
    <div class="news-card__body">
      <h3 class="news-card__title">${item.title}</h3>
      <p class="news-card__summary">${item.summary}</p>
      <p class="news-card__meta">${metaText}</p>
    </div>
  `;

  // Фолбэк: если настоящее фото не загрузилось (ссылка устарела,
  // сайт-источник недоступен и т.п.) — подставляем нарисованную
  // иллюстрацию вместо сломанной картинки, один раз.
  const img = card.querySelector(".news-card__media img");
  if (img) {
    img.addEventListener(
      "error",
      () => {
        const media = card.querySelector(".news-card__media");
        if (media) media.innerHTML = newsIconSvg(item.icon);
      },
      { once: true }
    );
  }

  return card;
}
