import { bindDeliveryButtons } from "./deliveries.js";

class DeliveriesSearch {
  constructor() {
    this.searchInput = document.getElementById("deliveriesSearch");
    this.cardsContainer = document.querySelector(
      ".submanifest-cards-container"
    );
    this.paginationContainer = document.getElementById("pagination-container");
    this.searchTimeout = null;
    this.isSearching = false;

    this.init();
  }

  init() {
    if (!this.searchInput) {
      console.warn("Search input not found");
      return;
    }

    this.bindSearchEvents();
  }

  bindSearchEvents() {
    this.searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim();

      // Clear previous timeout
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }

      // Debounce search - wait 300ms after user stops typing
      this.searchTimeout = setTimeout(() => {
        this.performSearch(query);
      }, 300);
    });

    // Handle search on Enter key
    this.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (this.searchTimeout) {
          clearTimeout(this.searchTimeout);
        }
        this.performSearch(e.target.value.trim());
      }
    });
  }

  async performSearch(query) {
    if (this.isSearching) return;

    this.isSearching = true;

    try {
      // Show loading state
      this.showLoadingState();

      // Get current filters from other filter controls
      const filters = this.getCurrentFilters();

      // Add search query to filters
      if (query) {
        filters.append("search", query);
      }

      // Show loader for at least 500ms
      const [response] = await Promise.all([
        fetch(`?${filters.toString()}`),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      const newCards = doc.querySelector(".submanifest-cards-container");
      const newPagination = doc.querySelector("#pagination-container");

      if (newCards && this.cardsContainer) {
        // Check if search returned no results
        const hasNoResults =
          newCards.children.length === 1 &&
          newCards.querySelector(".no-submanifest");

        if (hasNoResults && query) {
          // Show custom empty state for search
          this.showEmptySearchState(query);
        } else {
          // Show results
          this.cardsContainer.replaceChildren(...newCards.children);

          // Rebind events after DOM update
          this.bindCardClickEvents();
          bindDeliveryButtons();

          // Update pagination - only when showing results
          if (newPagination) {
            if (this.paginationContainer) {
              this.paginationContainer.replaceWith(newPagination);
              this.paginationContainer = document.getElementById(
                "pagination-container"
              );
            }

            // Check if pagination should be visible (has more than 1 page)
            const totalPages = parseInt(
              this.paginationContainer?.dataset.totalPages || 0
            );

            if (this.paginationContainer && totalPages > 1) {
              this.paginationContainer.style.display = "flex";

              // Trigger pagination reinit if the pagination module exists
              if (window.initPagination) {
                window.initPagination();
              }
            } else if (this.paginationContainer) {
              // Hide pagination if only 1 page or no pages
              this.paginationContainer.style.display = "none";
            }
          } else if (this.paginationContainer) {
            // Hide pagination if no pagination element in response
            this.paginationContainer.style.display = "none";
          }
        }
      }
    } catch (error) {
      console.error("Search failed:", error);
      this.showErrorState();
    } finally {
      this.isSearching = false;
    }
  }

  getCurrentFilters() {
    const params = new URLSearchParams();

    // Get filter values from existing filter controls
    const vesselTypeSelect = document.getElementById("vesselTypeSelect");
    const originPortSelect = document.getElementById("originPortSelect");
    const destinationPortSelect = document.getElementById(
      "destinationPortSelect"
    );
    const dateFilter = document.getElementById("dateFilter");

    if (vesselTypeSelect && vesselTypeSelect.value !== "all") {
      params.append("vessel_type", vesselTypeSelect.value);
    }
    if (originPortSelect && originPortSelect.value !== "all") {
      params.append("origin_port", originPortSelect.value);
    }
    if (destinationPortSelect && destinationPortSelect.value !== "all") {
      params.append("destination_port", destinationPortSelect.value);
    }
    if (dateFilter && dateFilter.value) {
      params.append("date", dateFilter.value);
    }

    return params;
  }

  showLoadingState() {
    if (!this.cardsContainer) return;

    this.cardsContainer.innerHTML = `
      <div class="search-loading">
        <div class="loading-spinner"></div>
        <p>Searching deliveries...</p>
      </div>
    `;

    // Hide pagination during search
    if (this.paginationContainer) {
      this.paginationContainer.style.display = "none";
    }
  }

  showErrorState() {
    if (!this.cardsContainer) return;

    this.cardsContainer.innerHTML = `
      <div class="search-error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Search failed. Please try again.</p>
      </div>
    `;
  }

  showEmptySearchState(query) {
    if (!this.cardsContainer) return;

    this.cardsContainer.innerHTML = `
      <div class="empty-state search-empty">
        <i class="fas fa-search"></i>
        <p class="no-search-found">No deliveries found matching "${query}"</p>
        <small>Try searching by submanifest number, consignee, or container number</small>
      </div>
    `;

    // Hide pagination when showing empty search state
    if (this.paginationContainer) {
      this.paginationContainer.style.display = "none";
    }
  }

  bindCardClickEvents() {
    const cards = document.querySelectorAll(".submanifest-card");

    cards.forEach((card) => {
      card.addEventListener("click", () => {
        const submanifestId = card.dataset.submanifestId;

        // Dispatch custom event that the pagination module can listen to
        const event = new CustomEvent("submanifestCardClick", {
          detail: { submanifestId, card },
        });
        document.dispatchEvent(event);
      });
    });
  }
}

// Initialize search when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new DeliveriesSearch();
});

export default DeliveriesSearch;
