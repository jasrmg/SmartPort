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
    console.log("🔍 SEARCH START:", { query, isSearching: this.isSearching });

    if (this.isSearching) return;

    this.isSearching = true;

    try {
      // Show loading state
      console.log("🔄 Showing loading state...");
      this.showLoadingState();

      // Get current filters from other filter controls
      const filters = this.getCurrentFilters();
      console.log("📝 Current filters:", filters.toString());

      // Add search query to filters
      if (query) {
        filters.append("search", query);
      }
      console.log("📝 Final filters with search:", filters.toString());

      // Show loader for at least 500ms
      const [response] = await Promise.all([
        fetch(`?${filters.toString()}`),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      const newCards = doc.querySelector(".submanifest-cards-container");
      const newPagination = doc.querySelector("#pagination-container");

      console.log("📦 Server response:", {
        hasNewCards: !!newCards,
        hasNewPagination: !!newPagination,
        newCardsChildren: newCards?.children.length,
        newPaginationData: newPagination
          ? {
              totalPages: newPagination.dataset.totalPages,
              currentPage: newPagination.dataset.currentPage,
              hasHiddenClass: newPagination.classList.contains("hidden"),
            }
          : null,
      });

      if (newCards && this.cardsContainer) {
        // Check if search returned no results
        const hasNoResults =
          newCards.children.length === 1 &&
          newCards.querySelector(".no-submanifest");

        console.log("🎯 Results analysis:", {
          hasNoResults,
          query,
          cardCount: newCards.children.length,
        });

        if (hasNoResults && query) {
          console.log("❌ Showing empty search state");
          this.showEmptySearchState(query);

          // Also replace pagination container to clear any previous state
          if (newPagination && this.paginationContainer) {
            this.paginationContainer.replaceWith(newPagination);
            this.paginationContainer = document.getElementById(
              "pagination-container"
            );
            this.paginationContainer.style.display = "none";
          }
        } else {
          console.log("✅ Showing search results");
          // Show results
          this.cardsContainer.replaceChildren(...newCards.children);

          // Rebind events after DOM update
          this.bindCardClickEvents();
          bindDeliveryButtons();

          // Count actual result cards (excluding empty state divs)
          const actualCards =
            this.cardsContainer.querySelectorAll(".submanifest-card");
          const actualCardCount = actualCards.length;

          console.log(
            "📊 Actual card count after DOM update:",
            actualCardCount
          );

          // Update pagination - validate server data against actual results
          if (newPagination && this.paginationContainer) {
            console.log("📄 Processing pagination...");

            // Get server-reported pagination data
            const serverTotalPages = parseInt(
              newPagination.dataset.totalPages || 0
            );
            const serverCurrentPage = parseInt(
              newPagination.dataset.currentPage || 1
            );

            console.log("📄 Server pagination data:", {
              serverTotalPages,
              serverCurrentPage,
              actualCardCount,
            });

            // Client-side validation: if we have results that fit on one page,
            // don't show pagination regardless of what server says
            const shouldShowPagination =
              actualCardCount > 0 && serverTotalPages > 1;

            // Additional check: if searching and results are few, likely should be 1 page
            if (query && actualCardCount <= 10) {
              // Assuming 10 or fewer results should fit on one page
              console.log(
                "📄 Search with few results detected - likely should be single page"
              );
            }

            console.log("📄 Pagination decision:", {
              serverTotalPages,
              actualCardCount,
              shouldShowPagination,
              isSearchQuery: !!query,
            });

            // Always replace pagination element to get fresh data
            this.paginationContainer.replaceWith(newPagination);
            this.paginationContainer = document.getElementById(
              "pagination-container"
            );

            if (shouldShowPagination) {
              console.log("📄 SHOWING pagination");
              this.paginationContainer.style.display = "flex";
              this.setupBasicPagination();
            } else {
              console.log("📄 HIDING pagination - single page or no results");
              this.paginationContainer.style.display = "none";
            }

            console.log("📄 Final pagination state:", {
              display: this.paginationContainer.style.display,
              isVisible: this.paginationContainer.offsetParent !== null,
            });
          } else if (this.paginationContainer) {
            console.log("📄 No pagination in response - hiding existing");
            this.paginationContainer.style.display = "none";
          }
        }
      }
    } catch (error) {
      console.error("❌ Search failed:", error);
      this.showErrorState();
    } finally {
      console.log("🏁 SEARCH END");
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

  setupBasicPagination() {
    console.log("⚙️ setupBasicPagination called");

    const totalPages = parseInt(
      this.paginationContainer?.dataset.totalPages || 0
    );
    const currentPage = parseInt(
      this.paginationContainer?.dataset.currentPage || 1
    );

    console.log("⚙️ Pagination setup data:", { totalPages, currentPage });

    // Don't set up pagination if only 1 page - should already be hidden
    if (totalPages <= 1) {
      console.log("⚙️ Exiting early - only 1 page");
      return;
    }

    console.log("⚙️ Setting up pagination for multiple pages");

    const paginationWindow =
      this.paginationContainer.querySelector("#pagination-window");
    if (paginationWindow) {
      paginationWindow.innerHTML = "";

      // Create page buttons only if more than 1 page
      for (let i = 1; i <= Math.min(totalPages, 3); i++) {
        const btn = document.createElement("button");
        btn.classList.add("pagination-btn");
        if (i === currentPage) btn.classList.add("active");
        btn.textContent = i;
        btn.dataset.page = i;
        paginationWindow.appendChild(btn);
      }

      console.log("⚙️ Created page buttons:", paginationWindow.children.length);
    }

    // Update prev/next button states
    const prevBtn = this.paginationContainer.querySelector("#prev-page-btn");
    const nextBtn = this.paginationContainer.querySelector("#next-page-btn");

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;

    console.log("⚙️ setupBasicPagination complete");
  }
}

// Initialize search when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new DeliveriesSearch();
});

export default DeliveriesSearch;
