document.addEventListener("DOMContentLoaded", () => {
  let paginationContainer = document.getElementById("pagination-container");
  if (!paginationContainer) return;

  const originSelect = document.getElementById("originPortSelect");
  const destinationSelect = document.getElementById("destinationPortSelect");
  const vesselTypeSelect = document.getElementById("vesselTypeSelect");
  const dateFilterElement = document.getElementById("dateFilter");

  let totalPages = parseInt(paginationContainer.dataset.totalPages);
  let currentPage = parseInt(paginationContainer.dataset.currentPage);

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
      btn.classList.add("pagination-btn");
      if (i === currentPage) btn.classList.add("active");
      btn.textContent = i;
      btn.dataset.page = i;
      paginationWindow.appendChild(btn);
    }

    document.getElementById("prev-page-btn").disabled = currentPage === 1;
    document.getElementById("next-page-btn").disabled =
      currentPage === totalPages;
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
    if (date) params.append("date", date);

    return params.toString();
  };

  const loadPage = async (page) => {
    try {
      const filters = getFilterParams();
      const response = await fetch(`?page=${page}&${filters}`);
      const html = await response.text();
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
        paginationContainer.replaceWith(newPagination);
        paginationContainer = document.getElementById("pagination-container");
        initPagination();
      }
    } catch (err) {
      console.error("Pagination load error:", err);
    }
  };

  const handleClick = (e) => {
    const btn = e.target.closest(".pagination-btn");
    if (!btn) return;

    const page = parseInt(btn.dataset.page);
    if (!isNaN(page) && page !== currentPage) {
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
    totalPages = parseInt(paginationContainer.dataset.totalPages);
    currentPage = parseInt(paginationContainer.dataset.currentPage);

    const prevBtn = document.getElementById("prev-page-btn");
    const nextBtn = document.getElementById("next-page-btn");
    const paginationWindow = document.getElementById("pagination-window");

    prevBtn?.replaceWith(prevBtn.cloneNode(true));
    nextBtn?.replaceWith(nextBtn.cloneNode(true));
    paginationWindow?.replaceWith(paginationWindow.cloneNode(true));

    const newPrevBtn = document.getElementById("prev-page-btn");
    const newNextBtn = document.getElementById("next-page-btn");
    const newPaginationWindow = document.getElementById("pagination-window");

    updatePaginationUI();

    newPrevBtn?.addEventListener("click", handlePrev);
    newNextBtn?.addEventListener("click", handleNext);
    newPaginationWindow?.addEventListener("click", handleClick);

    paginationContainer.style.display = totalPages <= 1 ? "none" : "flex";
  };

  [originSelect, destinationSelect, vesselTypeSelect].forEach((select) => {
    select.addEventListener("change", () => {
      currentPage = 1;
      loadPage(currentPage);
    });
  });

  flatpickr(dateFilterElement, {
    dateFormat: "Y-m-d",
    allowInput: false,
    onChange: (selectedDates, dateStr) => {
      dateFilterElement.value = dateStr;
      currentPage = 1;
      loadPage(currentPage);
    },
  });

  initPagination();
});
