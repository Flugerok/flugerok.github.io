/*
  product.js
  ----------
  Отвечает за страницу отдельного товара product.html?id=...

  Что делает:
  - находит товар в products.js по параметру id из адресной строки;
  - строит галерею с миниатюрами, стрелками и полноэкранным просмотром;
  - показывает видео с YouTube, если оно указано у товара;
  - выводит описание, характеристики и хлебные крошки;
  - добавляет Schema.org разметку товара (Product) для поисковиков;
  - настраивает кнопку "Заказать" с указанием названия товара.
*/

document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector(".js-product-page");
  if (!root || typeof PRODUCTS === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const product = PRODUCTS.find((p) => p.id === id);

  if (!product) {
    renderNotFound(root);
    return;
  }

  document.title = `${product.name} — купить | ${SITE_CONFIG.siteName}`;
  setMeta("description", product.shortDescription);
  setMeta("og:title", product.name, true);
  setMeta("og:description", product.shortDescription, true);
  setMeta("og:image", absoluteUrl(product.images[0]), true);
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
      <a class="btn btn--primary" href="catalog.html">Перейти в каталог</a>
    </div>
  `;
}

function renderBreadcrumbs(root, product) {
  const el = root.querySelector(".js-breadcrumbs");
  if (!el) return;
  el.innerHTML = `
    <a href="index.html">Главная</a>
    <span aria-hidden="true">→</span>
    <a href="catalog.html">Каталог</a>
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
    src,
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

    if (openBtn) openBtn.hidden = item.type === "video";

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

  // ---- Полноэкранный просмотр (только для фото) ----
  function openLightbox() {
    if (!lightbox || !lightboxContent) return;
    const item = media[current];
    if (item.type === "video") return; // у видео есть свой fullscreen у плеера
    lightboxContent.innerHTML = `<img src="${item.src}" alt="${item.alt}">`;
    lightbox.classList.add("is-open");
    document.body.classList.add("no-scroll");
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
  }
  function updateLightboxImage() {
    if (!lightbox || !lightbox.classList.contains("is-open") || !lightboxContent) return;
    const item = media[current];
    if (item.type === "video") { closeLightbox(); return; }
    const img = lightboxContent.querySelector("img");
    if (img) { img.src = item.src; img.alt = item.alt; }
  }

  if (openBtn) openBtn.addEventListener("click", openLightbox);
  if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
  if (overlay) overlay.addEventListener("click", closeLightbox);
  document.addEventListener("keydown", (e) => {
    if (!lightbox || !lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") { show(current + 1); updateLightboxImage(); }
    if (e.key === "ArrowLeft") { show(current - 1); updateLightboxImage(); }
  });

  // ---- Свайп влево/вправо на телефоне ----
  [mainWrap, lightbox].forEach((el) => {
    if (!el) return;
    let touchStartX = null;
    el.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) {
        show(current + (dx < 0 ? 1 : -1));
        updateLightboxImage();
      }
      touchStartX = null;
    }, { passive: true });
  });
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

/* ---------- Schema.org ---------- */
function renderSchema(product) {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map(absoluteUrl),
    offers: {
      "@type": "Offer",
      priceCurrency: "BYN",
      price: product.price,
      availability: "https://schema.org/InStock",
      url: window.location.href,
    },
  });
  document.head.appendChild(script);
}

/* ---------- Кнопки заказа на странице товара ---------- */
function wireOrderButtons(root, product) {
  root.querySelectorAll(".js-order-btn").forEach((btn) => {
    btn.dataset.product = product.name;
  });
}
