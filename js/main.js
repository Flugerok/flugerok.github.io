/*
  main.js
  -------
  Общий код, подключённый на всех страницах:
  - мобильное меню (гамбургер)
  - подстановка контактов из config.js
  - отрисовка карточек товаров (используется на главной и в каталоге)
  - модальное окно "Заказать"
  - функция submitOrder() — отправка заказа
  - аккордеон FAQ
  - текущий год в футере
*/

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  applyContacts();
  initOrderModal();
  initFaqAccordion();
  setFooterYear();
  renderPopularProducts();
});

/* ---------- Мобильное меню ---------- */
function initMobileMenu() {
  const toggle = document.querySelector(".js-menu-toggle");
  const nav = document.querySelector(".js-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    document.body.classList.toggle("no-scroll", isOpen);
  });

  // закрывать меню при клике на пункт меню (на мобильном)
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("no-scroll");
    });
  });
}

/* ---------- Контакты из config.js ---------- */
function applyContacts() {
  document.querySelectorAll("[data-contact='phone']").forEach((el) => {
    el.textContent = SITE_CONFIG.phone;
  });
  document.querySelectorAll("[data-contact='phone-link']").forEach((el) => {
    el.setAttribute("href", SITE_CONFIG.phoneLink);
  });
  document.querySelectorAll("[data-contact='telegram-link']").forEach((el) => {
    el.setAttribute("href", SITE_CONFIG.telegram);
  });
  document.querySelectorAll("[data-contact='telegram-name']").forEach((el) => {
    el.textContent = SITE_CONFIG.telegramName;
  });
  document.querySelectorAll("[data-contact='email']").forEach((el) => {
    el.textContent = SITE_CONFIG.email;
  });
  document.querySelectorAll("[data-contact='email-link']").forEach((el) => {
    el.setAttribute("href", "mailto:" + SITE_CONFIG.email);
  });
  document.querySelectorAll("[data-contact='address']").forEach((el) => {
    el.textContent = SITE_CONFIG.address;
  });
  document.querySelectorAll("[data-contact='hours']").forEach((el) => {
    el.textContent = SITE_CONFIG.workHours;
  });
  document.querySelectorAll("[data-contact='site-name']").forEach((el) => {
    el.textContent = SITE_CONFIG.siteName;
  });
}

function setFooterYear() {
  const el = document.querySelector(".js-year");
  if (el) el.textContent = new Date().getFullYear();
}

/* ---------- Карточки товаров ---------- */

// Формирует подпись цены, например "от 45 BYN"
function formatPrice(product) {
  const note = product.priceNote ? product.priceNote + " " : "";
  return `${note}${product.price} BYN`;
}

function categoryLabel(category) {
  return category === "vertushka" ? "Вертушка" : "Флюгер";
}

// Создаёт DOM-узел карточки товара. Используется и на главной, и в каталоге.
function createProductCard(product) {
  const article = document.createElement("article");
  article.className = "product-card";
  article.dataset.category = product.category;
  article.dataset.size = product.size;
  article.dataset.popular = product.popular ? "1" : "0";
  article.dataset.price = product.price;
  article.dataset.popularity = product.popularity;
  article.dataset.name = product.name;

  article.innerHTML = `
    <a class="product-card__media" href="product.html?id=${encodeURIComponent(product.id)}">
      <img src="${product.images[0]}" alt="${product.name}" width="600" height="600" loading="lazy">
      <span class="product-card__tag">${categoryLabel(product.category)}</span>
    </a>
    <div class="product-card__body">
      <h3 class="product-card__title">
        <a href="product.html?id=${encodeURIComponent(product.id)}">${product.shortName}</a>
      </h3>
      <p class="product-card__desc">${product.shortDescription}</p>
      <div class="product-card__footer">
        <span class="product-card__price">${formatPrice(product)}</span>
        <div class="product-card__actions">
          <a class="btn btn--ghost btn--sm" href="product.html?id=${encodeURIComponent(product.id)}">Подробнее</a>
          <button type="button" class="btn btn--primary btn--sm js-order-btn" data-product="${product.name}">Заказать</button>
        </div>
      </div>
    </div>
  `;
  return article;
}

