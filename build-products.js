#!/usr/bin/env node
/*
  build-products.js
  ------------------
  Генерирует отдельную статическую HTML-страницу для каждого товара:
  products/<id>.html (например products/petuh.html).

  Зачем это нужно
  ----------------
  Раньше все товары показывались через один файл product.html?id=...,
  а заголовок/описание для конкретного товара подставлялись уже
  в браузере через JavaScript. Поисковики (Google) в целом умеют такие
  страницы индексировать, но мессенджеры (Telegram, WhatsApp, VK) при
  показе превью ссылки JavaScript НЕ выполняют — они читают только
  "сырой" HTML. Из-за этого превью ссылки на товар в Telegram выглядело
  одинаково для всех товаров.

  Этот скрипт решает обе проблемы: для каждого товара создаётся
  отдельный файл с уже готовыми (не через JS) <title>, description,
  Open Graph и Schema.org — и у каждого товара появляется свой
  "красивый" адрes вида products/petuh.html вместо product.html?id=petuh.

  Как использовать
  ------------------
  1. Отредактируйте товары как обычно — в js/products.js (добавить
     товар, поменять фото, вставить YouTube-ID и т.д. — см. README).
  2. Запустите из папки сайта (нужен установленный Node.js,
     https://nodejs.org — на Windows и Mac ставится один раз):

       node build-products.js

  3. Скрипт создаст/обновит файлы в папке products/. Их нужно
     закоммитить и запушить в GitHub вместе с остальным сайтом
     (как и любые другие изменённые файлы).

  Ничего внутри самого products/*.html руками лучше не редактировать —
  при следующем запуске скрипта файл будет полностью перезаписан.
  Все правки вносите в js/products.js, затем просто перезапускайте
  build-products.js.
*/

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, "products");

// ---------- 1. Читаем товары из единственного источника правды: js/products.js ----------
const productsCode = fs.readFileSync(path.join(ROOT, "js/products.js"), "utf8");
const sandbox = {};
vm.createContext(sandbox);
// products.js объявляет `const PRODUCTS = [...]`; const/let не попадают
// в объект контекста автоматически, поэтому явно прокидываем значение.
vm.runInContext(productsCode + "\nthis.PRODUCTS = PRODUCTS;", sandbox);
const PRODUCTS = sandbox.PRODUCTS;

if (!Array.isArray(PRODUCTS) || !PRODUCTS.length) {
  console.error("Не удалось прочитать товары из js/products.js — ничего не сгенерировано.");
  process.exit(1);
}

// ---------- 2. Утилиты ----------
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
function formatPrice(p) {
  const note = p.priceNote ? p.priceNote + " " : "";
  return `${note}${p.price} BYN`;
}
function categoryLabel(c) {
  return c === "vertushka" ? "Вертушка" : "Флюгер";
}

