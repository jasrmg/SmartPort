class UserSearch {
  constructor() {
    this.searchInput = document.getElementById("userSearchInput");
    this.userGrid = document.querySelector(".user-grid");
    this.loader = document.getElementById("userLoader");
    this.tabButtons = document.querySelectorAll(".tab-btn");

    this.isSearchMode = false;
    this.searchResults = {};
    this.searchTimeout = null;
    this.currentSearchQuery = null;

    this.init();
  }

  init() {
    // Debounced search input
    this.searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim();

      // Clear previous timeout
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }

      // Set new timeout for search
      this.searchTimeout = setTimeout(() => {
        if (query.length >= 2) {
          this.performSearch(query);
        } else if (query.length === 0) {
          this.clearSearch();
        }
      }, 300);
    });

    // Tab button clicks during search mode
    this.tabButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        if (this.isSearchMode) {
          e.preventDefault();
          e.stopPropagation();

          const role = button.dataset.role;
          this.showSearchResultsForRole(role);

          // Update active tab
          this.tabButtons.forEach((b) => b.classList.remove("active"));
          button.classList.add("active");
        }
      });
    });

    // Enter key search
    this.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const query = this.searchInput.value.trim();
        if (query.length >= 2) {
          this.performSearch(query);
        }
      }
    });
  }

  async performSearch(query) {
    try {
      this.showLoader();
      this.isSearchMode = true;
      this.currentSearchQuery = query;

      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error("Not authenticated");
      }

      const token = await user.getIdToken();

      const [response] = await Promise.all([
        fetch(`/api/account/search-users/?query=${encodeURIComponent(query)}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        new Promise((resolve) => setTimeout(resolve, 500)), // Minimum loader time
      ]);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      this.searchResults = data.results_by_role;

      this.updateTabBadges(data.results_by_role);
      this.showSearchResults(data);
    } catch (error) {
      console.error("Search error:", error);
      this.showError("Failed to search users. Please try again.");
    } finally {
      this.hideLoader();
    }
  }

  updateTabBadges(resultsByRole) {
    // Clear all badges first
    this.clearTabBadges();

    // Add badges for roles with results
    Object.keys(resultsByRole).forEach((role) => {
      const count = resultsByRole[role].length;
      const badge = document.getElementById(`${role}Badge`);
      if (badge && count > 0) {
        badge.textContent = count;
        badge.style.display = "inline-flex";
      }
    });
  }

  clearTabBadges() {
    const badges = document.querySelectorAll(".search-badge");
    badges.forEach((badge) => {
      badge.style.display = "none";
      badge.textContent = "";
    });
  }

  showSearchResults(data) {
    const { query, total_results, results_by_role } = data;

    if (total_results === 0) {
      this.showNoResults(query);
      return;
    }

    this.currentSearchQuery = query;

    // Find the role with the most results to show first
    const sortedRoles = Object.keys(results_by_role).sort(
      (a, b) => results_by_role[b].length - results_by_role[a].length
    );

    const primaryRole = sortedRoles[0];

    // Update active tab to the role with most results
    this.tabButtons.forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.role === primaryRole) {
        btn.classList.add("active");
      }
    });

    // Show results for primary role
    this.showSearchResultsForRole(primaryRole);

    // Show search info
    this.showSearchInfo(query, total_results, Object.keys(results_by_role));
  }

  showSearchResultsForRole(role) {
    const users = this.searchResults[role] || [];

    this.userGrid.innerHTML = "";

    if (users.length === 0) {
      // Show the search query in the message if we have one
      const searchQuery = this.currentSearchQuery || "your search";
      this.userGrid.innerHTML = `
      <div class="no-search-results">
        <i class="fas fa-user-slash"></i>
        <p>No ${role}s found matching "${searchQuery}".</p>
      </div>
    `;
      return;
    }

    users.forEach((user) => {
      const card = this.createUserCard(user, true);
      this.userGrid.appendChild(card);
    });
  }

  createUserCard(user, isSearchResult = false) {
    const statusClass = user.is_online ? "status-active" : "status-inactive";
    const statusText = user.is_online ? "Active" : "Inactive";

    const card = document.createElement("div");
    card.classList.add("user-card", "userCard");

    if (isSearchResult) {
      card.classList.add("search-result", "search-highlight");
    }

    card.dataset.firstName = user.first_name;
    card.dataset.lastName = user.last_name;
    card.dataset.email = user.email;
    card.dataset.role = user.role;
    card.dataset.avatar = user.avatar;

    const avatarHTML = user.avatar
      ? `<img src="${user.avatar}" class="user-avatar-img" alt="${user.role}" />`
      : `<div class="user-avatar">${user.first_name[0]}${user.last_name[0]}</div>`;

    card.innerHTML = `
      <div class="user-header">
        <div class="user-avatar-wrapper">
          ${avatarHTML}
        </div>
        <div class="user-info">
          <h3>${user.first_name} ${user.last_name}</h3>
          <p>${this.capitalize(user.role)}</p>
          <span class="user-status ${statusClass}">
            ${statusText}
          </span>
        </div>
      </div>
    `;

    // Add click listener for user details modal
    card.addEventListener("click", () => this.openUserModal(user));

    return card;
  }

  openUserModal(user) {
    document.getElementById("editFirstName").value = user.first_name;
    document.getElementById("editLastName").value = user.last_name;
    document.getElementById("editEmail").value = user.email;

    const profilePic = document.getElementById("adminProfilePic");
    profilePic.src = user.avatar || "/static/default-avatar.png";

    document.querySelector(".modal-title").textContent = `${this.capitalize(
      user.role
    )} ${user.first_name} ${user.last_name}`;

    const statusIndicator = document.querySelector(".status-indicator");
    statusIndicator.classList.remove("active", "inactive");
    statusIndicator.classList.add(user.is_online ? "active" : "inactive");

    document.getElementById("userProfileModal").style.display = "flex";
  }

  showSearchInfo(query, totalResults, roles) {
    const existingInfo = document.querySelector(".search-results-info");
    if (existingInfo) {
      existingInfo.remove();
    }

    const infoDiv = document.createElement("div");
    infoDiv.className = "search-results-info";
    infoDiv.innerHTML = `
      <i class="fas fa-search"></i>
      Found <strong>${totalResults}</strong> result${
      totalResults !== 1 ? "s" : ""
    } 
      for "<strong>${query}</strong>" across <strong>${roles.length}</strong> 
      role${roles.length !== 1 ? "s" : ""}: ${roles.join(", ")}
    `;

    this.userGrid.parentNode.insertBefore(infoDiv, this.userGrid);
  }

  showNoResults(query) {
    // Clear any existing search info
    const searchInfo = document.querySelector(".search-results-info");
    if (searchInfo) {
      searchInfo.remove();
    }

    this.clearTabBadges();
    this.searchResults = {};

    this.userGrid.innerHTML = `
      <div class="no-search-results">
        <i class="fas fa-search"></i>
        <h3>No users found</h3>
        <p>No users match your search for "<strong>${query}</strong>"</p>
        <p>Try searching with different keywords or check spelling.</p>
      </div>
    `;
  }

  showError(message) {
    this.userGrid.innerHTML = `
      <div class="error-msg">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
      </div>
    `;
  }

  clearSearch() {
    this.searchInput.value = "";

    this.isSearchMode = false;
    this.searchResults = {};
    this.currentSearchQuery = null;
    this.clearTabBadges();

    // Remove search info
    const searchInfo = document.querySelector(".search-results-info");
    if (searchInfo) {
      searchInfo.remove();
    }

    // Trigger the currently active tab to reload normal view
    const activeTab = document.querySelector(".tab-btn.active");
    if (activeTab) {
      // Temporarily remove search mode to allow normal tab switching
      const wasSearchMode = this.isSearchMode;
      this.isSearchMode = false;
      activeTab.click();
      this.isSearchMode = wasSearchMode;
    }
  }

  showLoader() {
    this.loader.style.display = "flex";
    this.userGrid.innerHTML = "";
  }

  hideLoader() {
    this.loader.style.display = "none";
  }

  capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
}

// Initialize search functionality when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Wait a bit for the main admin-users.js to initialize
  setTimeout(() => {
    window.userSearch = new UserSearch();
  }, 100);
});
