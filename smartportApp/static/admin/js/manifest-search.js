import { loadSubmanifests } from "./manifest.js";

let searchTimeout;
const searchInput = document.getElementById("voyageSearchInput");
const voyageCardsContainer = document.querySelector(".voyage-cards-container");
const manifestLoader = document.getElementById("manifestLoader");
let currentSearchQuery = "";
let isSearchActive = false;

// Initialize search functionality
document.addEventListener("DOMContentLoaded", () => {
  initializeSearch();
  initializeFilterListeners();
});

const initializeFilterListeners = () => {
  // Listen for filter changes to re-apply search with filters
  const filters = [
    "vesselTypeSelect",
    "originPortSelect",
    "destinationPortSelect",
    "dateFilter",
  ];

  filters.forEach((filterId) => {
    const filterElement = document.getElementById(filterId);
    if (filterElement) {
      filterElement.addEventListener("change", handleFilterChange);
    }
  });
};

const handleFilterChange = () => {
  // If search is active, re-run search with new filters
  if (isSearchActive && currentSearchQuery.length >= 2) {
    clearTimeout(searchTimeout);
    performSearch(currentSearchQuery);
  }
};

const initializeSearch = () => {
  if (searchInput) {
    searchInput.addEventListener("input", handleSearchInput);
    searchInput.addEventListener("keydown", handleSearchKeydown);
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

const showSearchLoader = () => {
  if (manifestLoader) {
    const loaderText = manifestLoader.querySelector("p");
    if (loaderText) loaderText.textContent = "Searching voyages...";
    manifestLoader.style.display = "flex";
  }
};

const hideSearchLoader = () => {
  if (manifestLoader) {
    manifestLoader.style.display = "none";
  }
};

const performSearch = async (query) => {
  try {
    showSearchLoader();

    // Always ensure we have a query for search
    if (!query || query.length < 2) {
      hideSearchLoader();
      return;
    }

    // Get current filter values
    const vesselType =
      document.getElementById("vesselTypeSelect")?.value || "all";
    const originPort =
      document.getElementById("originPortSelect")?.value || "all";
    const destinationPort =
      document.getElementById("destinationPortSelect")?.value || "all";
    const date = document.getElementById("dateFilter")?.value || "";

    // Build search parameters - always include query
    const searchParams = new URLSearchParams({
      q: query, // Always include the search query
    });

    // Add filter parameters only if they're not default values
    if (vesselType && vesselType !== "all") {
      searchParams.append("vessel_type", vesselType);
    }
    if (originPort && originPort !== "all") {
      searchParams.append("origin_port", originPort);
    }
    if (destinationPort && destinationPort !== "all") {
      searchParams.append("destination_port", destinationPort);
    }
    if (date) {
      searchParams.append("date", date);
    }

    const response = await fetch(`/api/voyage/search/?${searchParams}`, {
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

    // Minimum delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    displaySearchResults(data.voyages, query);
  } catch (error) {
    console.error("Search error:", error);
    showSearchError();
  } finally {
    hideSearchLoader();
  }
};

const displaySearchResults = (voyages, query) => {
  if (!voyageCardsContainer) return;

  // Hide pagination during search
  const paginationContainer = document.getElementById("pagination-container");
  if (paginationContainer) {
    paginationContainer.style.display = "none";
  }

  if (voyages && voyages.length > 0) {
    voyageCardsContainer.innerHTML = voyages
      .map((voyage) => createVoyageCard(voyage, query))
      .join("");

    // Rebind event listeners for new cards
    bindVoyageCardEvents();
  } else {
    showNoSearchResults(query);
  }
};

const createVoyageCard = (voyage, query) => {
  // Apply highlighting to search matches
  const highlightedVoyageNumber = highlightSearchMatch(
    voyage.voyage_number || "—",
    query
  );
  const highlightedVesselName = highlightSearchMatch(
    voyage.vessel_name || "Unknown Vessel",
    query
  );
  const highlightedDeparturePort = highlightSearchMatch(
    voyage.departure_port_name || "—",
    query
  );
  const highlightedArrivalPort = highlightSearchMatch(
    voyage.arrival_port_name || "—",
    query
  );

  const arrivalDisplay = voyage.arrival_date
    ? new Date(voyage.arrival_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : voyage.eta
    ? `(ETA) ${new Date(voyage.eta).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`
    : "Not Available";

  const departureDisplay = new Date(voyage.departure_date).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );

  return `
    <div class="voyage-card" data-voyage-id="${voyage.voyage_id}">
      <div class="voyage-header">
        <div class="voyage-card-icon">
          <i class="fas fa-file-invoice"></i>
        </div>
        <div class="voyage-card-title">
          <h3>${highlightedVoyageNumber}</h3>
          <p>${highlightedVesselName}</p>
        </div>
      </div>
      <p class="voyage-card-info">
        <strong>Route:</strong> ${highlightedDeparturePort} ➞ ${highlightedArrivalPort}
      </p>
      <p class="voyage-card-info">
        <strong>Arrival:</strong> ${arrivalDisplay}
      </p>
      <p class="voyage-card-info">
        <strong>Departure:</strong> ${departureDisplay}
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

const bindVoyageCardEvents = () => {
  const cards = voyageCardsContainer.querySelectorAll(".voyage-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const voyageId = card.dataset.voyageId;
      const voyageNumber =
        card
          .querySelector("h3")
          ?.textContent?.replace(/<[^>]*>/g, "")
          .trim() || "Unknown";
      if (voyageId) {
        loadSubmanifests(voyageId, voyageNumber);
      }
    });
  });
};

const showNoSearchResults = (query) => {
  if (!voyageCardsContainer) return;

  voyageCardsContainer.innerHTML = `
    <div class="empty-state search-empty">
      <i class="fas fa-search"></i>
      <p class="no-voyage">No voyages found matching "${query}"</p>
      <small>Try searching by vessel name, voyage number, or port name</small>
    </div>
  `;
};

const showSearchError = () => {
  if (!voyageCardsContainer) return;

  voyageCardsContainer.innerHTML = `
    <div class="empty-state search-empty">
      <i class="fas fa-exclamation-triangle"></i>
      <p class="no-voyage">An error occurred while searching</p>
      <small>Please try again or refresh the page</small>
    </div>
  `;
};

const resetSearch = async () => {
  try {
    showSearchLoader();
    currentSearchQuery = "";
    isSearchActive = false;

    // Reset to original page view - reload page 1
    const paginationContainer = document.getElementById("pagination-container");
    if (paginationContainer) {
      paginationContainer.style.display = "flex";
    }

    // Trigger page reload with current filters (avoid full page reload)
    if (window.loadPage) {
      await window.loadPage(1);
    } else {
      // Fallback: reload current page with filters but without search
      const currentUrl = new URL(window.location);
      currentUrl.searchParams.delete("q");
      window.history.replaceState({}, "", currentUrl);
      window.location.assign(currentUrl.href);
    }
  } catch (error) {
    console.error("Reset search error:", error);
  } finally {
    hideSearchLoader();
  }
};

// Expose search state to other modules
window.getSearchState = () => ({
  isActive: isSearchActive,
  query: currentSearchQuery,
});

// Export for use in other modules
export { isSearchActive, currentSearchQuery };
