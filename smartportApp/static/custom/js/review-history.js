document.addEventListener("DOMContentLoaded", function () {
  console.log("hekllo");
  const paginationContainer = document.getElementById("pagination-container");
  const paginationWindow = document.getElementById("pagination-window");
  const prevBtn = document.getElementById("prev-page-btn");
  const nextBtn = document.getElementById("next-page-btn");
  const tableBody = document.getElementById("table-body");

  // Check if required elements exist
  if (!paginationContainer || !tableBody) {
    console.error("Required elements not found:", {
      paginationContainer: !!paginationContainer,
      tableBody: !!tableBody,
    });
    return; // Exit early if elements don't exist
  }

  let currentPage = parseInt(paginationContainer.dataset.currentPage) || 1;
  let totalPages = parseInt(paginationContainer.dataset.totalPages) || 1;
  let isLoading = false;

  // new

  let currentSortBy = "updated_at";
  let currentSortOrder = "desc";

  // Add row click functionality
  function addRowClickHandlers() {
    const clickableRows = tableBody.querySelectorAll(
      ".clickable-row[data-submanifest-id]"
    );
    clickableRows.forEach((row) => {
      row.addEventListener("click", function (e) {
        // Prevent navigation if clicking on status badge or other interactive elements
        if (e.target.closest(".status-badge")) {
          return;
        }

        const submanifestId = this.dataset.submanifestId;
        if (submanifestId) {
          // Open submanifest review page in new tab
          window.open(
            `/customs/submanifest/review/${submanifestId}/`,
            "_blank"
          );
        }
      });
    });
  }

  // Add sort button click handlers
  document.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const column = this.dataset.column;
      const columnMap = {
        0: "submanifest_number",
        1: "consignee_name",
        2: "created_at",
        3: "status",
        4: "updated_at",
      };

      const sortField = columnMap[column];
      if (!sortField) return;

      // Toggle sort order if same column, otherwise default to asc
      if (currentSortBy === sortField) {
        currentSortOrder = currentSortOrder === "asc" ? "desc" : "asc";
      } else {
        currentSortOrder = "asc";
      }

      currentSortBy = sortField;
      currentPage = 1; // Reset to first page when sorting

      updateSortIcons();
      goToPage(1, true); // Pass true to indicate this is a sort operation
    });
  });

  function updateSortIcons() {
    // Reset all icons
    document.querySelectorAll(".sort-btn i").forEach((icon) => {
      icon.className = "fas fa-sort";
    });

    // Update active sort icon
    const columnMap = {
      submanifest_number: "0",
      consignee_name: "1",
      created_at: "2",
      status: "3",
      updated_at: "4",
    };

    const activeColumnIndex = columnMap[currentSortBy];
    if (activeColumnIndex) {
      const activeBtn = document.querySelector(
        `[data-column="${activeColumnIndex}"]`
      );
      if (activeBtn) {
        const icon = activeBtn.querySelector("i");
        icon.className =
          currentSortOrder === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
      }
    }
  }

  // Initialize pagination only if elements exist
  updatePaginationWindow();
  updateNavigationButtons();
  updateSortIcons();
  addRowClickHandlers(); // Add this line to initialize row click handlers

  function updatePaginationWindow() {
    paginationWindow.innerHTML = "";

    let startPage, endPage;

    if (totalPages <= 10) {
      startPage = 1;
      endPage = totalPages;
    } else {
      const windowSize = 10;
      const halfWindow = Math.floor(windowSize / 2);

      if (currentPage <= halfWindow + 1) {
        startPage = 1;
        endPage = windowSize;
      } else if (currentPage >= totalPages - halfWindow) {
        startPage = totalPages - windowSize + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - halfWindow;
        endPage = currentPage + halfWindow - 1;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = `pagination-btn ${i === currentPage ? "active" : ""}`;
      pageBtn.textContent = i;
      pageBtn.dataset.page = i;
      pageBtn.addEventListener("click", () => goToPage(i));
      paginationWindow.appendChild(pageBtn);
    }
  }

  function updateNavigationButtons() {
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
  }

  function showLoadingState() {
    tableBody.innerHTML = `
            <tr class="loading-row">
                <td colspan="5">
                    <div class="spinner"></div>
                    Loading...
                </td>
            </tr>
        `;
    isLoading = true;

    const allBtns = paginationContainer.querySelectorAll("button");
    allBtns.forEach((btn) => (btn.disabled = true));
  }

  function hideLoadingState() {
    isLoading = false;
    updateNavigationButtons();

    const pageBtns = paginationWindow.querySelectorAll("button");
    pageBtns.forEach((btn) => (btn.disabled = false));
  }

  function renderTableRows(data) {
    if (data.length === 0) {
      return `
                <tr>
                    <td colspan="5" style="text-align: center">
                        No review history found.
                    </td>
                </tr>
            `;
    }

    return data
      .map((item) => {
        const statusClass =
          item.status === "approved" ? "approved" : "rejected";
        const statusText = item.status === "approved" ? "Approved" : "Rejected";

        return `
                <tr class="clickable-row" data-submanifest-id="${item.id}" style="cursor: pointer;">
                    <td>${item.submanifest_number}</td>
                    <td>${item.consignee_name}</td>
                    <td>${item.created_at}</td>
                    <td>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </td>
                    <td>${item.updated_at}</td>
                </tr>
            `;
      })
      .join("");
  }

  function goToPage(page, isSort = false) {
    if (
      isLoading ||
      (!isSort && page === currentPage) ||
      page < 1 ||
      page > totalPages
    ) {
      return;
    }

    showLoadingState();
    const startTime = Date.now();

    const url = `/customs/api/review-history/?page=${page}&sort_by=${currentSortBy}&sort_order=${currentSortOrder}`;

    fetch(url, {
      method: "GET",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        const elapsed = Date.now() - startTime;
        const remainingDelay = Math.max(0, 500 - elapsed);

        setTimeout(() => {
          if (data.success) {
            tableBody.innerHTML = renderTableRows(data.data);

            currentPage = data.pagination.current_page;
            totalPages = data.pagination.total_pages;

            // Update sorting state from server response
            if (data.sorting) {
              currentSortBy = data.sorting.sort_by;
              currentSortOrder = data.sorting.sort_order;
            }

            updatePaginationWindow();
            updateSortIcons();
            addRowClickHandlers(); // Re-add click handlers after updating table content
            hideLoadingState();

            const newUrl = new URL(window.location);
            newUrl.searchParams.set("page", currentPage);
            newUrl.searchParams.set("sort_by", currentSortBy);
            newUrl.searchParams.set("sort_order", currentSortOrder);
            window.history.pushState({}, "", newUrl);
          } else {
            throw new Error(data.error || "Server returned error");
          }
        }, remainingDelay);
      })
      .catch((error) => {
        const elapsed = Date.now() - startTime;
        const remainingDelay = Math.max(0, 500 - elapsed);

        setTimeout(() => {
          console.error("Error loading page:", error);
          hideLoadingState();

          tableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: #dc3545; padding: 20px;">
              Error loading data. Please try again.
            </td>
          </tr>
        `;
        }, remainingDelay);
      });
  }

  // Event listeners for navigation buttons
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  });
});
