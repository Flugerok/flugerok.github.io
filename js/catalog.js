/*
  catalog.js
  ----------
  Отвечает только за страницу catalog.html:
  - отрисовывает все товары из products.js;
  - фильтр: "Все" / "Популярные" (по полю popular в products.js);
  - сортировка: по дате добавления (новые/старые сначала) и по цене;
  - всё происходит без перезагрузки страницы.

  Дата добавления берётся из поля added у каждого товара в
  js/products.js (формат ГГГГ-ММ-ДД). Если у товара поля нет — он
  считается самым старым при сортировке по дате.
*/

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector(".js-catalog-grid");
  if (!grid || typeof PRODUCTS === "undefined") return;

  const filterButtons = document.querySelectorAll(".js-filter-btn");
  const sortSelect = document.querySelector(".js-sort-select");
  const emptyState = document.querySelector(".js-catalog-empty");
  const countEl = document.querySelector(".js-catalog-count");

  let currentFilter = "all";
  let currentSort = sortSelect ? sortSelect.value : "date-desc";

  function matchesFilter(product, filter) {
    if (filter === "popular") return product.popular === true;
    return true;
  }

  function addedTime(product) {
    const t = Date.parse(product.added);
    return isNaN(t) ? 0 : t;
  }

  function sortProducts(list, sort) {
    const sorted = list.slice();
    switch (sort) {
      case "date-asc":
        sorted.sort((a, b) => addedTime(a) - addedTime(b));
        break;
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "date-desc":
      default:
        sorted.sort((a, b) => addedTime(b) - addedTime(a));
        break;
    }
    return sorted;
  }

  function render() {
    const filtered = PRODUCTS.filter((p) => matchesFilter(p, currentFilter));
    const sorted = sortProducts(filtered, currentSort);

    grid.innerHTML = "";
    sorted.forEach((product) => grid.appendChild(createProductCard(product)));

    if (countEl) {
      countEl.textContent = `${sorted.length} ${pluralizeItems(sorted.length)}`;
    }
    if (emptyState) {
      emptyState.hidden = sorted.length !== 0;
    }
  }

  function pluralizeItems(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "товар";
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "товара";
    return "товаров";
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      currentFilter = btn.dataset.filter || "all";
      render();
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      currentSort = sortSelect.value;
      render();
    });
  }

  render();
});
