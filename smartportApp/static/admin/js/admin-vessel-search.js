// admin-vessels-search.js - Updated with better loader handling
class VesselSearch {
  constructor() {
    this.searchInput = document.getElementById("vesselSearchInput");
    this.tableContainer = document.getElementById("tableContainer");
    this.vesselsTable = document.getElementById("vesselsTable");
    this.searchLoader = document.getElementById("searchLoaderRow");
    this.originalTableRows = [];
    this.searchTimeout = null;
    this.isSearching = false;

    this.init();
  }

  init() {
    if (!this.searchInput) return;

    // Ensure loader is hidden on initialization
    this.hideLoader();

    // Store original table rows
    this.storeOriginalRows();

    // Add event listeners
    this.searchInput.addEventListener(
      "input",
      this.handleSearchInput.bind(this)
    );
    this.searchInput.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  storeOriginalRows() {
    const tbody = this.vesselsTable.querySelector("tbody");
    this.originalTableRows = Array.from(
      tbody.querySelectorAll("tr:not(#searchLoaderRow)")
    ).map((row) => ({
      element: row.cloneNode(true),
      data: this.extractRowData(row),
    }));
  }

  extractRowData(row) {
    const cells = row.querySelectorAll("td");
    if (cells.length === 1 && cells[0].hasAttribute("colspan")) {
      return { isEmpty: true };
    }

    return {
      name: cells[0]?.textContent.trim() || "",
      imo: cells[1]?.textContent.trim() || "",
      type: cells[2]?.textContent.trim() || "",
      status: cells[3]?.textContent.trim() || "",
      vesselId: row.getAttribute("data-vessel-id") || "",
    };
  }

  handleSearchInput(event) {
    const query = event.target.value.trim();

    // Clear existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // If empty query, restore original table immediately
    if (query === "") {
      this.restoreOriginalTable();
      return;
    }

    // Set loading state and delay search
    this.searchTimeout = setTimeout(() => {
      this.performSearch(query);
    }, 300);
  }

  handleKeyDown(event) {
    if (event.key === "Escape") {
      this.clearSearch();
    }
  }

  async performSearch(query) {
    if (this.isSearching) return;

    this.isSearching = true;
    this.showLoader();

    // Ensure minimum loader display time of 500ms
    const startTime = Date.now();

    try {
      const response = await fetch("/api/vessels/search/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        body: JSON.stringify({ query: query }),
      });

      const data = await response.json();

      // Calculate remaining time to show loader
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 500 - elapsedTime);

      setTimeout(() => {
        this.displaySearchResults(data.vessels, query);
        this.hideLoader();
        this.isSearching = false;
      }, remainingTime);
    } catch (error) {
      console.error("Search error:", error);
      setTimeout(() => {
        this.showSearchError();
        this.hideLoader();
        this.isSearching = false;
      }, Math.max(0, 500 - (Date.now() - startTime)));
    }
  }

  displaySearchResults(vessels, query) {
    const tbody = this.vesselsTable.querySelector("tbody");

    // Clear all rows except loader
    const allRows = tbody.querySelectorAll("tr:not(#searchLoaderRow)");
    allRows.forEach((row) => row.remove());

    if (vessels.length === 0) {
      this.showNoResults(query);
      return;
    }

    vessels.forEach((vessel) => {
      const row = this.createVesselRow(vessel, query);
      tbody.appendChild(row);
    });

    // Rebind event listeners for new rows
    this.rebindRowEvents();
  }

  createVesselRow(vessel, query) {
    const row = document.createElement("tr");
    row.setAttribute("data-vessel-id", vessel.vessel_id);
    row.classList.add("search-highlight");

    // Highlight matching text
    const highlightedName = this.highlightMatch(vessel.name, query);
    const highlightedIMO = this.highlightMatch(vessel.imo, query);
    const highlightedType = this.highlightMatch(vessel.type_display, query);

    row.innerHTML = `
      <td>${highlightedName}</td>
      <td>${highlightedIMO}</td>
      <td>${highlightedType}</td>
      <td class="status-column">
        <span class="status-badge ${vessel.status}">${vessel.status_display}</span>
      </td>
      <td>
        <button
          class="btn-icon edit"
          title="Edit Vessel"
          data-name="${vessel.name}"
          data-type="${vessel.vessel_type}"
          data-imo="${vessel.imo}"
          data-capacity="${vessel.capacity}"
        >
          <i class="fas fa-edit"></i>
        </button>
        <button
          class="btn-icon delete"
          title="Delete Vessel"
          data-imo="${vessel.imo}"
        >
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;

    // Remove highlight after animation
    setTimeout(() => {
      row.classList.remove("search-highlight");
    }, 1500);

    return row;
  }

  highlightMatch(text, query) {
    if (!query || !text) return text;

    const regex = new RegExp(`(${this.escapeRegex(query)})`, "gi");
    return text.replace(regex, '<span class="search-match">$1</span>');
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  showNoResults(query) {
    const tbody = this.vesselsTable.querySelector("tbody");
    const row = document.createElement("tr");
    row.innerHTML = `
      <td colspan="5" class="no-search-results">
        <i class="fas fa-search"></i>
        <p>No vessels found matching "${query}"</p>
        <small>Try searching by vessel name, IMO number, or vessel type</small>
      </td>
    `;
    tbody.appendChild(row);
  }

  showSearchError() {
    const tbody = this.vesselsTable.querySelector("tbody");

    // Clear all rows except loader
    const allRows = tbody.querySelectorAll("tr:not(#searchLoaderRow)");
    allRows.forEach((row) => row.remove());

    const errorRow = document.createElement("tr");
    errorRow.innerHTML = `
      <td colspan="5" style="text-align: center; color: var(--error-color); padding: 1.25rem;">
        <i class="fas fa-exclamation-triangle" style="margin-right: 8px"></i>
        Error occurred while searching. Please try again.
      </td>
    `;
    tbody.appendChild(errorRow);
  }

  showLoader() {
    console.log("Showing loader..."); // Debug log

    if (!this.searchLoader) {
      console.error("Search loader element not found!");
      return;
    }

    // Method 1: Show loader row and hide other content
    this.searchLoader.style.display = "table-row";
    this.searchLoader.style.visibility = "visible";
    this.searchLoader.style.opacity = "1";

    // Hide other table rows
    const tbody = this.vesselsTable.querySelector("tbody");
    const otherRows = tbody.querySelectorAll("tr:not(#searchLoaderRow)");
    otherRows.forEach((row) => {
      row.style.display = "none";
    });

    // Add searching class for additional styling
    this.vesselsTable.classList.add("searching");
    this.tableContainer.classList.add("loading");
  }

  hideLoader() {
    console.log("Hiding loader..."); // Debug log

    if (!this.searchLoader) return;

    // Hide loader
    this.searchLoader.style.display = "none";

    // Show other table rows
    const tbody = this.vesselsTable.querySelector("tbody");
    const otherRows = tbody.querySelectorAll("tr:not(#searchLoaderRow)");
    otherRows.forEach((row) => {
      row.style.display = "table-row";
    });

    // Remove searching classes
    this.vesselsTable.classList.remove("searching");
    this.tableContainer.classList.remove("loading");
  }

  restoreOriginalTable() {
    const tbody = this.vesselsTable.querySelector("tbody");

    // Clear all rows except loader
    const allRows = tbody.querySelectorAll("tr:not(#searchLoaderRow)");
    allRows.forEach((row) => row.remove());

    // Restore original rows
    this.originalTableRows.forEach((rowData) => {
      const clonedRow = rowData.element.cloneNode(true);
      tbody.appendChild(clonedRow);
    });

    // Rebind event listeners
    this.rebindRowEvents();

    // Refresh status cell editability
    if (typeof makeStatusCellsEditable === "function") {
      makeStatusCellsEditable();
    }
  }

  rebindRowEvents() {
    // Rebind edit and delete button events (excluding loader row)
    const rows = this.vesselsTable.querySelectorAll(
      "tbody tr:not(#searchLoaderRow)"
    );
    rows.forEach((row) => {
      if (typeof bindVesselActionButtons === "function") {
        bindVesselActionButtons(row);
      }
    });

    // Refresh status cell editability
    if (typeof makeStatusCellsEditable === "function") {
      makeStatusCellsEditable();
    }
  }

  clearSearch() {
    this.searchInput.value = "";
    this.hideLoader();
    this.restoreOriginalTable();
  }

  // Public method to refresh original data (call after adding/deleting vessels)
  refreshOriginalData() {
    this.storeOriginalRows();
  }
}

// Initialize search functionality when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  window.vesselSearch = new VesselSearch();
});

// Listen for vessel additions to refresh search data
window.addEventListener("storage", (event) => {
  if (event.key === "vesselAdded" && window.vesselSearch) {
    setTimeout(() => {
      window.vesselSearch.refreshOriginalData();
    }, 100);
  }
});
