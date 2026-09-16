/*
  product.js
  ----------
  Отвечает за страницу отдельного товара.

  Работает в двух режимах — специально, чтобы ничего не ломалось,
  даже если вы забыли пересобрать статические страницы после
  добавления нового товара:

  1. products/<id>.html — "чистый" адрес товара (например
     products/petuh.html). Это основной, рекомендуемый вариант: такие
     файлы генерируются скриптом build-products.js (см. README, раздел
     про SEO) и уже содержат готовые <title>/description/Open Graph —
     то есть корректно выглядят в Google и в превью Telegram/WhatsApp.
     На такой странице id товара берётся из атрибута data-product-id.

  2. product.html?id=... — старый вариант с одним общим файлом и
     параметром в адресе. Продолжает работать как раньше и служит
     подстраховкой: например, если вы добавили новый товар в
     products.js, но ещё не запускали build-products.js — на такую
     страницу можно временно дать ссылку через product.html?id=,
     работать она будет, просто без заранее подготовленных мета-тегов.

  Общая логика:
  - находит товар в products.js по id;
  - строит галерею с миниатюрами (фото + видео), стрелками и
    полноэкранным просмотром;
  - выводит описание, характеристики и хлебные крошки;
  - добавляет/обновляет Schema.org разметку товара (Product);
  - настраивает кнопку "Заказать" с указанием названия товара.
*/

// Префикс пути к общим файлам (css/js/images) и другим страницам сайта.
// Пустая строка для product.html в корне, "../" — для products/<id>.html.
let BASE_PATH = "";
function withBase(relativePath) {
  return BASE_PATH + relativePath;
}

document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector(".js-product-page");
  if (!root || typeof PRODUCTS === "undefined") return;

  BASE_PATH = window.location.pathname.includes("/products/") ? "../" : "";

  const id = root.dataset.productId || new URLSearchParams(window.location.search).get("id");
  const product = PRODUCTS.find((p) => p.id === id);

  if (!product) {
    renderNotFound(root);
    return;
  }

  document.title = `${product.name} — купить | ${SITE_CONFIG.siteName}`;
  setMeta("description", product.shortDescription);
  setMeta("og:title", product.name, true);
  setMeta("og:description", product.shortDescription, true);
  setMeta("og:image", absoluteUrl(withBase(product.images[0])), true);
  setMeta("og:type", "product", true);

  renderBreadcrumbs(root, product);
  renderGallery(root, product);
  renderInfo(root, product);
  renderCharacteristics(root, product);
  renderSchema(product);
  wireOrderButtons(root, product);
});

function setMeta(name, content, isProperty) {
  const attr = isProperty ? "property" : "name";
  let tag = document.querySelector(`meta[${attr}="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function absoluteUrl(path) {
  return new URL(path, window.location.href).toString();
}

function renderNotFound(root) {
  root.innerHTML = `
    <div class="product-missing">
      <h1>Товар не найден</h1>
      <p>Возможно, ссылка устарела или товар был снят с продажи.</p>
      <a class="btn btn--primary" href="${withBase("catalog.html")}">Перейти в каталог</a>
    </div>
  `;
}

function renderBreadcrumbs(root, product) {
  const el = root.querySelector(".js-breadcrumbs");
  if (!el) return;
  el.innerHTML = `
    <a href="${withBase("index.html")}">Главная</a>
    <span aria-hidden="true">→</span>
    <a href="${withBase("catalog.html")}">Каталог</a>
    <span aria-hidden="true">→</span>
    <span aria-current="page">${product.shortName}</span>
  `;
}

/* ---------- Галерея (фото + видео в одной карусели) ----------

   Миниатюры под главным изображением содержат и фотографии, и (если
   у товара указано поле youtube) видео YouTube последней миниатюрой.
   Клик по миниатюре с фото открывает её в основной области, клик по
   миниатюре с видео — включает проигрыватель прямо в основной области.
   Стрелками и свайпом можно листать все миниатюры по кругу, включая видео.
*/
function buildMediaList(product) {
  const media = (product.images || []).map((src, i) => ({
    type: "image",
    src: withBase(src),
    alt: `${product.name}, фото ${i + 1}`,
  }));
  if (product.youtube) {
    media.push({
      type: "video",
      youtubeId: product.youtube,
      thumb: `https://img.youtube.com/vi/${product.youtube}/hqdefault.jpg`,
      alt: `${product.name} — видео`,
    });
  }
  return media;
}

