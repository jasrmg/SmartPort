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
  const editSubmanifestBtn = document.getElementById("edit-submanifest-btn");

  let totalPages = parseInt(paginationContainer.dataset.totalPages);
  let currentPage = parseInt(paginationContainer.dataset.currentPage);
  let currentSubmanifestId = null; // Track current submanifest

  // Add this function after the variable declarations
  const showLoadingState = () => {
    const cardsContainer = document.querySelector(
      ".submanifest-cards-container"
    );
    if (!cardsContainer) return;

    cardsContainer.innerHTML = `
    <div class="search-loading">
      <div class="loading-spinner"></div>
      <p>Loading deliveries...</p>
    </div>
  `;

    // Hide pagination during loading
    if (paginationContainer) {
      paginationContainer.style.display = "none";
    }
  };

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
    const searchInput = document.getElementById("deliveriesSearch");
    const searchQuery = searchInput ? searchInput.value.trim() : "";

    if (vesselType && vesselType !== "all")
      params.append("vessel_type", vesselType);
    if (originPort && originPort !== "all")
      params.append("origin_port", originPort);
    if (destinationPort && destinationPort !== "all")
      params.append("destination_port", destinationPort);
    if (date) params.append("date", date);
    if (searchQuery) params.append("search", searchQuery);

    return params.toString();
  };

  const loadPage = async (page) => {
    try {
      showLoadingState();

      const filters = getFilterParams();
      // Show loader for at least 500ms (same as search)
      const [response] = await Promise.all([
        fetch(`?page=${page}&${filters}`),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);
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

        // Check if we have "no results" state
        const hasNoResults =
          newCards.children.length === 1 &&
          newCards.querySelector(".no-submanifest");

        if (hasNoResults && paginationContainer) {
          paginationContainer.style.display = "none";
          return; // Exit early, don't process pagination
        }

        // Count actual result cards (excluding empty state divs) - ADD THIS VALIDATION
        const actualCards =
          cardsContainer.querySelectorAll(".submanifest-card");
        const actualCardCount = actualCards.length;

        // console.log(
        //   "📊 [PAGINATION] Actual card count after DOM update:",
        //   actualCardCount
        // );
      }

      if (newPagination) {
        // Get server-reported pagination data
        const serverTotalPages = parseInt(
          newPagination.dataset.totalPages || 0
        );
        const serverCurrentPage = parseInt(
          newPagination.dataset.currentPage || 1
        );

        // Count actual cards to validate server data
        const actualCards =
          cardsContainer?.querySelectorAll(".submanifest-card") || [];
        const actualCardCount = actualCards.length;

        // console.log("📄 [PAGINATION] Server pagination data:", {
        //   serverTotalPages,
        //   serverCurrentPage,
        //   actualCardCount,
        // });

        // Client-side validation: only show pagination if we actually have multiple pages worth of content
        const shouldShowPagination =
          actualCardCount > 0 && serverTotalPages > 1;

        // console.log("📄 [PAGINATION] Pagination decision:", {
        //   serverTotalPages,
        //   actualCardCount,
        //   shouldShowPagination,
        // });

        paginationContainer.replaceWith(newPagination);
        paginationContainer = document.getElementById("pagination-container");

        // Apply the same validation logic as search module
        if (shouldShowPagination) {
          // console.log("📄 [PAGINATION] SHOWING pagination");
          paginationContainer.style.display = "flex";
          initPagination();
        } else {
          // console.log(
          //   "📄 [PAGINATION] HIDING pagination - single page or no results"
          // );
          paginationContainer.style.display = "none";
        }
      } else if (paginationContainer) {
        // Hide pagination if no pagination element in response
        paginationContainer.style.display = "none";
      }
    } catch (err) {
      console.error("Pagination load error:", err);

      // Show error state
      const cardsContainer = document.querySelector(
        ".submanifest-cards-container"
      );
      if (cardsContainer) {
        cardsContainer.innerHTML = `
        <div class="search-error">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Failed to load deliveries. Please try again.</p>
        </div>
      `;
      }

      // Hide pagination on error
      if (paginationContainer) {
        paginationContainer.style.display = "none";
      }
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
      // console.log("icon: ", icon);
    } else {
      viewClearanceBtn.style.display = "none";
    }
  };

  // Update edit button visibility and state
  const updateEditButton = (status = null) => {
    if (!editSubmanifestBtn) return;

    if (currentSubmanifestId) {
      editSubmanifestBtn.style.display = "flex";

      // Disable button for certain statuses
      const disabledStatuses = ["pending_admin", "pending_customs", "approved"];
      const isDisabled = status && disabledStatuses.includes(status);

      editSubmanifestBtn.disabled = isDisabled;

      // Add visual indication for disabled state
      if (isDisabled) {
        editSubmanifestBtn.classList.add("disabled");
        editSubmanifestBtn.title =
          "Cannot edit - Status: " + status.replace("_", " ");
      } else {
        editSubmanifestBtn.classList.remove("disabled");
        editSubmanifestBtn.title = "Edit Submanifest";
      }
    } else {
      editSubmanifestBtn.style.display = "none";
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

  // helper functions
  const fetchDeliveryStatus = async (cargoId) => {
    try {
      const response = await fetch(`/get-delivery-status/${cargoId}/`);
      const data = await response.json();
      return data.status || "Pending";
    } catch (error) {
      console.error("Failed to fetch delivery status:", error);
      return "Error";
    }
  };

  const updateStatusUI = (cargoId, status) => {
    const statusElement = document.getElementById(`status-${cargoId}`);
    if (!statusElement) return;

    statusElement.textContent = status;
    statusElement.className = "status-label";

    switch (status.toLowerCase()) {
      case "delivered":
        statusElement.classList.add("delivered");
        break;
      case "pending":
        statusElement.classList.add("pending");
        break;
      case "in transit":
        statusElement.classList.add("in-transit");
        break;
      default:
        statusElement.classList.add("pending");
    }
  };

  const loadCargoForSubmanifest = async (submanifestId) => {
    try {
      const response = await fetch(`/get-cargo-items/${submanifestId}/`);
      const data = await response.json();

      const tbody = document.getElementById("cargo-tbody");

      tbody.innerHTML = ""; // clear previous

      // Create all rows first
      data.cargo.forEach((item) => {
        const row = `
        <tr>
          <td>${item.item_number}</td>
          <td class="desc">${item.description}</td>
          <td class="qty">${item.quantity}</td>
          <td class="value">${item.value}</td>
          <td>
            <span class="status-label" id="status-${item.id}">Loading...</span>
          </td>
        </tr>
      `;
        tbody.insertAdjacentHTML("beforeend", row);
      });

      // Fetch status for each cargo item
      data.cargo.forEach(async (item) => {
        const status = await fetchDeliveryStatus(item.id);
        updateStatusUI(item.id, status);
      });

      // Update clearance button based on the fetched data
      updateClearanceButton(data.has_clearance, data.clearance_status);

      // Update edit button visibility
      updateEditButton(data.status);

      document.querySelector(".submanifest-cargo").style.display = "block";
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
  };

  window.initPagination = initPagination;

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
      updateEditButton();
    });
  }

  // Bind clearance button click
  if (viewClearanceBtn) {
    viewClearanceBtn.addEventListener("click", () => {
      if (parseInt(currentSubmanifestId)) {
        // Navigate to clearance view page
        window.open(`/clearance/${currentSubmanifestId}/`, "_blank");
      }
    });
  }

  // Bind edit submanifest button click
  if (editSubmanifestBtn) {
    editSubmanifestBtn.addEventListener("click", (e) => {
      // Prevent action if button is disabled
      if (
        editSubmanifestBtn.disabled ||
        editSubmanifestBtn.classList.contains("disabled")
      ) {
        // console.log("blocked");
        e.preventDefault();
        return;
      }

      if (currentSubmanifestId) {
        // Navigate to edit submanifest page
        window.open(
          `/edit/submitted-shipment/${currentSubmanifestId}/`,
          "_blank"
        );
      }
    });
  }

  // Init filter change - ADD LOGGING HERE
  [originSelect, destinationSelect, vesselTypeSelect].forEach((select) => {
    select.addEventListener("change", async () => {
      // console.log(
      //   `🎛️ [PAGINATION] Filter changed: ${select.id} = ${select.value}`
      // );
      currentPage = 1;
      // Show loading state before loading
      showLoadingState();
      await loadPage(currentPage);
    });
  });

  const clearDateBtn = document.getElementById("clearDateBtn");

  const datePicker = flatpickr(dateFilterElement, {
    dateFormat: "Y-m-d",
    allowInput: false,
    onChange: async (selectedDates, dateStr) => {
      if (dateStr) {
        // console.log(`📅 [PAGINATION] Date filter changed: ${dateStr}`);
        dateFilterElement.value = dateStr;
        currentPage = 1;

        // Show loading state before loading
        showLoadingState();
        await loadPage(currentPage);
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
  clearDateBtn.addEventListener("click", async () => {
    // console.log("🗑️ [PAGINATION] Clear date filter clicked");
    datePicker.clear();
    dateFilterElement.value = "";
    toggleClearBtn();
    currentPage = 1;

    // Show loading state before loading
    showLoadingState();
    await loadPage(currentPage); // reload without date filter
  });

  // Show clear button on load if date exists
  toggleClearBtn();

  // Init
  initPagination();
  bindCardClickEvents(); // needed if cards are already rendered on first load

  document.addEventListener("submanifestCardClick", (e) => {
    const { submanifestId } = e.detail;
    currentSubmanifestId = submanifestId;
    loadCargoForSubmanifest(submanifestId);

    const submanifestNumber =
      e.detail.card.querySelector("h3")?.textContent || "";
    numberDisplay.textContent = submanifestNumber;
    cardsContainer.style.display = "none";
    cargoContainer.style.display = "grid";
  });
});
