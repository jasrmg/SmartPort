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

  // Initialize pagination only if elements exist
  updatePaginationWindow();
  updateNavigationButtons();

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
                <tr>
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

  function goToPage(page) {
    if (isLoading || page === currentPage || page < 1 || page > totalPages) {
      return;
    }

    showLoadingState();
    const startTime = Date.now();

    fetch(`/customs/api/review-history/?page=${page}`, {
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
            // Update table content using JavaScript
            tableBody.innerHTML = renderTableRows(data.data);

            // Update pagination state
            currentPage = data.pagination.current_page;
            totalPages = data.pagination.total_pages;

            // Update pagination controls
            updatePaginationWindow();
            hideLoadingState();

            // Update URL without page reload
            const url = new URL(window.location);
            url.searchParams.set("page", currentPage);
            window.history.pushState({}, "", url);
          } else {
            throw new Error(data.error || "Server returned error");
          }
        }, remainingDelay);
      })
      .catch((error) => {
        console.error("Error loading page:", error);
        hideLoadingState();

        tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: #dc3545; padding: 20px;">
                        Error loading data. Please try again.
                    </td>
                </tr>
            `;
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