// ---------- 3. Шаблон одной страницы товара ----------
function buildProductPage(product) {
  const title = `${product.name} — купить | Деревянные флюгеры`;
  const description = product.shortDescription;
  const ogImage = `../${product.images[0]}`;
  const canonical = `${product.id}.html`; // относительный self-canonical, ../products/ не нужен — уже в этой папке

  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((src) => `../${src}`),
    offers: {
      "@type": "Offer",
      priceCurrency: "BYN",
      price: product.price,
      availability: "https://schema.org/InStock",
    },
  };

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${escAttr(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${escAttr(product.name)}">
<meta property="og:description" content="${escAttr(description)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:type" content="product">
<link rel="icon" href="../images/logo/logo.svg" type="image/svg+xml">
<link rel="stylesheet" href="../css/style.css">
<link rel="stylesheet" href="../css/responsive.css">
<script type="application/ld+json" id="js-product-schema">${JSON.stringify(schema)}</script>
</head>
<body>

<header class="site-header">
  <div class="site-header__inner">
    <a class="brand" href="../index.html">
      <img src="../images/logo/logo.svg" alt="" width="40" height="40">
      <span class="brand__name" data-contact="site-name">Деревянные флюгеры</span>
    </a>
    <nav class="nav js-nav" aria-label="Основная навигация">
      <a href="../index.html">Главная</a>
      <a href="../catalog.html" aria-current="page">Каталог</a>
      <a href="../about.html">О нас</a>
      <a href="../delivery.html">Доставка</a>
      <a href="../contacts.html">Контакты</a>
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

<div class="container js-product-page" data-product-id="${escAttr(product.id)}">
  <nav class="breadcrumbs js-breadcrumbs" aria-label="Хлебные крошки">
    <a href="../index.html">Главная</a>
    <span aria-hidden="true">→</span>
    <a href="../catalog.html">Каталог</a>
    <span aria-hidden="true">→</span>
    <span aria-current="page">${esc(product.shortName)}</span>
  </nav>

  <div class="product-layout">
    <div class="product-gallery">
      <div class="gallery-main js-gallery-main">
        <button type="button" class="gallery-nav gallery-nav--prev js-gallery-prev" aria-label="Предыдущее фото">‹</button>
        <button type="button" class="gallery-nav gallery-nav--next js-gallery-next" aria-label="Следующее фото">›</button>
        <button type="button" class="gallery-expand js-gallery-expand">Во весь экран</button>
      </div>
      <div class="gallery-thumbs js-gallery-thumbs"></div>
    </div>

    <div class="product-info">
      <span class="product-info__tag js-product-tag">${esc(categoryLabel(product.category))}</span>
      <h1 class="js-product-title">${esc(product.name)}</h1>
      <span class="product-info__price js-product-price">${esc(formatPrice(product))}</span>
      <p class="js-product-description">${esc(product.description)}</p>

      <div class="product-info__actions">
        <button type="button" class="btn btn--primary js-order-btn" data-product="${escAttr(product.name)}">Заказать</button>
        <a class="btn btn--ghost" data-contact="telegram-link" href="#" target="_blank" rel="noopener">Написать в Telegram</a>
      </div>

      <h2>Характеристики</h2>
      <table class="characteristics-table">
        <tbody class="js-characteristics-body">
${Object.entries(product.characteristics || {}).map(([k, v]) => `          <tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("\n")}
        </tbody>
      </table>
    </div>
  </div>

  <div class="back-to-catalog">
    <a class="btn btn--ghost" href="../catalog.html">← Вернуться в каталог</a>
  </div>
</div>

<!-- Полноэкранный просмотр галереи (фото и видео) -->
<div class="lightbox js-lightbox">
  <div class="lightbox__overlay js-lightbox-overlay"></div>
  <button type="button" class="lightbox__close js-lightbox-close" aria-label="Закрыть">×</button>
  <button type="button" class="lightbox__nav lightbox__nav--prev js-lightbox-prev" aria-label="Предыдущее фото">‹</button>
  <button type="button" class="lightbox__nav lightbox__nav--next js-lightbox-next" aria-label="Следующее фото">›</button>
  <div class="lightbox__content js-lightbox-content"></div>
</div>

</main>

<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <div class="footer-brand">
          <img src="../images/logo/logo.svg" alt="" width="36" height="36">
          <span class="footer-brand__name" data-contact="site-name">Деревянные флюгеры</span>
        </div>
        <p>Деревянные флюгеры ручной работы для дома, сада и дачи.</p>
      </div>
      <div>
        <h4>Меню</h4>
        <ul>
          <li><a href="../index.html">Главная</a></li>
          <li><a href="../catalog.html">Каталог</a></li>
          <li><a href="../about.html">О нас</a></li>
          <li><a href="../delivery.html">Доставка</a></li>
          <li><a href="../contacts.html">Контакты</a></li>
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

<script src="../js/config.js"></script>
<script src="../js/products.js"></script>
<script src="../js/main.js"></script>
<script src="../js/product.js"></script>
</body>
</html>
`;
}

// ---------- 4. Генерация файлов ----------
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

let count = 0;
for (const product of PRODUCTS) {
  const html = buildProductPage(product);
  const outPath = path.join(OUT_DIR, `${product.id}.html`);
  fs.writeFileSync(outPath, html, "utf8");
  console.log("✓ products/" + product.id + ".html");
  count++;
}

console.log(`\nГотово: ${count} страниц товаров создано/обновлено в папке products/.`);
console.log("Не забудьте закоммитить и запушить папку products/ вместе с остальными файлами.");
