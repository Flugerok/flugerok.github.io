#!/usr/bin/env node
/*
  build-passports.js
  -------------------
  Генерирует отдельную статическую HTML-страницу для каждого
  "паспорта" изготовленного флюгера:

    SN/<код модели>/<номер>.html

  Код модели — это первые 3 буквы самого номера, определяется
  автоматически, отдельно заполнять его не нужно. Например, номер
  "SNG01A0926" попадёт в файл SN/SNG/SNG01A0926.html — так все
  экземпляры одной модели лежат в одной подпапке, а не вперемешку.

  Что это за страницы и зачем они нужны — см. подробный комментарий
  в начале data/passports.js. Коротко: у каждого физического флюгера
  есть уникальный номер, нанесённый на само изделие. Через любое время
  владелец может ввести этот номер в поисковик и попасть на страницу
  именно своего экземпляра — с датой изготовления и фото на момент
  создания. Эти страницы сознательно не связаны ссылками с остальным
  сайтом (их нет ни в меню, ни в каталоге, ни в sitemap.xml) — попасть
  на них можно только зная точный номер. Вложенность папок на это
  никак не влияет: поисковик находит страницу по совпадению текста
  (заголовок, номер в тексте), а не по глубине пути.

  Как использовать
  ------------------
  1. Добавьте новую запись в data/passports.js (по образцу, номер,
     дата, фото).
  2. Запустите из папки сайта (нужен установленный Node.js):

       node build-passports.js

  3. Скрипт создаст/обновит файл(ы) в папке SN/. Закоммитьте и
     запушьте их вместе с остальным сайтом.
  4. Для каждой НОВОЙ страницы вручную запросите индексацию —
     через Google Search Console ("Проверка URL" → "Запросить
     индексирование") и через Яндекс.Вебмастер ("Переобход страниц").
     Без этого шага страница может очень долго не появиться в поиске,
     так как на неё специально нет ссылок с сайта.

  Файлы внутри SN/ руками лучше не редактировать — при следующем
  запуске скрипта они будут полностью перезаписаны. Все правки
  вносите в data/passports.js.
*/

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const OUT_ROOT = path.join(ROOT, "SN");

// Страница лежит на 2 уровня глубже корня сайта: SN/<код>/<номер>.html —
// поэтому все ссылки на общие файлы и другие страницы идут через "../../"
const UP = "../../";

// ---------- 1. Загружаем паспорта из data/passports.js ----------
const passportsCode = fs.readFileSync(path.join(ROOT, "data/passports.js"), "utf8");
const sandbox = {};
vm.createContext(sandbox);
// PASSPORTS объявлен как `const`, поэтому явно прокидываем его в контекст
vm.runInContext(passportsCode + "\nthis.PASSPORTS = PASSPORTS;", sandbox);
const PASSPORTS = sandbox.PASSPORTS;

if (!Array.isArray(PASSPORTS) || !PASSPORTS.length) {
  console.error("Не удалось прочитать паспорта из data/passports.js — ничего не сгенерировано.");
  process.exit(1);
}

// ---------- 2. Заодно подтягиваем товары — чтобы получить название модели по modelId ----------
let PRODUCTS = [];
try {
  const productsCode = fs.readFileSync(path.join(ROOT, "js/products.js"), "utf8");
  const psandbox = {};
  vm.createContext(psandbox);
  vm.runInContext(productsCode + "\nthis.PRODUCTS = PRODUCTS;", psandbox);
  PRODUCTS = psandbox.PRODUCTS || [];
} catch (e) {
  console.warn("Не удалось прочитать js/products.js — ссылки на модель в каталоге работать не будут.");
}

// ---------- 3. Утилиты ----------
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escAttr(str) {
  return esc(str).replace(/\n/g, " ");
}

const RU_MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

// "2026-09-01" -> "1 сентября 2026 года"
function formatRuDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!m) return String(iso); // на случай если кто-то вписал дату по-старому, текстом
  const [, year, month, day] = m;
  const monthName = RU_MONTHS[parseInt(month, 10) - 1];
  if (!monthName) return String(iso);
  return `${parseInt(day, 10)} ${monthName} ${year} года`;
}

const AMBIGUOUS = /[O0Il1]/; // подсказка автору номеров, не блокирует генерацию

