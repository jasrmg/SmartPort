let searchTimeout;
const searchInput = document.getElementById("voyageSearchInput");
// const voyageCardsContainer = document.querySelector(".voyage-cards-container");
// const spinner = document.getElementById("voyageLoader");
const emptyState = document.getElementById("emptyState");
const emptyStateText = document.getElementById("emptyStateText");
let currentSearchQuery = "";

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
  // Add listeners to filter dropdowns to clear search when they change
  [
    "filter-vessel-type",
    "filter-origin-port",
    "filter-destination-port",
  ].forEach((id) => {
    const filterElement = document.getElementById(id);
    if (filterElement) {
      filterElement.addEventListener("change", clearSearchOnFilterChange);
    }
  });
};

const clearSearchOnFilterChange = () => {
  if (searchInput && searchInput.value.trim() !== "") {
    searchInput.value = "";
    currentSearchQuery = "";
    // The filter change will trigger the existing pagination logic
    // which will reset the view to show filtered results
  }
};

const handleSearchInput = (e) => {
  const query = e.target.value.trim();
  currentSearchQuery = query;

  // Clear previous timeout
  clearTimeout(searchTimeout);

  // Set new timeout for delayed search
  searchTimeout = setTimeout(() => {
    if (query.length >= 2) {
      performSearch(query);
    } else if (query.length === 0) {
      // Reset to show all results when search is cleared
      resetSearch();
    }
  }, 300); // 300ms delay to avoid too many requests
};

const handleSearchKeydown = (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const query = e.target.value.trim();
    if (query.length >= 2) {
      clearTimeout(searchTimeout);
      performSearch(query);
    }
  }
};

// const showSpinner = () => {
//   if (spinner) {
//     spinner.style.display = "flex";
//   }
// };

// const hideSpinner = () => {
//   if (spinner) {
//     spinner.style.display = "none";
//   }
// };

const performSearch = async (query) => {
  try {
    showSpinner();

    // Minimum delay for UX (500ms as requested)
    const delay = new Promise((resolve) => setTimeout(resolve, 500));

    const searchParams = new URLSearchParams({
      q: query,
      search_type: "voyage_reports",
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
  // console.log(`Highlighting: text="${text}", query="${query}"`);
  if (!query || !text || query.length < 2) {
    return text;
  }

  // Escape special regex characters in query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Create case-insensitive regex to find matches
  const regex = new RegExp(`(${escapedQuery})`, "gi");

  // Replace matches with highlighted version
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

  // Hide empty state if visible
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
};

const resetSearch = async () => {
  try {
    showSpinner();
    currentSearchQuery = "";
    // Minimum delay for UX
    const delay = new Promise((resolve) => setTimeout(resolve, 300));

    // Reset to page 1 with current filters
    const vesselType =
      document.getElementById("filter-vessel-type")?.value || "all";
    const originEl = document.getElementById("filter-origin-port");
    const destEl = document.getElementById("filter-destination-port");

    const originPort =
      originEl && originEl.value !== "undefined" ? originEl.value : "all";
    const destPort =
      destEl && destEl.value !== "undefined" ? destEl.value : "all";

    const query = new URLSearchParams({
      page: 1,
      vessel_type: vesselType,
      origin: originPort,
      destination: destPort,
    }).toString();

    const response = await fetch(`/voyage-report/filter/?${query}`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRFToken": csrftoken,
      },
    });

    const html = await response.text();
    await delay;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const newContainer = doc.querySelector(".voyage-cards-container");

    if (newContainer) {
      voyageCardsContainer.innerHTML = newContainer.innerHTML;

      // Show empty state if no results
      if (newContainer.children.length === 0) {
        if (emptyState && emptyStateText) {
          emptyState.style.display = "block";
          emptyStateText.textContent = "No voyage reports found.";
        }
      }

      // Rebind event listeners
      if (window.rebindVoyageCardEvents) {
        window.rebindVoyageCardEvents();
      }
    }
  } catch (error) {
    console.error("Reset search error:", error);
  } finally {
    hideSpinner();
  }
};
