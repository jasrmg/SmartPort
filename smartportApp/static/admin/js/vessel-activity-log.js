document.addEventListener("DOMContentLoaded", function () {
  // Sidebar toggle functionality
  const sidebar = document.querySelector(".sidebar");
  const mainContent = document.querySelector(".main-content");

  document
    .querySelector(".collapse-btn")
    .addEventListener("click", function (e) {
      e.preventDefault();

      // Apply transitions
      sidebar.classList.toggle("sidebar-collapsed");
      mainContent.classList.toggle("sidebar-collapsed-content");

      // Force a reflow for smooth transitions
      void sidebar.offsetWidth;

      // Check for and fix expanded items when sidebar collapses
      if (sidebar.classList.contains("sidebar-collapsed")) {
        // Reset expanded nav items when sidebar collapses
        document.querySelectorAll(".nav-item.expanded").forEach((item) => {
          if (window.getComputedStyle(sidebar).width === "80px") {
            // Keep the expanded class for hover effect but collapse the height
            item.querySelector(".nav-sub-menu").style.height = "0";
          }
        });
      }
    });

  // Submenu toggle functionality
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((item) => {
    const link = item.querySelector(".nav-link");
    const hasSubmenu = item.querySelector(".nav-sub-menu");

    if (hasSubmenu) {
      link.addEventListener("click", function (e) {
        e.preventDefault();

        // Toggle expanded class and show/hide submenu
        const isExpanded = item.classList.contains("expanded");

        if (isExpanded) {
          // If it's already expanded, collapse it
          item.classList.remove("expanded");
          hasSubmenu.style.height = "0px";
        } else {
          // If it's collapsed, expand it
          item.classList.add("expanded");
          hasSubmenu.style.height = "auto";

          // Close other expanded items
          navItems.forEach((otherItem) => {
            if (
              otherItem !== item &&
              otherItem.classList.contains("expanded")
            ) {
              otherItem.classList.remove("expanded");
              const otherSubmenu = otherItem.querySelector(".nav-sub-menu");
              if (otherSubmenu) {
                otherSubmenu.style.height = "0px";
              }
            }
          });
        }
      });
    }
  });

  // Vessel list and detail view functionality
  const vesselsListSection = document.getElementById("vessels-list-section");
  const vesselDetailSection = document.getElementById("vessel-detail-section");
  const vesselCards = document.querySelectorAll(".vessel-card");
  const backToListBtn = document.getElementById("back-to-list");

  // Event listeners for vessel cards
  vesselCards.forEach((card) => {
    card.addEventListener("click", function () {
      // Hide vessel list and show vessel detail
      vesselsListSection.style.display = "none";
      vesselDetailSection.style.display = "block";

      // Scroll to top when viewing details
      window.scrollTo(0, 0);
    });
  });

  // Back button event listener
  backToListBtn.addEventListener("click", function () {
    // Hide vessel detail and show vessel list
    vesselDetailSection.style.display = "none";
    vesselsListSection.style.display = "block";
  });
});
