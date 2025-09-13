// voyage-search.js - Voyage search functionality
class VoyageSearch {
  constructor() {
    this.searchInput = document.getElementById("voyageSearchInput");
    this.tableContainer = document.getElementById("tableContainer");
    this.voyagesTable = document.querySelector(".vessels-table"); // Reusing the same class
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
    const tbody = this.voyagesTable.querySelector("tbody");
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
      voyageNumber: cells[0]?.textContent.trim() || "",
      vesselName: cells[1]?.textContent.trim() || "",
      origin: cells[2]?.textContent.trim() || "",
      destination: cells[3]?.textContent.trim() || "",
      departure: cells[4]?.textContent.trim() || "",
      eta: cells[5]?.textContent.trim() || "",
      status: cells[6]?.textContent.trim() || "",
      voyageId: row.getAttribute("data-voyage-id") || "",
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
      const response = await fetch("/api/voyages/search/", {
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
        this.displaySearchResults(data.voyages, query);
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

  displaySearchResults(voyages, query) {
    const tbody = this.voyagesTable.querySelector("tbody");

    // Clear all rows except loader
    const allRows = tbody.querySelectorAll("tr:not(#searchLoaderRow)");
    allRows.forEach((row) => row.remove());

    if (voyages.length === 0) {
      this.showNoResults(query);
      return;
    }

    voyages.forEach((voyage) => {
      const row = this.createVoyageRow(voyage, query);
      tbody.appendChild(row);
    });

    // Rebind event listeners for new rows
    this.rebindRowEvents();
  }

  createVoyageRow(voyage, query) {
    const row = document.createElement("tr");
    row.setAttribute("data-voyage-id", voyage.voyage_id);
    row.classList.add("search-highlight");

    // Highlight matching text
    const highlightedVoyageNumber = this.highlightMatch(
      voyage.voyage_number,
      query
    );
    const highlightedVesselName = this.highlightMatch(
      voyage.vessel_name,
      query
    );
    const highlightedOrigin = this.highlightMatch(voyage.origin_port, query);
    const highlightedDestination = this.highlightMatch(
      voyage.destination_port,
      query
    );

    row.innerHTML = `
      <td>${highlightedVoyageNumber}</td>
      <td>${highlightedVesselName}</td>
      <td>${highlightedOrigin}</td>
      <td>${highlightedDestination}</td>
      <td>${voyage.departure_date}</td>
      <td>${voyage.eta}</td>
      <td class="status-column" data-id="${voyage.voyage_id}">
        <span class="status-badge ${voyage.status.toLowerCase()}">${
      voyage.status_display
    }</span>
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
    const tbody = this.voyagesTable.querySelector("tbody");
    const row = document.createElement("tr");
    row.innerHTML = `
      <td colspan="7" class="no-search-results">
        <i class="fas fa-search"></i>
        <p>No voyages found matching "${query}"</p>
        <small>Try searching by voyage number, vessel name, or port name</small>
      </td>
    `;
    tbody.appendChild(row);
  }

  showSearchError() {
    const tbody = this.voyagesTable.querySelector("tbody");

    // Clear all rows except loader
    const allRows = tbody.querySelectorAll("tr:not(#searchLoaderRow)");
    allRows.forEach((row) => row.remove());

    const errorRow = document.createElement("tr");
    errorRow.innerHTML = `
      <td colspan="7" style="text-align: center; color: var(--error-color); padding: 1.25rem;">
        <i class="fas fa-exclamation-triangle" style="margin-right: 8px"></i>
        Error occurred while searching. Please try again.
      </td>
    `;
    tbody.appendChild(errorRow);
  }

  showLoader() {
    console.log("Showing voyage search loader...");

    if (!this.searchLoader) {
      console.error("Search loader element not found!");
      return;
    }

    // Show loader row and hide other content
    this.searchLoader.style.display = "table-row";
    this.searchLoader.style.visibility = "visible";
    this.searchLoader.style.opacity = "1";

    // Hide other table rows
    const tbody = this.voyagesTable.querySelector("tbody");
    const otherRows = tbody.querySelectorAll("tr:not(#searchLoaderRow)");
    otherRows.forEach((row) => {
      row.style.display = "none";
    });

    // Add searching class for additional styling
    this.voyagesTable.classList.add("searching");
    if (this.tableContainer) {
      this.tableContainer.classList.add("loading");
    }
  }

  hideLoader() {
    console.log("Hiding voyage search loader...");

    if (!this.searchLoader) return;

    // Hide loader
    this.searchLoader.style.display = "none";

    // Show other table rows
    const tbody = this.voyagesTable.querySelector("tbody");
    const otherRows = tbody.querySelectorAll("tr:not(#searchLoaderRow)");
    otherRows.forEach((row) => {
      row.style.display = "table-row";
    });

    // Remove searching classes
    this.voyagesTable.classList.remove("searching");
    if (this.tableContainer) {
      this.tableContainer.classList.remove("loading");
    }
  }

  restoreOriginalTable() {
    const tbody = this.voyagesTable.querySelector("tbody");

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
  }

  rebindRowEvents() {
    // Rebind voyage status change events
    document.querySelectorAll(".status-column").forEach((cell) => {
      cell.addEventListener("click", () => {
        if (cell.querySelector("select") || cell.dataset.locked === "true")
          return;

        // Trigger the existing voyage status change logic from manage-voyage.js
        if (typeof selectedCell !== "undefined") {
          // The original click handler logic will be maintained
          const event = new Event("click", { bubbles: true });
          cell.dispatchEvent(event);
        }
      });
    });
  }

  clearSearch() {
    this.searchInput.value = "";
    this.hideLoader();
    this.restoreOriginalTable();
  }

  // Public method to refresh original data (call after status updates)
  refreshOriginalData() {
    this.storeOriginalRows();
  }
}

// Initialize search functionality when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  window.voyageSearch = new VoyageSearch();
});

// Listen for voyage updates to refresh search data
window.addEventListener("storage", (event) => {
  if (event.key === "voyageUpdated" && window.voyageSearch) {
    setTimeout(() => {
      window.voyageSearch.refreshOriginalData();
    }, 100);
  }
});