function renderGallery(root, product) {
  const mainWrap = root.querySelector(".js-gallery-main");
  const thumbsWrap = root.querySelector(".js-gallery-thumbs");
  const prevBtn = root.querySelector(".js-gallery-prev");
  const nextBtn = root.querySelector(".js-gallery-next");
  const openBtn = root.querySelector(".js-gallery-expand");
  const lightbox = document.querySelector(".js-lightbox");
  const lightboxContent = lightbox ? lightbox.querySelector(".js-lightbox-content") : null;
  const closeBtn = lightbox ? lightbox.querySelector(".js-lightbox-close") : null;
  const overlay = lightbox ? lightbox.querySelector(".js-lightbox-overlay") : null;
  const lightboxPrev = lightbox ? lightbox.querySelector(".js-lightbox-prev") : null;
  const lightboxNext = lightbox ? lightbox.querySelector(".js-lightbox-next") : null;

  if (!mainWrap) return;

  const media = buildMediaList(product);
  let current = 0;

  function renderMainSlot(item) {
    if (item.type === "video") {
      // youtube-nocookie снижает число сторонних запросов до клика "play"
      return `<iframe
        src="https://www.youtube-nocookie.com/embed/${item.youtubeId}"
        title="${item.alt}"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen></iframe>`;
    }
    return `<img src="${item.src}" alt="${item.alt}" width="800" height="800" ${current === 0 ? "" : 'loading="lazy"'}>`;
  }

  function show(index) {
    current = (index + media.length) % media.length;
    const item = media[current];

    mainWrap.querySelectorAll(".gallery-main__slot").forEach((n) => n.remove());
    const slot = document.createElement("div");
    slot.className = "gallery-main__slot";
    slot.innerHTML = renderMainSlot(item);
    mainWrap.prepend(slot);
    mainWrap.classList.toggle("gallery-main--video", item.type === "video");

    thumbsWrap.querySelectorAll(".gallery-thumb").forEach((thumb, i) => {
      thumb.classList.toggle("is-active", i === current);
    });
  }

  thumbsWrap.innerHTML = "";
  if (media.length > 1) {
    media.forEach((item, i) => {
      const thumb = document.createElement("button");
      thumb.type = "button";
      thumb.className = "gallery-thumb" + (item.type === "video" ? " gallery-thumb--video" : "");
      const thumbSrc = item.type === "video" ? item.thumb : item.src;
      thumb.innerHTML = `<img src="${thumbSrc}" alt="${item.alt}" loading="lazy" width="140" height="140">`;
      thumb.addEventListener("click", () => show(i));
      thumbsWrap.appendChild(thumb);
    });
  } else {
    thumbsWrap.hidden = true;
  }

  if (media.length <= 1) {
    if (prevBtn) prevBtn.hidden = true;
    if (nextBtn) nextBtn.hidden = true;
  } else {
    if (prevBtn) prevBtn.addEventListener("click", () => show(current - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => show(current + 1));
  }

  show(0);

  // ---- Полноэкранный просмотр (фото и видео — общая лента, как в миниатюрах) ----
  function renderLightboxSlot(item) {
    if (item.type === "video") {
      return `<iframe
        src="https://www.youtube-nocookie.com/embed/${item.youtubeId}"
        title="${item.alt}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen></iframe>`;
    }
    return `<img src="${item.src}" alt="${item.alt}">`;
  }

  function openLightbox() {
    if (!lightbox || !lightboxContent) return;
    lightboxContent.innerHTML = renderLightboxSlot(media[current]);
    lightbox.classList.add("is-open");
    document.body.classList.add("no-scroll");
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
    if (lightboxContent) lightboxContent.innerHTML = ""; // останавливает видео при закрытии
  }
  function updateLightboxContent() {
    if (!lightbox || !lightbox.classList.contains("is-open") || !lightboxContent) return;
    lightboxContent.innerHTML = renderLightboxSlot(media[current]);
  }
  function stepLightbox(direction) {
    show(current + direction);
    updateLightboxContent();
  }

  if (media.length <= 1) {
    if (lightboxPrev) lightboxPrev.hidden = true;
    if (lightboxNext) lightboxNext.hidden = true;
  } else {
    if (lightboxPrev) lightboxPrev.addEventListener("click", () => stepLightbox(-1));
    if (lightboxNext) lightboxNext.addEventListener("click", () => stepLightbox(1));
  }

  if (openBtn) openBtn.addEventListener("click", openLightbox);
  if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
  if (overlay) overlay.addEventListener("click", closeLightbox);
  document.addEventListener("keydown", (e) => {
    if (!lightbox || !lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") stepLightbox(1);
    if (e.key === "ArrowLeft") stepLightbox(-1);
  });

  // ---- Свайп влево/вправо на телефоне ----
  function attachSwipe(el, inLightbox) {
    if (!el) return;
    let touchStartX = null;
    el.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) {
        const direction = dx < 0 ? 1 : -1;
        if (inLightbox) stepLightbox(direction);
        else show(current + direction);
      }
      touchStartX = null;
    }, { passive: true });
  }
  attachSwipe(mainWrap, false);
  attachSwipe(lightbox, true);
}

/* ---------- Инфо о товаре ---------- */
function renderInfo(root, product) {
  const titleEl = root.querySelector(".js-product-title");
  const priceEl = root.querySelector(".js-product-price");
  const descEl = root.querySelector(".js-product-description");
  const tagEl = root.querySelector(".js-product-tag");

  if (titleEl) titleEl.textContent = product.name;
  if (priceEl) priceEl.textContent = formatPrice(product);
  if (descEl) descEl.textContent = product.description;
  if (tagEl) tagEl.textContent = categoryLabel(product.category);
}

function renderCharacteristics(root, product) {
  const body = root.querySelector(".js-characteristics-body");
  if (!body) return;
  body.innerHTML = "";
  Object.entries(product.characteristics || {}).forEach(([key, value]) => {
    const row = document.createElement("tr");
    row.innerHTML = `<th scope="row">${key}</th><td>${value}</td>`;
    body.appendChild(row);
  });
}

/* ---------- Schema.org ----------
   Если страница уже сгенерирована build-products.js, в <head> есть
   тег <script id="js-product-schema">, подготовленный заранее —
   обновляем его на месте вместо того, чтобы добавлять второй,
   дублирующий. Если тега нет (например, на старом product.html?id=)
   — создаём его сами, как и раньше. */
function renderSchema(product) {
  const data = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((src) => absoluteUrl(withBase(src))),
    offers: {
      "@type": "Offer",
      priceCurrency: "BYN",
      price: product.price,
      availability: "https://schema.org/InStock",
      url: window.location.href,
    },
  };
  let script = document.getElementById("js-product-schema");
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "js-product-schema";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

/* ---------- Кнопки заказа на странице товара ---------- */
function wireOrderButtons(root, product) {
  root.querySelectorAll(".js-order-btn").forEach((btn) => {
    btn.dataset.product = product.name;
  });
}