// ---------- 4. Шаблон страницы паспорта ----------
function buildPassportPage(entry) {
  const number = entry.number;
  const dateRu = formatRuDate(entry.date);
  const title = `Флюгер № ${number} — паспорт изделия | Деревянные флюгеры`;
  const description = `Флюгер № ${number}, дата изготовления: ${dateRu}. Фотографии на момент создания.`;

  const model = entry.modelId ? PRODUCTS.find((p) => p.id === entry.modelId) : null;

  const photosHtml = (entry.photos || [])
    .map(
      (src, i) => `        <a class="passport-photo js-passport-photo" href="${UP}${src}">
          <img src="${UP}${src}" alt="Флюгер № ${esc(number)}, фото ${i + 1}" loading="${i === 0 ? "eager" : "lazy"}" width="900" height="700">
        </a>`
    )
    .join("\n");

  const ctaHtml = model
    ? `    <div class="passport-cta">
      <p>Такая же модель — «${esc(model.name)}» — есть в нашем каталоге.</p>
      <a class="btn btn--primary" href="${UP}products/${esc(model.id)}.html">Посмотреть модель</a>
    </div>`
    : `    <div class="passport-cta">
      <p>Понравился этот флюгер? Посмотрите весь каталог моделей.</p>
      <a class="btn btn--primary" href="${UP}catalog.html">Перейти в каталог</a>
    </div>`;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${escAttr(description)}">
<link rel="canonical" href="${esc(number)}.html">
<meta property="og:title" content="${escAttr(`Флюгер № ${number}`)}">
<meta property="og:description" content="${escAttr(description)}">
<meta property="og:image" content="${UP}${esc((entry.photos || [])[0] || "images/logo/logo.svg")}">
<meta property="og:type" content="article">
<link rel="icon" href="${UP}images/logo/logo.webp" type="image/webp">
<link rel="stylesheet" href="${UP}css/style.css">
<link rel="stylesheet" href="${UP}css/responsive.css">
</head>
<body>

<header class="site-header">
  <div class="site-header__inner">
    <a class="brand" href="${UP}index.html">
      <img src="${UP}images/logo/logo.webp" alt="Flugerok" width="229" height="52" class="brand__logo">
    </a>
    <nav class="nav js-nav" aria-label="Основная навигация">
      <a href="${UP}index.html">Главная</a>
      <a href="${UP}catalog.html">Каталог</a>
      <a href="${UP}about.html">О нас</a>
      <a href="${UP}delivery.html">Доставка</a>
      <a href="${UP}contacts.html">Контакты</a>
    </nav>
    <div class="header-actions">
      <button type="button" class="btn btn--primary js-order-btn" data-product="">Заказать</button>
      <button type="button" class="menu-toggle js-menu-toggle" aria-label="Открыть меню" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>

<main>
  <div class="container passport-page">
    <p class="passport-eyebrow">Паспорт изделия</p>
    <h1 class="passport-number">№ ${esc(number)}</h1>
    <p class="passport-date">Дата изготовления: ${esc(dateRu)}
      <span class="js-days-ago" data-date="${esc(entry.date)}"></span>
    </p>

    <div class="passport-photos">
${photosHtml}
    </div>

${ctaHtml}
  </div>
</main>

<!-- Полноэкранный просмотр фото (с перелистыванием) -->
<div class="lightbox js-lightbox">
  <div class="lightbox__overlay js-lightbox-overlay"></div>
  <button type="button" class="lightbox__close js-lightbox-close" aria-label="Закрыть">×</button>
  <button type="button" class="lightbox__nav lightbox__nav--prev js-lightbox-prev" aria-label="Предыдущее фото">‹</button>
  <button type="button" class="lightbox__nav lightbox__nav--next js-lightbox-next" aria-label="Следующее фото">›</button>
  <div class="lightbox__content js-lightbox-content"></div>
</div>

<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <div class="footer-brand">
          <img src="${UP}images/logo/logo.webp" alt="Flugerok" width="167" height="38" class="footer-brand__logo">
        </div>
        <p>Деревянные флюгеры ручной работы для дома, сада и дачи.</p>
      </div>
      <div>
        <h4>Меню</h4>
        <ul>
          <li><a href="${UP}index.html">Главная</a></li>
          <li><a href="${UP}catalog.html">Каталог</a></li>
          <li><a href="${UP}about.html">О нас</a></li>
          <li><a href="${UP}delivery.html">Доставка</a></li>
          <li><a href="${UP}contacts.html">Контакты</a></li>
        </ul>
      </div>
      <div>
        <h4>Контакты</h4>
        <ul>
          <li><a data-contact="phone-link" href="tel:">Телефон: <span data-contact="phone"></span></a></li>
          <li><a data-contact="telegram-link" href="#" target="_blank" rel="noopener">Telegram: <span data-contact="telegram-name"></span></a></li>
          <li><a data-contact="email-link" href="#">Email: <span data-contact="email"></span></a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© <span class="js-year">2026</span> <span data-contact="site-name">Деревянные флюгеры</span></span>
      <span>Ручная работа из дерева</span>
    </div>
    <p class="footer-note">Сайт носит информационный характер. Актуальную стоимость и наличие уточняйте перед заказом.</p>
  </div>
</footer>

<div class="order-modal js-order-modal">
  <div class="order-modal__overlay js-order-overlay"></div>
  <div class="order-modal__panel" role="dialog" aria-modal="true" aria-labelledby="order-modal-title">
    <button type="button" class="order-modal__close js-order-close" aria-label="Закрыть">×</button>
    <h3 id="order-modal-title" class="order-modal__title">Оформить заказ</h3>
    <p class="order-modal__subtitle">Оставьте контакты — мы свяжемся с вами для уточнения деталей.</p>

    <form class="js-order-form" autocomplete="off">
      <input type="hidden" name="product">
      <div class="field">
        <label for="order-name">Имя</label>
        <input id="order-name" name="name" type="text" required placeholder="Как к вам обращаться">
      </div>
      <div class="field">
        <label for="order-phone">Телефон</label>
        <input id="order-phone" name="phone" type="tel" required placeholder="+375 (__) ___-__-__">
      </div>
      <div class="field">
        <label for="order-qty">Количество</label>
        <input id="order-qty" name="quantity" type="number" min="1" value="1">
      </div>
      <div class="field">
        <label for="order-comment">Комментарий</label>
        <textarea id="order-comment" name="comment" placeholder="Модель, цвет, пожелания по срокам"></textarea>
      </div>
      <button type="submit" class="btn btn--primary btn--block">Отправить заказ</button>
    </form>

    <div class="order-feedback js-order-success" hidden>
      <div class="order-feedback__icon" aria-hidden="true">✓</div>
      <h3>Заявка отправлена</h3>
      <p>Спасибо! Мы свяжемся с вами в ближайшее время.</p>
    </div>

    <div class="order-feedback js-order-fallback" hidden>
      <h3>Свяжитесь с нами напрямую</h3>
      <p>Оформление через сайт временно недоступно — но вы можете написать нам одним из способов ниже.</p>
    </div>

    <div class="order-alt">
      <p>Или свяжитесь с нами напрямую:</p>
      <div class="order-alt__actions">
        <a class="btn btn--secondary btn--sm" data-contact="telegram-link" href="#" target="_blank" rel="noopener">Написать в Telegram</a>
        <a class="btn btn--ghost btn--sm" data-contact="phone-link" href="tel:">Позвонить</a>
        <a class="btn btn--ghost btn--sm" data-contact="email-link" href="#">Написать на Email</a>
      </div>
    </div>
  </div>
</div>

<script src="${UP}js/config.js"></script>
<script src="${UP}js/main.js"></script>
<script src="${UP}js/passport.js"></script>
</body>
</html>
`;
}

// ---------- 5. Генерация файлов ----------
if (!fs.existsSync(OUT_ROOT)) fs.mkdirSync(OUT_ROOT);

const seen = new Set();
let count = 0;
for (const entry of PASSPORTS) {
  if (!entry.number || entry.number.length !== 10) {
    console.warn(`⚠ Пропущен паспорт с некорректным номером: ${JSON.stringify(entry.number)} (должно быть 10 символов).`);
    continue;
  }
  if (seen.has(entry.number)) {
    console.warn(`⚠ Номер ${entry.number} встречается в data/passports.js больше одного раза — проверьте данные.`);
  }
  seen.add(entry.number);
  if (AMBIGUOUS.test(entry.number)) {
    console.warn(`⚠ Номер ${entry.number} содержит символы, которые легко перепутать при вводе (O/0, I/l/1) — просто имейте в виду.`);
  }

  const modelCode = entry.number.slice(0, 3);
  const subDir = path.join(OUT_ROOT, modelCode);
  if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });

  const html = buildPassportPage(entry);
  const outPath = path.join(subDir, `${entry.number}.html`);
  fs.writeFileSync(outPath, html, "utf8");
  console.log(`✓ SN/${modelCode}/${entry.number}.html`);
  count++;
}

console.log(`\nГотово: ${count} страниц-паспортов создано/обновлено в папке SN/ (по подпапкам моделей).`);
console.log("Напоминание: эти страницы НЕ входят в sitemap.xml специально.");
console.log("Для каждой новой страницы запросите индексацию вручную через");
console.log("Google Search Console и Яндекс.Вебмастер (см. комментарий в начале файла).");
