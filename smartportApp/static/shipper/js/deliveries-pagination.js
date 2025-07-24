document.addEventListener("DOMContentLoaded", () => {
  const paginationContainer = document.getElementById("pagination-container");
  if (!paginationContainer) return;

  const originSelect = document.getElementById("originPortSelect");
  const destinationSelect = document.getElementById("destinationPortSelect");
  const vesselTypeSelect = document.getElementById("vesselTypeSelect");
  const dateFilterElement = document.getElementById("dateFilter");
  const hiddenDateInput = document.getElementById("selectedDate");

  let totalPages = parseInt(paginationContainer.dataset.totalPages);
  let currentPage = parseInt(paginationContainer.dataset.currentPage);

  const prevBtn = document.getElementById("prev-page-btn");
  const nextBtn = document.getElementById("next-page-btn");

  const updatePaginationUI = () => {
    const paginationWindow = document.getElementById("pagination-window");
    if (!paginationWindow) return;

    paginationWindow.innerHTML = "";

    const windowSize = 2;

    let start = Math.max(1, currentPage - windowSize + 1);
    let end = Math.min(start + windowSize - 1, totalPages);

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

  const getFilterParams = () => {
    const params = new URLSearchParams();

    const vesselType = vesselTypeSelect.value;
    const originPort = originSelect.value;
    const destinationPort = destinationSelect.value;
    const date = hiddenDateInput.value;

    if (vesselType && vesselType !== "all") {
      params.append("vessel_type", vesselType);
    }
    if (originPort && originPort !== "all") {
      console.log("Origin Port:", originPort);
      params.append("origin_port", originPort);
    }
    if (destinationPort && destinationPort !== "all") {
      console.log("Destination Port:", destinationPort);
      params.append("destination_port", destinationPort);
    }
    if (date) params.append("departure_date", date);

    return params.toString();
  };

  const loadPage = async (page) => {
    try {
      const filters = getFilterParams();
      const res = await fetch(`?page=${page}&${filters}`);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      const newCards = doc.querySelector(".submanifest-cards-container");
      const newPagination = doc.querySelector("#pagination-container");

      const cardsContainer = document.querySelector(
        ".submanifest-cards-container"
      );
      if (newCards && cardsContainer) {
        cardsContainer.replaceChildren(...newCards.children);
      }

      if (newPagination) {
        document
          .querySelector("#pagination-container")
          ?.replaceWith(newPagination);
      }

      initPagination(); // Re-bind and re-render
    } catch (err) {
      console.error("Pagination load error:", err);
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

    if (totalPages <= 1) {
      newPaginationContainer.style.display = "none";
      return;
    } else {
      newPaginationContainer.style.display = "flex";
    }

    newPrevBtn?.removeEventListener("click", handlePrev);
    newNextBtn?.removeEventListener("click", handleNext);
    newPaginationWindow?.removeEventListener("click", handleClick);

    updatePaginationUI();

    newPrevBtn?.addEventListener("click", handlePrev);
    newNextBtn?.addEventListener("click", handleNext);
    newPaginationWindow?.addEventListener("click", handleClick);

    // Update button disabled state
    if (newPrevBtn) newPrevBtn.disabled = currentPage <= 1;
    if (newNextBtn) newNextBtn.disabled = currentPage >= totalPages;
  };

  // Bind filter changes
  document.querySelectorAll(".search-filter select").forEach((select) => {
    select.addEventListener("change", () => loadPage(1));
  });

  // Flatpickr setup for date selection
  let dateSelected = false;

  flatpickr(dateFilterElement, {
    clickOpens: true,
    dateFormat: "Y-m-d",
    allowInput: false,
    defaultDate: null,
    onChange: (selectedDates, dateStr) => {
      dateSelected = true;
      dateFilterElement.textContent = dateStr || "Select Date";
      hiddenDateInput.value = dateStr;
      loadPage(1);
    },
    onOpen: () => {
      dateSelected = false;
    },
    onClose: () => {
      if (!dateSelected) {
        dateFilterElement.textContent = "Select Date";
        document
          .querySelector(".flatpickr-day.selected")
          ?.classList.remove("selected");
        hiddenDateInput.value = "";
        loadPage(1);
      }
    },
  });

  initPagination();
});
