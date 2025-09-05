// Search functionality for incident reports
console.log(window);
let searchTimeout = null;
let currentSearchQuery = "";
let isSearchActive = false;

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.querySelector(".search-bar input");

  if (!searchInput) {
    console.warn("Search input not found in DOM!");
    return;
  }

  // Add search event listeners
  searchInput.addEventListener("input", handleSearchInput);
  searchInput.addEventListener("keypress", handleSearchKeypress);

  // Clear search when input is cleared
  searchInput.addEventListener("blur", () => {
    if (searchInput.value.trim() === "") {
      clearSearch();
    }
  });

  // UNIFIED SCROLL HANDLER - Only add if not already added
  if (!window.scrollListenerAdded) {
    let scrollTimeout = null;

    window.addEventListener("scroll", () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const cards = document.querySelectorAll(".incident-card");

        console.log("=== SCROLL EVENT ===");
        console.log("Cards found:", cards.length);
        console.log("isSearchActive:", isSearchActive);
        console.log("currentSearchQuery:", currentSearchQuery);
        console.log("window.page:", window.page);
        console.log("window.hasMore:", window.hasMore);
        console.log("window.isLoading:", window.isLoading);

        if (cards.length === 0) {
          console.log("No cards found, skipping");
          return;
        }

        let triggerCard;

        // If we have only 1 card, use that card for triggering
        // Otherwise, use the second-to-last card as before
        if (cards.length === 1) {
          triggerCard = cards[0];
          console.log("Using single card for trigger");
        } else {
          triggerCard = cards[cards.length - 2];
          console.log("Using second-last card for trigger");
        }

        if (!triggerCard) {
          console.log("Trigger card not found, skipping");
          return;
        }

        const rect = triggerCard.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const threshold = windowHeight + 100;

        console.log("Trigger card rect.top:", rect.top);
        console.log("Window height + 100:", threshold);
        console.log("Should trigger?", rect.top < threshold);

        if (rect.top < threshold) {
          if (isSearchActive && currentSearchQuery) {
            console.log(">>> Triggering loadMoreSearchResults");
            loadMoreSearchResults();
          } else if (window.loadNextPage) {
            console.log(">>> Triggering regular loadNextPage");
            window.loadNextPage();
          } else {
            console.log("No appropriate function to call");
          }
        }
        console.log("=== END SCROLL EVENT ===");
      }, 150);
    });

    window.scrollListenerAdded = true;
  }
});

const handleSearchInput = (e) => {
  const query = e.target.value.trim();

  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  // Debounce search - wait 500ms after user stops typing
  searchTimeout = setTimeout(() => {
    if (query !== currentSearchQuery) {
      currentSearchQuery = query;

      if (query === "") {
        clearSearch();
      } else {
        performSearch(query);
      }
    }
  }, 500);
};

const handleSearchKeypress = (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const query = e.target.value.trim();

    // Clear timeout and search immediately
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (query !== currentSearchQuery) {
      currentSearchQuery = query;

      if (query === "") {
        clearSearch();
      } else {
        performSearch(query);
      }
    }
  }
};

