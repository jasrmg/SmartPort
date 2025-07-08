const paginationWindow = document.getElementById("pagination-window");
const prevBtn = document.getElementById("prev-page-btn");
const nextBtn = document.getElementById("next-page-btn");
const spinner = document.getElementById("voyageLoader");
const voyageCardsContainer = document.querySelector(".voyage-cards-container");

let currentPage = parseInt(
  document.getElementById("pagination-container")?.dataset.currentPage || 1
);
let totalPages = parseInt(
  document.getElementById("pagination-container")?.dataset.totalPages || 1
);

const windowSize = 2;

document.addEventListener("DOMContentLoaded", () => {
  [
    "filter-vessel-type",
    "filter-origin-port",
    "filter-destination-port",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        currentPage = 1;
        fetchPage(1); // Reset to first page when filter is changed
      });
    }
  });
  document.addEventListener("click", (e) => {
    if (e.target.matches(".pagination-btn")) {
      const page = parseInt(e.target.dataset.page);
      if (!isNaN(page) && page !== currentPage) {
        fetchPage(page);
      } else if (e.target.id === "prev-page-btn" && currentPage > 1) {
        fetchPage(currentPage - 1);
      } else if (e.target.id === "next-page-btn" && currentPage < totalPages) {
        fetchPage(currentPage + 1);
      }
    }
  });

  // Attach filter dropdown listeners
  initFilterListeners();

  updatePaginationWindow();
});

const initFilterListeners = () => {
  [
    "filter-vessel-type",
    "filter-origin-port",
    "filter-destination-port",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        currentPage = 1;
        fetchPage(1);
      });
    }
  });
};

const showSpinner = () => {
  spinner.style.display = "flex";
};

const hideSpinner = () => {
  spinner.style.display = "none";
};

const updatePaginationWindow = () => {
  if (!paginationWindow) return;
  paginationWindow.innerHTML = "";

  let windowStart = Math.floor((currentPage - 1) / windowSize) * windowSize + 1;
  let windowEnd = Math.min(windowStart + windowSize - 1, totalPages);

  for (let i = windowStart; i <= windowEnd; i++) {
    const btn = document.createElement("button");
    btn.className = `pagination-btn${i === currentPage ? " active" : ""}`;
    btn.dataset.page = i;
    btn.textContent = i;
    paginationWindow.appendChild(btn);
  }

  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
};

const fetchPage = async (pageNum = 1) => {
  showSpinner();
  const delay = new Promise((resolve) => setTimeout(resolve, 1000));

  const vesselType =
    document.getElementById("filter-vessel-type")?.value || "all";

  const originEl = document.getElementById("filter-origin-port");
  const destEl = document.getElementById("filter-destination-port");

  const originPort =
    originEl && originEl.value !== "undefined" ? originEl.value : "all";
  const destPort =
    destEl && destEl.value !== "undefined" ? destEl.value : "all";
  const query = new URLSearchParams({
    page: pageNum,
    vessel_type: vesselType,
    origin: originPort,
    destination: destPort,
  }).toString();

  try {
    const res = await fetch(`/voyage-report/filter/?${query}`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRFToken": csrftoken,
      },
    });

    const html = await res.text();
    await delay;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const newContainer = doc.querySelector(".voyage-cards-container");

    if (newContainer) {
      voyageCardsContainer.innerHTML = newContainer.innerHTML;
      //rebind click listeners to the newly loaded report cards
      if (window.rebindVoyageCardEvents) window.rebindVoyageCardEvents();
    }

    currentPage = pageNum;
    totalPages = parseInt(
      doc.querySelector("#pagination-container")?.dataset.totalPages || "1"
    );
    if (paginationWindow) updatePaginationWindow();
  } catch (err) {
    console.error("❌ Pagination Fetch Error:", err);
  } finally {
    hideSpinner();
  }
};
