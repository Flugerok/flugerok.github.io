/*
  catalog.js
  ----------
  Отвечает только за страницу catalog.html:
  - отрисовывает все товары из products.js;
  - фильтрует их по кнопкам (Все / Флюгеры / Вертушки / Большие / Маленькие / Популярные);
  - сортирует по выбору в выпадающем списке;
  - всё происходит без перезагрузки страницы.
*/

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector(".js-catalog-grid");
  if (!grid || typeof PRODUCTS === "undefined") return;

  const filterButtons = document.querySelectorAll(".js-filter-btn");
  const sortSelect = document.querySelector(".js-sort-select");
  const emptyState = document.querySelector(".js-catalog-empty");
  const countEl = document.querySelector(".js-catalog-count");

  let currentFilter = "all";
  let currentSort = "popularity";

  function matchesFilter(product, filter) {
    switch (filter) {
      case "flyuger":
        return product.category === "flyuger";
      case "vertushka":
        return product.category === "vertushka";
      case "large":
        return product.size === "large";
      case "small":
        return product.size === "small";
      case "popular":
        return product.popular === true;
      default:
        return true;
    }
  }

  function sortProducts(list, sort) {
    const sorted = list.slice();
    switch (sort) {
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name, "ru"));
        break;
      case "popularity":
      default:
        sorted.sort((a, b) => b.popularity - a.popularity);
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
