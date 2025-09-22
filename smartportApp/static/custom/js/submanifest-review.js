document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("search-input");
  const sectionHeader = document.querySelector(".section-header");
  let currentSearchQuery = "";
  let searchTimeout = null;
  let allRows = [];

  // Toast function
  const showToast = (msg, isError = false, duration = 2500) => {
    const toast = document.createElement("div");
    toast.className = `custom-toast ${isError ? "error" : ""}`;
    toast.textContent = msg;

    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("fade-out");
      toast.addEventListener("transitionend", () => toast.remove());
    }, duration);
  };

  // Get CSRF token
  function getCSRFToken() {
    return (
      document.querySelector("[name=csrfmiddlewaretoken]")?.value ||
      document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute("content") ||
      getCookie("csrftoken")
    );
  }

  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === name + "=") {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  // TABLE SORT FUNCTIONALITY
  const table = document.querySelector(".custom-table");
  const sortButtons = document.querySelectorAll(".sort-btn");

  // Store the original order (latest first) when page loads
  const tbody = table.querySelector("tbody");
  const originalOrder = Array.from(tbody.querySelectorAll("tr")).filter(
    (row) => !row.querySelector("td[colspan]") // Exclude "no data" rows
  );

  allRows = [...originalOrder];

  sortButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const column = parseInt(this.dataset.column);
      const currentOrder = this.dataset.order;
      let newOrder = "asc";

      // Determine new sort order
      if (currentOrder === "asc") {
        newOrder = "desc";
      } else if (currentOrder === "desc") {
        newOrder = "none";
      } else {
        newOrder = "asc";
      }

      // Reset all other sort buttons
      sortButtons.forEach((btn) => {
        if (btn !== this) {
          btn.dataset.order = "none";
          btn.querySelector("i").className = "fas fa-sort";
        }
      });

      // Update current button
      this.dataset.order = newOrder;
      updateSortIcon(this, newOrder);

      // Sort the table
      if (newOrder === "none") {
        // Reset to original order (latest first, matches -created_at)
        restoreOriginalOrder();
      } else {
        sortTable(column, newOrder);
      }
    });
  });

  // ADD SEARCH FUNCTIONALITY
  if (searchInput) {
    searchInput.addEventListener("input", function (e) {
      const query = e.target.value.trim();

      // Clear existing timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // Set timeout for search (debounce)
      searchTimeout = setTimeout(() => {
        handleSearch(query);
      }, 150); // Shorter delay for client-side search
    });
  }

  // SEARCH FUNCTIONS
  function handleSearch(query) {
    currentSearchQuery = query;

    // Update UI state
    if (query && query.length >= 2) {
      sectionHeader.classList.add("search-active");
      filterAndDisplayRows(query);
    } else {
      sectionHeader.classList.remove("search-active");
      if (query.length === 0) {
        // Show all rows when search is cleared
        filterAndDisplayRows("");
      }
    }
  }

  function filterAndDisplayRows(searchTerm = "") {
    let filteredRows = allRows;

    // Filter rows based on search term
    if (searchTerm && searchTerm.length >= 2) {
      filteredRows = allRows.filter((row) => {
        const cells = row.querySelectorAll("td");
        const submanifestNumber =
          cells[0]?.textContent.trim().toLowerCase() || "";
        const consigneeName = cells[1]?.textContent.trim().toLowerCase() || "";
        const submittedBy = cells[2]?.textContent.trim().toLowerCase() || "";

        const searchLower = searchTerm.toLowerCase();

        return (
          submanifestNumber.includes(searchLower) ||
          consigneeName.includes(searchLower) ||
          submittedBy.includes(searchLower)
        );
      });
    }

    // Apply current sort if any button is active
    const activeSortBtn = document.querySelector(
      '.sort-btn[data-order]:not([data-order="none"])'
    );
    if (activeSortBtn) {
      const column = parseInt(activeSortBtn.dataset.column);
      const order = activeSortBtn.dataset.order;
      filteredRows = sortRowsArray(filteredRows, column, order);
    }

    // Display filtered and/or sorted rows
    displayRows(filteredRows, searchTerm);
  }

  function displayRows(rows, searchTerm = "") {
    // Clear tbody
    tbody.innerHTML = "";

    if (rows.length === 0) {
      const message = searchTerm
        ? `<div class="no-results-message">
          <i class="fas fa-search"></i>
          <p>No results found for "${searchTerm}"</p>
          <small>Try searching for submanifest number, consignee name, or submitted by</small>
        </div>`
        : "No pending submanifests found.";

      const noDataRow = document.createElement("tr");
      noDataRow.innerHTML = `<td colspan="5" class="no-pending-submanifest">${message}</td>`;
      tbody.appendChild(noDataRow);
      return;
    }

    // Highlight search terms and display rows
    rows.forEach((row) => {
      const clonedRow = row.cloneNode(true);

      if (searchTerm && searchTerm.length >= 2) {
        // Highlight search terms in first 3 columns (submanifest, consignee, submitted by)
        for (let i = 0; i < 3; i++) {
          const cell = clonedRow.cells[i];
          if (cell) {
            cell.innerHTML = highlightSearchTerm(cell.textContent, searchTerm);
          }
        }
      }

      tbody.appendChild(clonedRow);
    });

    // Re-attach event listeners to the new buttons
    attachRowEventListeners();
  }

  function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm || searchTerm.length < 2) {
      return text;
    }

    const regex = new RegExp(
      `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  function attachRowEventListeners() {
    // Re-attach view button listeners
    document.querySelectorAll(".btn-icon.view").forEach((button) => {
      button.addEventListener("click", function () {
        const submanifestId = this.dataset.submanifestId;
        window.open(`/customs/submanifest/review/${submanifestId}/`, "_blank");
      });
    });

    // Re-attach approve button listeners
    document.querySelectorAll(".btn-icon.accept").forEach((button) => {
      button.addEventListener("click", function () {
        const row = this.closest("tr");
        const submanifestId =
          row.querySelector(".btn-icon.view").dataset.submanifestId;

        document.getElementById("approveSubmanifestId").value = submanifestId;
        approveModal.style.display = "flex";
      });
    });

    // Re-attach reject button listeners
    document.querySelectorAll(".btn-icon.reject").forEach((button) => {
      button.addEventListener("click", function () {
        const row = this.closest("tr");
        const submanifestId =
          row.querySelector(".btn-icon.view").dataset.submanifestId;

        document.getElementById("rejectSubmanifestId").value = submanifestId;
        rejectModal.style.display = "flex";
      });
    });
  }

  const updateSortIcon = (button, order) => {
    const icon = button.querySelector("i");
    switch (order) {
      case "asc":
        icon.className = "fas fa-sort-up";
        break;
      case "desc":
        icon.className = "fas fa-sort-down";
        break;
      case "none":
      default:
        icon.className = "fas fa-sort";
        break;
    }
  };

  const restoreOriginalOrder = () => {
    // If there's a search active, show filtered results in original order
    if (currentSearchQuery && currentSearchQuery.length >= 2) {
      filterAndDisplayRows(currentSearchQuery);
    } else {
      // Show all rows in original order
      displayRows(originalOrder);
    }
  };

  const sortTable = (columnIndex, order) => {
    // Get currently visible rows (filtered by search if any)
    let rowsToSort = allRows;

    // Apply search filter if there's an active search
    if (currentSearchQuery && currentSearchQuery.length >= 2) {
      rowsToSort = allRows.filter((row) => {
        const cells = row.querySelectorAll("td");
        const submanifestNumber =
          cells[0]?.textContent.trim().toLowerCase() || "";
        const consigneeName = cells[1]?.textContent.trim().toLowerCase() || "";
        const submittedBy = cells[2]?.textContent.trim().toLowerCase() || "";

        const searchLower = currentSearchQuery.toLowerCase();

        return (
          submanifestNumber.includes(searchLower) ||
          consigneeName.includes(searchLower) ||
          submittedBy.includes(searchLower)
        );
      });
    }

    const sortedRows = sortRowsArray(rowsToSort, columnIndex, order);
    displayRows(sortedRows, currentSearchQuery);
  };

  // ADD THIS HELPER FUNCTION RIGHT AFTER sortTable
  const sortRowsArray = (rows, columnIndex, order) => {
    return rows.slice().sort((a, b) => {
      const cellA = a.cells[columnIndex];
      const cellB = b.cells[columnIndex];

      if (!cellA || !cellB) return 0;

      let valueA = cellA.textContent.trim();
      let valueB = cellB.textContent.trim();

      let comparison = 0;

      switch (columnIndex) {
        case 0: // Submanifest No.
          comparison = valueA.localeCompare(valueB, undefined, {
            numeric: true,
          });
          break;
        case 1: // Consignee Name
        case 2: // Submitted By
          comparison = valueA.localeCompare(valueB);
          break;
        case 3: // Date Submitted
          const dateA = parseDate(valueA);
          const dateB = parseDate(valueB);
          comparison = dateA - dateB;
          break;
        default:
          comparison = valueA.localeCompare(valueB);
      }

      return order === "desc" ? -comparison : comparison;
    });
  };

  const parseDate = (dateString) => {
    // Parse date in format "MMM dd, yyyy" (e.g., "May 15, 2023")
    const months = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };

    const parts = dateString.split(" ");
    if (parts.length === 3) {
      const month = months[parts[0]];
      const day = parseInt(parts[1].replace(",", ""));
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }

    // Fallback to regular date parsing
    return new Date(dateString);
  };

  // OPEN SUBMANIFEST BUTTON FUNCTIONALITY:
  document.querySelectorAll(".btn-icon.view").forEach((button) => {
    button.addEventListener("click", function () {
      const submanifestId = this.dataset.submanifestId;
      window.open(`/customs/submanifest/review/${submanifestId}/`, "_blank");
    });
  });

  // APPROVE AND REJECT FUNCTIONALITY
  const approveModal = document.getElementById("approveModal");
  const rejectModal = document.getElementById("rejectModal");
  const approveForm = document.getElementById("approveForm");
  const rejectForm = document.getElementById("rejectForm");
  const cancelApproveBtn = document.getElementById("cancelApproveBtn");
  const cancelRejectBtn = document.getElementById("cancelRejectBtn");

  // Add event listeners to approve buttons
  document.querySelectorAll(".btn-icon.accept").forEach((button) => {
    button.addEventListener("click", function () {
      const row = this.closest("tr");
      const submanifestId =
        row.querySelector(".btn-icon.view").dataset.submanifestId;

      document.getElementById("approveSubmanifestId").value = submanifestId;
      approveModal.style.display = "flex";
    });
  });

  // Add event listeners to reject buttons
  document.querySelectorAll(".btn-icon.reject").forEach((button) => {
    button.addEventListener("click", function () {
      const row = this.closest("tr");
      const submanifestId =
        row.querySelector(".btn-icon.view").dataset.submanifestId;

      document.getElementById("rejectSubmanifestId").value = submanifestId;
      rejectModal.style.display = "flex";
    });
  });

  // Handle approve form submission
  approveForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const submanifestId = document.getElementById("approveSubmanifestId").value;

    fetch(`/customs/clearance/${submanifestId}/approve/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCSRFToken(),
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          showToast(data.error, true);
        } else {
          showToast(data.message || "Submanifest approved successfully!");
          // Remove the row from the table or refresh the page
          const row = document
            .querySelector(`[data-submanifest-id="${submanifestId}"]`)
            .closest("tr");
          row.remove();

          // Check if table is empty and show no data message
          const remainingRows = tbody.querySelectorAll("tr").length;
          if (remainingRows === 0) {
            const noDataRow = document.createElement("tr");
            noDataRow.innerHTML =
              '<td colspan="6" class="no-pending-submanifest">No pending submanifests found.</td>';
            tbody.appendChild(noDataRow);
          }
        }
        approveModal.style.display = "none";
      })
      .catch((error) => {
        console.error("Error:", error);
        showToast("An error occurred while approving the submanifest.", true);
        approveModal.style.display = "none";
      });
  });

  // Handle reject form submission
  rejectForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const submanifestId = document.getElementById("rejectSubmanifestId").value;
    const note = document.getElementById("rejectNote").value.trim();

    if (!note) {
      showToast("Rejection reason is required.", true);
      return;
    }

    fetch(`/customs/clearance/${submanifestId}/reject/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCSRFToken(),
      },
      body: JSON.stringify({ note: note }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          showToast(data.error, true);
        } else {
          showToast(data.message || "Submanifest rejected successfully!");
          // Remove the row from the table
          const row = document
            .querySelector(`[data-submanifest-id="${submanifestId}"]`)
            .closest("tr");
          row.remove();

          // Check if table is empty and show no data message
          const remainingRows = tbody.querySelectorAll("tr").length;
          if (remainingRows === 0) {
            const noDataRow = document.createElement("tr");
            noDataRow.innerHTML =
              '<td colspan="6" class="no-pending-submanifest">No pending submanifests found.</td>';
            tbody.appendChild(noDataRow);
          }
        }
        rejectModal.style.display = "none";
        document.getElementById("rejectNote").value = ""; // Clear the textarea
      })
      .catch((error) => {
        console.error("Error:", error);
        showToast("An error occurred while rejecting the submanifest.", true);
        rejectModal.style.display = "none";
      });
  });

  // Modal close handlers
  cancelApproveBtn.addEventListener("click", function () {
    approveModal.style.display = "none";
  });

  cancelRejectBtn.addEventListener("click", function () {
    rejectModal.style.display = "none";
    document.getElementById("rejectNote").value = ""; // Clear the textarea
  });

  // Close modals when clicking outside
  window.addEventListener("click", function (e) {
    if (e.target === approveModal) {
      approveModal.style.display = "none";
    }
    if (e.target === rejectModal) {
      rejectModal.style.display = "none";
      document.getElementById("rejectNote").value = ""; // Clear the textarea
    }
  });
});