// На главной странице показываем популярные товары (если есть контейнер)
function renderPopularProducts() {
  const container = document.querySelector(".js-popular-products");
  if (!container || typeof PRODUCTS === "undefined") return;

  const popular = PRODUCTS.filter((p) => p.popular)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 6);

  popular.forEach((product) => {
    container.appendChild(createProductCard(product));
  });
}

/* ---------- Модальное окно заказа ---------- */
function initOrderModal() {
  const modal = document.querySelector(".js-order-modal");
  if (!modal) return;

  const closeBtn = modal.querySelector(".js-order-close");
  const overlay = modal.querySelector(".js-order-overlay");
  const form = modal.querySelector(".js-order-form");
  const productField = modal.querySelector("[name='product']");
  const successEl = modal.querySelector(".js-order-success");
  const fallbackEl = modal.querySelector(".js-order-fallback");

  function openModal(productName) {
    modal.classList.add("is-open");
    document.body.classList.add("no-scroll");
    if (form) {
      form.hidden = false;
      form.reset();
    }
    if (successEl) successEl.hidden = true;
    if (fallbackEl) fallbackEl.hidden = true;
    if (productField) {
      productField.value = productName || "Без указания модели";
    }
    const nameInput = modal.querySelector("[name='name']");
    if (nameInput) nameInput.focus();
  }

  function closeModal() {
    modal.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
  }

  // Открытие модалки по любой кнопке с классом js-order-btn на странице
  document.addEventListener("click", (event) => {
    const btn = event.target.closest(".js-order-btn");
    if (!btn) return;
    openModal(btn.dataset.product || "");
  });

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (overlay) overlay.addEventListener("click", closeModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitOrder(form, { successEl, fallbackEl });
    });
  }
}

/*
  submitOrder()
  -------------
  Отправляет данные формы заказа.

  Сайт статический (без backend), поэтому реальная отправка возможна
  только через внешний сервис приёма форм (например, Formspree).

  Как включить реальную отправку:
  1. Укажите адрес вашей формы в js/config.js -> orderFormEndpoint
     (см. подробную инструкцию в комментариях этого файла).
  2. После этого функция ниже сама начнёт отправлять данные методом
     fetch() на указанный адрес — ничего больше менять не нужно.

  Пока orderFormEndpoint пустой, форма не отправляется в никуда:
  вместо этого посетителю показывается способ связаться напрямую
  (телефон и Telegram), чтобы заказ не потерялся.
*/
function submitOrder(form, elements) {
  const { successEl, fallbackEl } = elements || {};
  const submitBtn = form.querySelector("[type='submit']");
  const endpoint = (typeof SITE_CONFIG !== "undefined" && SITE_CONFIG.orderFormEndpoint) || "";

  const formData = new FormData(form);

  // Если внешний сервис приёма форм ещё не подключён —
  // показываем запасной вариант связи вместо отправки "в никуда".
  if (!endpoint) {
    form.hidden = true;
    if (fallbackEl) fallbackEl.hidden = false;
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Отправляем...";
  }

  fetch(endpoint, {
    method: "POST",
    body: formData,
    headers: { Accept: "application/json" },
  })
    .then((response) => {
      if (!response.ok) throw new Error("Request failed");
      form.hidden = true;
      if (successEl) successEl.hidden = false;
    })
    .catch(() => {
      form.hidden = true;
      if (fallbackEl) fallbackEl.hidden = false;
    })
    .finally(() => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Отправить заказ";
      }
    });
}

/* ---------- FAQ аккордеон ---------- */
function initFaqAccordion() {
  const items = document.querySelectorAll(".js-faq-item");
  items.forEach((item) => {
    const question = item.querySelector(".js-faq-question");
    if (!question) return;
    question.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      items.forEach((other) => other.classList.remove("is-open"));
      if (!isOpen) item.classList.add("is-open");
    });
  });
}
