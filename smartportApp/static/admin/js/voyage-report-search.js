let searchTimeout;
const searchInput = document.getElementById("voyageSearchInput");
const emptyState = document.getElementById("emptyState");
const emptyStateText = document.getElementById("emptyStateText");
let currentSearchQuery = "";
let isSearchActive = false;

// Initialize search functionality
document.addEventListener("DOMContentLoaded", () => {
  initializeSearch();
  initializeFilterListeners();
});

const initializeSearch = () => {
  if (searchInput) {
    searchInput.addEventListener("input", handleSearchInput);
    searchInput.addEventListener("keydown", handleSearchKeydown);
  }
};

const initializeFilterListeners = () => {
  // Modified to work with search results
  [
    "filter-vessel-type",
    "filter-origin-port",
    "filter-destination-port",
  ].forEach((id) => {
    const filterElement = document.getElementById(id);
    if (filterElement) {
      filterElement.addEventListener("change", handleFilterChange);
    }
  });
};

const handleFilterChange = () => {
  // If search is active, apply filters to search results
  if (currentSearchQuery && currentSearchQuery.length >= 2) {
    performSearch(currentSearchQuery);
  }
  // If no search is active, use regular pagination
  // (This will be handled by the existing pagination logic)
};

const handleSearchInput = (e) => {
  const query = e.target.value.trim();
  currentSearchQuery = query;

  // Clear previous timeout
  clearTimeout(searchTimeout);

  // Set new timeout for delayed search
  searchTimeout = setTimeout(() => {
    if (query.length >= 2) {
      isSearchActive = true;
      performSearch(query);
    } else if (query.length === 0) {
      isSearchActive = false;
      resetSearch();
    }
  }, 300);
};

const handleSearchKeydown = (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const query = e.target.value.trim();
    if (query.length >= 2) {
      clearTimeout(searchTimeout);
      isSearchActive = true;
      performSearch(query);
    }
  }
};

const performSearch = async (query) => {
  try {
    showSpinner();

    // Get current filter values
    const vesselType =
      document.getElementById("filter-vessel-type")?.value || "all";
    const originEl = document.getElementById("filter-origin-port");
    const destEl = document.getElementById("filter-destination-port");

    const originPort =
      originEl && originEl.value !== "undefined" ? originEl.value : "all";
    const destPort =
      destEl && destEl.value !== "undefined" ? destEl.value : "all";

    // Minimum delay for UX
    const delay = new Promise((resolve) => setTimeout(resolve, 500));

    const searchParams = new URLSearchParams({
      q: query,
      vessel_type: vesselType,
      origin: originPort,
      destination: destPort,
    });

    const response = await fetch(`/api/voyage-report/search/?${searchParams}`, {
      method: "GET",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRFToken": csrftoken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Wait for minimum delay
    await delay;

    displaySearchResults(data, query);
  } catch (error) {
    console.error("Search error:", error);
    showSearchError();
  } finally {
    hideSpinner();
  }
};

const displaySearchResults = (data, query) => {
  if (!voyageCardsContainer) return;

  if (data.results && data.results.length > 0) {
    // Display search results
    voyageCardsContainer.innerHTML = data.results
      .map((item) => createVoyageCard(item))
      .join("");

    // Remove centering class when showing results
    voyageCardsContainer.classList.remove("show-empty-state");

    // Hide empty state if visible
    if (emptyState) {
      emptyState.style.display = "none";
    }

    // Rebind event listeners for new cards
    if (window.rebindVoyageCardEvents) {
      window.rebindVoyageCardEvents();
    }
  } else {
    // Show no results message
    showNoSearchResults(query);
  }
};

const createVoyageCard = (item) => {
  const parsed = item.parsed;
  const report = item.report;
  const summary = parsed.voyage_summary;

  // Apply highlighting to search matches
  const highlightedVoyageNumber = highlightSearchMatch(
    summary.voyage_number || "—",
    currentSearchQuery
  );
  const highlightedVesselName = highlightSearchMatch(
    parsed.vessel.name || "Unknown Vessel",
    currentSearchQuery
  );
  const highlightedDeparturePort = highlightSearchMatch(
    summary.departure_port || "—",
    currentSearchQuery
  );
  const highlightedArrivalPort = highlightSearchMatch(
    summary.arrival_port || "—",
    currentSearchQuery
  );

  return `
    <div class="voyage-report-card" data-report-id="${report.voyage_report_id}">
      <div class="voyage-report-card-header">
        <div class="voyage-report-card-icon">
          <i class="fas fa-file-invoice"></i>
        </div>
        <div class="voyage-report-card-title">
          <h3>${highlightedVoyageNumber}</h3>
          <p>${highlightedVesselName}</p>
        </div>
      </div>
      <p class="voyage-report-card-info">
        <strong>Route:</strong>  ${highlightedDeparturePort} to ${highlightedArrivalPort}
      </p>
      <p class="voyage-report-card-info">
        <strong>Arrival:</strong> ${
          summary.arrival_date ? summary.arrival_date.slice(0, 10) : "—"
        }
      </p>
      <p class="voyage-report-card-info">
        <strong>Duration:</strong> ${summary.clean_duration || "—"}
      </p>
    </div>
  `;
};

const highlightSearchMatch = (text, query) => {
  if (!query || !text || query.length < 2) {
    return text;
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  return text.replace(regex, '<span class="search-highlight">$1</span>');
};

const showNoSearchResults = (query) => {
  if (!voyageCardsContainer) return;

  voyageCardsContainer.innerHTML = `
    <div class="no-search-results">
      <i class="fas fa-search"></i>
      <p>No voyage reports found matching "${query}"</p>
      <small>Try searching by vessel name, voyage number, or port name</small>
    </div>
  `;

  voyageCardsContainer.classList.add("show-empty-state");

  if (emptyState) {
    emptyState.style.display = "none";
  }
};

const showSearchError = () => {
  if (!voyageCardsContainer) return;

  voyageCardsContainer.innerHTML = `
    <div class="search-error">
      <i class="fas fa-exclamation-triangle"></i>
      <p>An error occurred while searching</p>
      <small>Please try again or refresh the page</small>
    </div>
  `;

  voyageCardsContainer.classList.add("show-empty-state");
};

const resetSearch = async () => {
  try {
    showSpinner();
    currentSearchQuery = "";
    isSearchActive = false;

    // Reset to page 1 with current filters using existing pagination logic
    if (window.fetchPage) {
      await window.fetchPage(1);
    } else {
      // Fallback if fetchPage is not available
      location.reload();
    }
  } catch (error) {
    console.error("Reset search error:", error);
  } finally {
    hideSpinner();
  }
};

// Expose search state to other modules
window.getSearchState = () => ({
  isActive: isSearchActive,
  query: currentSearchQuery,
});