const performSearch = async (query) => {
  const feed = document.getElementById("incidentFeed");
  const filterSelect = document.querySelector(".filter-select");
  const currentSort = filterSelect ? filterSelect.value : "newest";

  // Show loading state
  feed.innerHTML = `<div class="loader"></div>`;

  // Set search active state
  isSearchActive = true;

  try {
    const response = await fetch(
      `/api/search-incidents/?q=${encodeURIComponent(
        query
      )}&sort=${currentSort}&page=1`,
      {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRFToken": csrftoken,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    console.log("Search results:", result);
    console.log("Total incidents found:", result.total_count);
    console.log("Incidents in this page:", result.incidents.length);

    // Clear the feed
    feed.innerHTML = "";

    if (result.incidents.length === 0) {
      feed.innerHTML = `
        <div class="no-results search-no-results">
          <i class="fas fa-search"></i>
          <p>No incidents found for "<strong>${query}</strong>"</p>
          <p class="search-suggestion">Try different keywords or check your spelling</p>
        </div>`;
      // Reset pagination variables when no results
      window.page = 1;
      window.hasMore = false;
      window.isLoading = false;
      return;
    }

    // Add search results header
    const searchHeader = document.createElement("div");
    searchHeader.className = "search-results-header";
    searchHeader.innerHTML = `
      <div class="search-info">
        <i class="fas fa-search"></i>
        <span>Found ${result.total_count} result${
      result.total_count !== 1 ? "s" : ""
    } for "<strong>${query}</strong>"</span>
        <button class="clear-search-btn" onclick="clearSearch()">
          <i class="fas fa-times"></i> Clear Search
        </button>
      </div>
    `;
    feed.appendChild(searchHeader);

    // Render incidents
    result.incidents.forEach((incident) => {
      const cardHTML = window.buildIncidentCard(incident);
      feed.insertAdjacentHTML("beforeend", cardHTML);
      const cardEl = feed.lastElementChild;
      window.updateCarouselControls(cardEl);
    });

    // Attach image preview listeners
    if (window.attachImagePreviewListeners) {
      window.attachImagePreviewListeners();
    }

    // PROPERLY initialize pagination for search
    window.page = 2; // Next page to load
    window.hasMore = result.has_more;
    window.isLoading = false;

    console.log(
      "Search completed. window.page set to:",
      window.page,
      "hasMore:",
      window.hasMore
    );
  } catch (err) {
    console.error("Search failed:", err);
    feed.innerHTML = `
      <div class="error-msg">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Something went wrong while searching.</p>
        <button onclick="clearSearch()" class="retry-btn">Clear Search</button>
      </div>`;

    // Reset pagination variables on error
    window.page = 1;
    window.hasMore = false;
    window.isLoading = false;
  }
};

const loadMoreSearchResults = async () => {
  console.log("=== loadMoreSearchResults called ===");
  console.log("window.isLoading:", window.isLoading);
  console.log("window.hasMore:", window.hasMore);
  console.log("isSearchActive:", isSearchActive);
  console.log("currentSearchQuery:", currentSearchQuery);
  console.log("window.page:", window.page);

  if (
    window.isLoading ||
    !window.hasMore ||
    !isSearchActive ||
    !currentSearchQuery
  ) {
    console.log("Early return due to conditions not met");
    return;
  }

  window.isLoading = true;
  const filterSelect = document.querySelector(".filter-select");
  const currentSort = filterSelect ? filterSelect.value : "newest";

  console.log("Making request to page:", window.page);

  try {
    const response = await fetch(
      `/api/search-incidents/?q=${encodeURIComponent(
        currentSearchQuery
      )}&sort=${currentSort}&page=${window.page}`,
      {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRFToken": window.csrftoken || "",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Load more search results response:", data);
    console.log("Additional incidents loaded:", data.incidents.length);

    const feed = document.getElementById("incidentFeed");

    data.incidents.forEach((incident) => {
      const cardHTML = window.buildIncidentCard(incident);
      feed.insertAdjacentHTML("beforeend", cardHTML);
      const cardEl = feed.lastElementChild;
      window.updateCarouselControls(cardEl);
    });

    if (window.attachImagePreviewListeners) {
      window.attachImagePreviewListeners();
    }

    window.page++;
    console.log("Updated window.page to:", window.page);

    if (!data.has_more) {
      window.hasMore = false;
      console.log("No more pages available");
      window.showEndNotice();
    }
  } catch (err) {
    console.error("Error loading more search results:", err);
  } finally {
    window.isLoading = false;
    console.log("=== loadMoreSearchResults completed ===");
  }
};

const clearSearch = () => {
  const searchInput = document.querySelector(".search-bar input");
  if (searchInput) {
    searchInput.value = "";
  }

  currentSearchQuery = "";
  isSearchActive = false;

  // Clear any pending search timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  // Reload the original feed
  reloadOriginalFeed();
};

const reloadOriginalFeed = async () => {
  const feed = document.getElementById("incidentFeed");
  const filterSelect = document.querySelector(".filter-select");
  const currentSort = filterSelect ? filterSelect.value : "newest";

  // Show loading state
  feed.innerHTML = `<div class="loader"></div>`;

  // Reset pagination
  window.page = 2;
  window.hasMore = true;
  window.isLoading = false;

  try {
    const response = await fetch(`?sort=${currentSort}&page=1`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    feed.innerHTML = "";

    if (result.incidents.length === 0) {
      feed.innerHTML = `<p class="no-results">No incident reports to show.</p>`;
      return;
    }

    result.incidents.forEach((incident) => {
      const cardHTML = window.buildIncidentCard(incident);
      feed.insertAdjacentHTML("beforeend", cardHTML);
      const cardEl = feed.lastElementChild;
      window.updateCarouselControls(cardEl);
    });

    if (window.attachImagePreviewListeners) {
      window.attachImagePreviewListeners();
    }

    window.hasMore = result.has_more;
  } catch (err) {
    console.error("Failed to reload original feed:", err);
    feed.innerHTML = `<p class="error-msg">Something went wrong while loading incidents.</p>`;
  }
};

// Modify the scroll handler to support search results
const originalScrollHandler = window.addEventListener;

// Override the scroll event to handle both regular pagination and search pagination
document.addEventListener("DOMContentLoaded", () => {
  // Remove the existing scroll listener and add our enhanced one
  let scrollTimeout = null;

  // Only add scroll listener if not already added by main file
  if (!window.scrollListenerAdded) {
    let scrollTimeout = null;

    window.addEventListener("scroll", () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const cards = document.querySelectorAll(".incident-card");
        if (cards.length < 2) return;

        const secondLast = cards[cards.length - 2];
        if (!secondLast) return;

        const rect = secondLast.getBoundingClientRect();
        if (rect.top < window.innerHeight + 100) {
          if (isSearchActive) {
            loadMoreSearchResults();
          } else if (window.loadNextPage) {
            window.loadNextPage();
          }
        }
      }, 150);
    });

    window.scrollListenerAdded = true;
  }
});

// Export functions for global access
window.clearSearch = clearSearch;
window.performSearch = performSearch;
