document.addEventListener("DOMContentLoaded", function () {
  // -------------- Sidebar toggle functionality --------------
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

  // -------------- FLATPICKER --------------
  setupFlatpickr("#departurePicker");
  setupFlatpickr("#etaPicker");
});

const centerFlatpickr = (instance) => {
  const calendar = instance.calendarContainer;
  const inputRect = instance._input.getBoundingClientRect();
  const calendarRect = calendar.getBoundingClientRect();

  const left = inputRect.left + inputRect.width / 2 - calendarRect.width / 2;
  const top = inputRect.top + window.scrollY - calendarRect.height - 8; // small gap *above* input

  calendar.style.position = "absolute";
  calendar.style.left = `${left}px`;
  calendar.style.top = `${top}px`;
};

const setupFlatpickr = (selector) => {
  flatpickr(selector, {
    enableTime: true,
    dateFormat: "Y-m-d H:i",
    time_24hr: true,
    minDate: "today",
    onOpen: function (selectedDates, dateStr, instance) {
      setTimeout(() => {
        centerFlatpickr(instance);
      }, 0);
    },
  });
};

setupFlatpickr("#departurePicker");
setupFlatpickr("#etaPicker");
