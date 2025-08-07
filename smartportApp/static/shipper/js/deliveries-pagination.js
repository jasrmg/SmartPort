import { bindDeliveryButtons } from "./deliveries.js";

document.addEventListener("DOMContentLoaded", () => {
  let paginationContainer = document.getElementById("pagination-container");
  if (!paginationContainer) return;

  const originSelect = document.getElementById("originPortSelect");
  const destinationSelect = document.getElementById("destinationPortSelect");
  const vesselTypeSelect = document.getElementById("vesselTypeSelect");
  const dateFilterElement = document.getElementById("dateFilter");

  const cardsContainer = document.getElementById("submanifest-list-section");
  const cargoContainer = document.querySelector(".submanifest-cargo");
  const numberDisplay = document.getElementById("submanifest-number-display");
  const backBtn = document.getElementById("back-to-list-btn");
  const viewClearanceBtn = document.getElementById("view-clearance-btn");

  let totalPages = parseInt(paginationContainer.dataset.totalPages);
  let currentPage = parseInt(paginationContainer.dataset.currentPage);
  let currentSubmanifestId = null; // Track current submanifest

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
        bindCardClickEvents(); // rebind click after DOM changes
        bindDeliveryButtons();
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

  // Update clearance button visibility and state
  const updateClearanceButton = (hasClearance, clearanceStatus) => {
    if (!viewClearanceBtn) return;

    if (hasClearance) {
      viewClearanceBtn.style.display = "inline-block";
      viewClearanceBtn.disabled = false;

      // Update button text/icon based on clearance status
      const icon = viewClearanceBtn.querySelector("i");
      const text = viewClearanceBtn.querySelector("span") || viewClearanceBtn;

      text.textContent = "View Clearance";
    } else {
      viewClearanceBtn.style.display = "none";
    }
  };

  const bindCardClickEvents = () => {
    const cards = document.querySelectorAll(".submanifest-card");

    cards.forEach((card) => {
      card.addEventListener("click", () => {
        const submanifestId = card.dataset.submanifestId;
        currentSubmanifestId = submanifestId; // Store current ID
        loadCargoForSubmanifest(submanifestId);
        const submanifestNumber = card.querySelector("h3")?.textContent || "";

        numberDisplay.textContent = submanifestNumber;
        cardsContainer.style.display = "none";
        cargoContainer.style.display = "grid";
      });
    });
  };

  const loadCargoForSubmanifest = async (submanifestId) => {
    try {
      const response = await fetch(`/get-cargo-items/${submanifestId}/`);
      const data = await response.json();

      const tbody = document.getElementById("cargo-tbody");

      tbody.innerHTML = ""; // clear previous
      data.cargo.forEach((item) => {
        const row = `
        <tr>
          <td>${item.item_number}</td>
          <td class="desc">${item.description}</td>
          <td class="qty">${item.quantity}</td>
          <td class="value">${item.value}</td>
          <td>
            ${
              item.delivered
                ? '<span class="status-label delivered">Delivered</span>'
                : `
                  <button 
                    class="btn-icon approve"
                    data-cargo-id="${item.id}"
                    data-description="${item.description}"
                    data-quantity="${item.quantity}"
                    data-vessel="${item.vessel}"
                    title="Mark As Delivered">
                    <i class="fas fa-check"></i>
                  </button>
                `
            }
          </td>
        </tr>
      `;
        tbody.insertAdjacentHTML("beforeend", row);
      });

      // Update clearance button based on the fetched data
      updateClearanceButton(data.has_clearance, data.clearance_status);

      document.querySelector(".submanifest-cargo").style.display = "block";

      bindDeliveryButtons();
    } catch (err) {
      console.error("Failed to load cargo:", err);
      // Hide clearance button on error
      if (viewClearanceBtn) {
        viewClearanceBtn.style.display = "none";
      }
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

  // Bind back button only once
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      cardsContainer.style.display = "grid";
      cargoContainer.style.display = "none";
      currentSubmanifestId = null; // Clear current ID
    });
  }

  // Bind clearance button click
  if (viewClearanceBtn) {
    viewClearanceBtn.addEventListener("click", () => {
      if (parseInt(currentSubmanifestId)) {
        // Navigate to clearance view page
        console.log("CURRENT SMID: ", currentSubmanifestId);
        console.log("CURRENT SMID: ", typeof currentSubmanifestId);
        console.log("CURRENT SMID: ", typeof parseInt(currentSubmanifestId));
        window.location.href = `/clearance/${currentSubmanifestId}/`;
      }
    });
  }

  // Init filter change
  [originSelect, destinationSelect, vesselTypeSelect].forEach((select) => {
    select.addEventListener("change", () => {
      currentPage = 1;
      loadPage(currentPage);
    });
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

  // Init
  initPagination();
  bindCardClickEvents(); // needed if cards are already rendered on first load
});
