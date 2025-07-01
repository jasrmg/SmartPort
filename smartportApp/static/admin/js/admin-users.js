// Toggle sidebar collapse
document.addEventListener("DOMContentLoaded", function () {
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

  // Tab switching functionality
  const tabButtons = document.querySelectorAll(".tab-btn");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      // Add active class to clicked button
      button.classList.add("active");

      // Here you would typically show/hide the corresponding user cards
      // This is a placeholder for the filtering logic
      const userType = button.dataset.tab;
      console.log(`Showing ${userType} users`);
    });
  });

  // Submenu toggle functionality
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((item) => {
    const link = item.querySelector(".nav-link");
    const hasSubmenu = item.querySelector(".nav-sub-menu");

    if (hasSubmenu) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        item.classList.toggle("expanded");

        // Close other expanded items
        navItems.forEach((otherItem) => {
          if (otherItem !== item && otherItem.classList.contains("expanded")) {
            otherItem.classList.remove("expanded");
          }
        });
      });
    }
  });

  // ------------- CREATE ADMIN MODAL -------------
  const addAdminBtn = document.getElementById("addAdmin");
  const addAdminModal = document.getElementById("createAdminModal");
  const addAdminCloseBtn = document.getElementById("closeAdminModal");
  const addAdminCancelBtn = document.getElementById("cancelAdminModal");
  const createAdminBtn = document.getElementById("createAdmin");

  const closeModal = (modal) => {
    modal.style.display = "none";
  };

  const adminCloseBtns = [addAdminCancelBtn, addAdminCloseBtn];
  adminCloseBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      closeModal(addAdminModal);
    });
  });

  addAdminBtn.addEventListener("click", () => {
    addAdminModal.style.display = "flex";
  });

  // TODO: CREATE ADMIN LOGIC HERE

  // ------------- CREATE EMPLOYEE MODAL -------------
  const addEmployeeBtn = document.getElementById("addEmployee");
  const addEmployeeModal = document.getElementById("createEmployeeModal");
  const addEmployeeCloseBtn = document.getElementById("closeEmployeeModal");
  const addEmployeeCancelBtn = document.getElementById("cancelEmployeeModal");
  const createEmployeeBtn = document.getElementById("createEmployee");

  const employeeCloseBtns = [addEmployeeCancelBtn, addEmployeeCloseBtn];
  employeeCloseBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      closeModal(addEmployeeModal);
    });
  });

  addEmployeeBtn.addEventListener("click", () => {
    addEmployeeModal.style.display = "flex";
  });

  // TODO: CREATE EMPLOYEE LOGIC HERE

  // ------------- VIEW USER MODAL -------------
  const userModal = document.getElementById("userProfileModal");
  const closeUserModal = document.getElementById("closeProfileModal");
  const cancelUserModal = document.getElementById("cancelProfileModal");
  // CLOSE THE MODAL
  const closeUserModalBtns = [closeUserModal, cancelUserModal];
  closeUserModalBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      closeModal(userModal);
    });
  });
  // ------------- CLOSE MODAL IF CLICKING OUTSIDE USING DRY PRINCIPLE -------------
  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) {
      console.log(e.target);
      closeModal(e.target);
    }
  });

  // TRIGGER TO OPEN THE MODAL
  document.querySelectorAll(".userCard").forEach((card) => {
    card.addEventListener("click", () => {
      const fname = card.dataset.firstName;
      const lname = card.dataset.lastName;

      //set modal content:
      document.getElementById("editFirstName").innerText = fname;
      document.getElementById("editLastName").innerText = lname;

      //show modal:
      userModal.style.display = "flex";

      // Toggle fields editable on focus or click
      document.querySelectorAll(".editable").forEach((input) => {
        input.addEventListener("click", function () {
          this.removeAttribute("readonly");
          this.focus();
        });
      });

      // TO DO: EDIT USER PROFILE LOGIC

      // Fullscreen profile picture preview
      const profilePic = document.getElementById("adminProfilePic");
      profilePic.addEventListener("click", () => {
        if (document.querySelector(".fullscreen-image")) return;

        // Create the fullscreen overlay
        const fullscreenDiv = document.createElement("div");
        fullscreenDiv.classList.add("fullscreen-image");

        // Create the image element
        const img = document.createElement("img");
        img.src = profilePic.src;
        img.classList.add("fullscreen-img");

        // Create the close button
        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = "&times;";
        closeBtn.classList.add("close-fullscreen-btn");

        // Append everything
        fullscreenDiv.appendChild(closeBtn);
        fullscreenDiv.appendChild(img);
        document.body.appendChild(fullscreenDiv);

        // Close on button click
        closeBtn.addEventListener("click", () => {
          fullscreenDiv.remove();
        });

        // Close on clicking outside the image
        fullscreenDiv.addEventListener("click", (e) => {
          if (e.target === fullscreenDiv) {
            fullscreenDiv.remove();
          }
        });
      });
    });
  });
});
