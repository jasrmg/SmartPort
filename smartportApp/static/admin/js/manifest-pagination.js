import { loadSubmanifests } from "./manifest.js"; // if you're using module bundlers

const showManifestLoader = (message = "Searching Voyages...") => {
  const loader = document.getElementById("manifestLoader");
  if (loader) {
    const loaderText = loader.querySelector("p");
    if (loaderText) loaderText.textContent = message;
    loader.style.display = "flex";
  }
};

const hideManifestLoader = () => {
  const loader = document.getElementById("manifestLoader");
  if (loader) {
    loader.style.display = "none";
  }
};

const showLoaderWithMinDuration = async (
  asyncFunction,
  message = "Searching Voyages...",
  minDuration = 500
) => {
  showManifestLoader(message);

  const startTime = Date.now();

  try {
    const result = await asyncFunction();
    const elapsed = Date.now() - startTime;

    if (elapsed < minDuration) {
      await new Promise((resolve) =>
        setTimeout(resolve, minDuration - elapsed)
      );
    }

    return result;
  } catch (error) {
    const elapsed = Date.now() - startTime;

    if (elapsed < minDuration) {
      await new Promise((resolve) =>
        setTimeout(resolve, minDuration - elapsed)
      );
    }

    throw error;
  } finally {
    hideManifestLoader();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const paginationContainer = document.getElementById("pagination-container");
  if (!paginationContainer) return;

  const originSelect = document.getElementById("originPortSelect");
  const destinationSelect = document.getElementById("destinationPortSelect");
  const vesselTypeSelect = document.getElementById("vesselTypeSelect");
  const dateFilterElement = document.getElementById("dateFilter");

  let totalPages = parseInt(paginationContainer.dataset.totalPages);
  let currentPage = parseInt(paginationContainer.dataset.currentPage);

  const prevBtn = document.getElementById("prev-page-btn");
  const nextBtn = document.getElementById("next-page-btn");

  const updatePaginationUI = () => {
    const paginationWindow = document.getElementById("pagination-window");
    if (!paginationWindow) return;

    paginationWindow.innerHTML = "";

    const windowSize = 2;

    let start = currentPage;
    let end = start + windowSize - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - windowSize + 1);
    }

    for (let i = start; i <= end; i++) {
      const btn = document.createElement("button");
      btn.className = `pagination-btn ${i === currentPage ? "active" : ""}`;
      btn.textContent = i;
      btn.dataset.page = i;
      paginationWindow.appendChild(btn);
    }

    // Update prev/next disabled state
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
  };

  const bindVoyageCardEvents = (container) => {
    container.addEventListener("click", (e) => {
      const card = e.target.closest(".voyage-card");
      if (!card) return;
      const voyageId = card.dataset.voyageId;
      const voyageNumber = card.querySelector("h3")?.innerText;
      if (voyageId) loadSubmanifests(voyageId, voyageNumber);
    });
  };

  const getFilterParams = () => {
    const params = new URLSearchParams();
    const vesselType = vesselTypeSelect.value;
    const originPort = originSelect.value;
    const destinationPort = destinationSelect.value;
    const date = dateFilterElement.value;

    if (vesselType && vesselType !== "all")
      params.append("vessel_type", vesselType);
    if (originPort && originPort !== "all")
      params.append("origin_port", originPort);
    if (destinationPort && destinationPort !== "all")
      params.append("destination_port", destinationPort);
    if (date) params.append("departure_date", date);

    return params.toString();
  };

  const loadPage = async (page) => {
    try {
      await showLoaderWithMinDuration(async () => {
        const filters = getFilterParams();
        const res = await fetch(`?page=${page}&${filters}`);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        const newCards = doc.querySelector(".voyage-cards-container");
        const newPagination = doc.querySelector("#pagination-container");

        const existingCardsContainer = document.querySelector(
          ".voyage-cards-container"
        );

        if (newCards && existingCardsContainer) {
          existingCardsContainer.replaceChildren(...newCards.children);

          // Check if no results found
          const noVoyageElement =
            existingCardsContainer.querySelector(".no-voyage");
          if (noVoyageElement) {
            noVoyageElement.textContent = "No entry found.";
          }
        }

        if (newPagination) {
          document
            .querySelector("#pagination-container")
            ?.replaceWith(newPagination);
        }

        bindVoyageCardEvents(existingCardsContainer);
        initPagination();
      }, "Searching Voyages...");
    } catch (err) {
      console.error("Pagination load error:", err);
      hideManifestLoader();
    }
  };

  const handleClick = (e) => {
    const page = parseInt(e.target.dataset.page);
    if (!isNaN(page)) {
      currentPage = page;
      loadPage(currentPage);
    }
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      currentPage--;
      loadPage(currentPage);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadPage(currentPage);
    }
  };

  const initPagination = () => {
    const newPaginationContainer = document.getElementById(
      "pagination-container"
    );
    if (!newPaginationContainer) return;

    totalPages = parseInt(newPaginationContainer.dataset.totalPages);
    currentPage = parseInt(newPaginationContainer.dataset.currentPage);

    const newPrevBtn = document.getElementById("prev-page-btn");
    const newNextBtn = document.getElementById("next-page-btn");
    const newPaginationWindow = document.getElementById("pagination-window");

    // Hide container if there's only 1 page
    if (totalPages <= 1) {
      newPaginationContainer.style.display = "none";
      return; // no need to bind events or render buttons
    } else {
      newPaginationContainer.style.display = "flex"; // or whatever it normally is
    }

    // Remove old listeners (defensive)
    newPrevBtn?.removeEventListener("click", handlePrev);
    newNextBtn?.removeEventListener("click", handleNext);
    newPaginationWindow?.removeEventListener("click", handleClick);

    // Render pagination buttons
    updatePaginationUI();

    // Update button disabled state
    if (newPrevBtn) newPrevBtn.disabled = currentPage <= 1;
    if (newNextBtn) newNextBtn.disabled = currentPage >= totalPages;

    // Re-attach listeners
    newPrevBtn?.addEventListener("click", handlePrev);
    newNextBtn?.addEventListener("click", handleNext);
    newPaginationWindow?.addEventListener("click", handleClick);
  };

  document.querySelectorAll(".search-filter select").forEach((select) => {
    select.addEventListener("change", () => loadPage(1));
  });

  const clearDateBtn = document.getElementById("clearDateBtn");

  const datePicker = flatpickr(dateFilterElement, {
    dateFormat: "Y-m-d",
    allowInput: false,
    onChange: (selectedDates, dateStr) => {
      if (dateStr) {
        dateFilterElement.value = dateStr;
        currentPage = 1;
        loadPage(currentPage);
      }
      toggleClearBtn();
    },
    onClose: () => {
      toggleClearBtn();
    },
  });

  // Show/hide clear button based on value
  const toggleClearBtn = () => {
    if (dateFilterElement.value.trim() !== "") {
      clearDateBtn.style.display = "block";
    } else {
      clearDateBtn.style.display = "none";
    }
  };

  // Manual clear handler
  clearDateBtn.addEventListener("click", () => {
    console.log("Clear date filter clicked");
    datePicker.clear();
    dateFilterElement.value = "";
    toggleClearBtn();
    currentPage = 1;
    loadPage(currentPage); // reload without date filter
  });

  // Show clear button on load if date exists
  toggleClearBtn();
  initPagination();
});
