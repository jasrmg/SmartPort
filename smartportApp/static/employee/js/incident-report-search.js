// Search functionality for incident reports
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

        if (cards.length === 0) {
          console.log("No cards found, skipping");
          return;
        }

        let triggerCard;

        // If we have only 1 card, use that card for triggering
        // Otherwise, use the second-to-last card as before
        if (cards.length === 1) {
          triggerCard = cards[0];
        } else {
          triggerCard = cards[cards.length - 2];
        }

        if (!triggerCard) {
          console.log("Trigger card not found, skipping");
          return;
        }

        const rect = triggerCard.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const threshold = windowHeight + 100;

        if (rect.top < threshold) {
          if (isSearchActive && currentSearchQuery) {
            loadMoreSearchResults();
          } else if (window.loadNextPage) {
            window.loadNextPage();
          } else {
            console.log("No appropriate function to call");
          }
        }
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

  // Show loading state with search-specific message
  feed.innerHTML = `
    <div class="search-loader">
      <div class="loader"></div>
      <p class="search-loading-text">Searching incidents...</p>
    </div>`;

  // Set search active state
  isSearchActive = true;

  // Start timer for minimum loading time
  const startTime = Date.now();
  const minLoadingTime = 500; // 500ms minimum

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

    // Calculate remaining time to reach minimum loading duration
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

    // Wait for remaining time if needed
    if (remainingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }

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
  } catch (err) {
    // Calculate remaining time even for errors
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

    // Wait for remaining time if needed
    if (remainingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }

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
  if (
    window.isLoading ||
    !window.hasMore ||
    !isSearchActive ||
    !currentSearchQuery
  ) {
    return;
  }

  window.isLoading = true;
  const filterSelect = document.querySelector(".filter-select");
  const currentSort = filterSelect ? filterSelect.value : "newest";

  const startTime = Date.now();
  const minLoadingTime = 300;

  // Show loading indicator for more results
  const feed = document.getElementById("incidentFeed");
  if (feed && !feed.querySelector(".loading-more-indicator")) {
    const loadingIndicator = document.createElement("div");
    loadingIndicator.className = "loading-more-indicator";
    loadingIndicator.innerHTML = `
    <div class="loader small"></div>
    <span>Loading more results...</span>
  `;
    feed.appendChild(loadingIndicator);
  }

  try {
    const response = await fetch(
      `/api/search-incidents/?q=${encodeURIComponent(
        currentSearchQuery
      )}&sort=${currentSort}&page=${window.page}`,
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

    const data = await response.json();

    // Calculate remaining time to reach minimum loading duration
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

    // Wait for remaining time if needed
    if (remainingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }

    const feed = document.getElementById("incidentFeed"); //

    data.incidents.forEach((incident) => {
      const cardHTML = window.buildIncidentCard(incident);
      feed.insertAdjacentHTML("beforeend", cardHTML);
      const cardEl = feed.lastElementChild;
      window.updateCarouselControls(cardEl);
    });

    if (window.attachImagePreviewListeners) {
      window.attachImagePreviewListeners();
    }

    // Remove loading indicator
    const loadingIndicator = feed.querySelector(".loading-more-indicator");
    if (loadingIndicator) {
      loadingIndicator.remove();
    }

    window.page++;

    if (!data.has_more) {
      window.hasMore = false;
      window.showEndNotice();
    }
  } catch (err) {
    // Calculate remaining time even for errors
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

    // Wait for remaining time if needed
    if (remainingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }

    console.error("Error loading more search results:", err);

    // Remove loading indicator on error
    const loadingIndicator = feed.querySelector(".loading-more-indicator");
    if (loadingIndicator) {
      loadingIndicator.remove();
    }
  } finally {
    window.isLoading = false;
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
