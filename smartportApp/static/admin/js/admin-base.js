document.addEventListener("DOMContentLoaded", () => {
  const hideLoader = () => {
    const loader = document.getElementById("loader");
    loader.classList.add("fade-out");

    //remove from dom after transition:
    document.body.classList.remove("loading");
    setTimeout(() => {
      loader.remove();
    }, 600);
  };

  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      prefillTopBar()
        .catch((err) => {
          console.error("Error pre-filling topbar:", err);
        })
        .finally(() => {
          hideLoader();
        });

      sidebarEditProfileBtn.addEventListener("click", () => {
        editProfileModal.style.display = "flex";
        fetchUserDataFromFirestore((userData) => {
          // Set input fields
          firstNameInput.value = userData.first_name || "";
          firstNameInput.setAttribute(
            "data-original",
            userData.first_name || ""
          );

          lastNameInput.value = userData.last_name || "";
          lastNameInput.setAttribute("data-original", userData.last_name || "");

          // Set avatar preview
          if (userData.avatar) {
            avatarPreview.src = userData.avatar;
          } else {
            avatarPreview.src = "/media/avatars/default_image.jpg"; // fallback default
          }
        });
      });

      openEditProfileBtn.addEventListener("click", () => {
        editProfileModal.style.display = "flex";
        fetchUserDataFromFirestore((userData) => {
          // Set input fields
          firstNameInput.value = userData.first_name || "";
          firstNameInput.setAttribute(
            "data-original",
            userData.first_name || ""
          );

          lastNameInput.value = userData.last_name || "";
          lastNameInput.setAttribute("data-original", userData.last_name || "");

          // Set avatar preview
          if (userData.avatar) {
            avatarPreview.src = userData.avatar;
          } else {
            avatarPreview.src = "/media/avatars/default_image.jpg"; // fallback default
          }
        });
      });
    } else {
      hideLoader(); // fallback if no user
    }
  });

  // Toggle sidebar collapse
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
        const href = this.getAttribute("href");
        if (href && href !== "#") {
          window.location.href = href;
          return;
        }

        e.preventDefault();
        userHasClickedSubNav = false;

        // Remove active class from all sub-links when main nav is clicked
        document.querySelectorAll(".nav-sub-link").forEach((subLink) => {
          subLink.classList.remove("active");
        });

        if (!sidebar.classList.contains("sidebar-collapsed")) {
          item.classList.toggle("expanded");

          const subMenu = item.querySelector(".nav-sub-menu");
          if (item.classList.contains("expanded") && subMenu) {
            subMenu.style.height = subMenu.scrollHeight + "px";
          } else if (subMenu) {
            subMenu.style.height = "0";
          }

          // Close other expanded navs
          navItems.forEach((otherItem) => {
            if (
              otherItem !== item &&
              otherItem.classList.contains("expanded")
            ) {
              otherItem.classList.remove("expanded");
              const otherSubMenu = otherItem.querySelector(".nav-sub-menu");
              if (otherSubMenu) otherSubMenu.style.height = "0";
            }
          });

          // ✅ Re-highlight active sub-link (restore it after expanding)
          const currentPath = window.location.pathname;
          const subLinks = item.querySelectorAll(".nav-sub-link");
          subLinks.forEach((subLink) => {
            if (subLink.getAttribute("href") === currentPath) {
              subLink.classList.add("active");
            }
          });
        }
      });
    } else if (link) {
      // Handle direct navigation for links without submenus
      link.addEventListener("click", function (e) {
        if (this.getAttribute("href") && this.getAttribute("href") !== "#") {
          // No need to prevent default - let browser navigate normally
        } else {
          e.preventDefault();
        }
      });
    }
  });

  // Track if user has manually clicked a sub-nav link
  let userHasClickedSubNav = false;

  // Navigation handling for sub-links
  document.querySelectorAll(".nav-sub-link").forEach((link) => {
    link.addEventListener("click", function (e) {
      // Check if this is a real URL or a page anchor
      const href = this.getAttribute("href");

      if (href && !href.startsWith("#")) {
        // It's a real URL, let navigation happen normally
        return;
      }

      e.preventDefault();

      // Set flag that user has interacted with navigation
      userHasClickedSubNav = true;

      // Remove active class from all sub links
      document.querySelectorAll(".nav-sub-link").forEach((item) => {
        item.classList.remove("active");
      });

      // Add active class to clicked link
      this.classList.add("active");

      const targetId = href;
      if (!targetId || targetId === "#") return;
      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 80,
          behavior: "smooth",
        });
      }
    });
  });

  // Set active submenu item on scroll, but only after user has interacted
  window.addEventListener("scroll", function () {
    // Don't update active link on initial page load scroll events
    if (!userHasClickedSubNav && window.scrollY < 100) {
      return;
    }

    const scrollPosition = window.scrollY;

    // Get all sections
    const sections = [
      document.querySelector("#mapSection"),
      document.querySelector("#activeVesselsSection"),
      document.querySelector("#analyticsSection"),
    ];

    // Find the current section in view
    let currentSection = null;
    sections.forEach((section) => {
      if (section) {
        const sectionTop = section.offsetTop - 100;
        const sectionBottom = sectionTop + section.offsetHeight;

        if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
          currentSection = section.id;
        }
      }
    });

    // Set active state on navigation only when user has clicked a sub-nav link
    if (currentSection && userHasClickedSubNav) {
      document.querySelectorAll(".nav-sub-link").forEach((link) => {
        link.classList.remove("active");

        if (link.getAttribute("href") === "#" + currentSection) {
          link.classList.add("active");
        }
      });
    }
  });

  // Initial layout state
  if (window.innerWidth <= 768) {
    sidebar.classList.add("sidebar-collapsed");
    mainContent.classList.add("sidebar-collapsed-content");
  }

  setActiveSubNavOnLoad();

  /* ------------------------------- START OF DROPDOWN FOR USER PROFILE -------------------------------*/
  const profileToggle = document.querySelector(".user-profile i.fas");
  const profileDropdown = document.getElementById("profileDropdown");

  profileToggle.addEventListener("click", () => {
    profileDropdown.classList.toggle("hidden");

    // Set chevron based on dropdown visibility
    if (profileDropdown.classList.contains("hidden")) {
      profileToggle.classList.remove("fa-chevron-up");
      profileToggle.classList.add("fa-chevron-down");
    } else {
      profileToggle.classList.remove("fa-chevron-down");
      profileToggle.classList.add("fa-chevron-up");
    }
  });

  document.addEventListener("click", (event) => {
    const isClickInside = document
      .querySelector(".user-profile")
      .contains(event.target);

    if (!isClickInside) {
      // Only run if dropdown is visible
      if (!profileDropdown.classList.contains("hidden")) {
        profileDropdown.classList.add("hidden");

        // Always reset icon to chevron-down
        profileToggle.classList.remove("fa-chevron-up");
        profileToggle.classList.add("fa-chevron-down");
      }
    }
  });
  /* ------------------------------- END OF DROPDOWN FOR USER PROFILE -------------------------------*/

  /* ------------------------------- START OF EDIT PROFILE OPEN MODAL -------------------------------*/

  // SIDEBAR:
  const sidebarEditProfileBtn = document.getElementById(
    "sidebarEditProfileBtn"
  );
  const editProfileModal = document.getElementById("editProfileModal");
  const openEditProfileBtn = document.getElementById("editProfileBtn");
  const closeEditProfileModalBtn = document.getElementById(
    "editProfileCloseBtn"
  );
  const cancelEditProfileBtn = document.getElementById("editProfileCancelBtn");

  const editProfileForm = document.getElementById("editProfileForm");
  const firstNameInput = document.getElementById("firstName");
  const lastNameInput = document.getElementById("lastName");
  const avatarInput = document.getElementById("avatarUpload");
  const avatarPreview = document.getElementById("avatarPreview");

  const spinner = editProfileForm.querySelector(".spinner");
  const btnText = editProfileForm.querySelector(".btn-text");

  const editableFields = ["firstName", "lastName"];
  // CLOSE MODAL:
  closeEditProfileModalBtn.addEventListener("click", () => {
    editProfileModal.style.display = "none";
    clearEditProfileModal();
  });
  // CANCEL MODAL:
  cancelEditProfileBtn.addEventListener("click", () => {
    editProfileModal.style.display = "none";
    clearEditProfileModal();
  });
  // MAKE INPUT FIELDS EDITABLE:
  editableFields.forEach((id) => {
    const input = document.getElementById(id);
    input.addEventListener("click", () => {
      input.readOnly = false;
      input.style.backgroundColor = "white";
      input.focus();
    });
  });
  // AVATAR PREVIEW:
  avatarInput.addEventListener("change", function () {
    const file = this.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => (avatarPreview.src = e.target.result);
      reader.readAsDataURL(file);
    }
  });

  const avatarFile = avatarInput.files[0];

  // FORM SUBMIT:
  editProfileForm.addEventListener("submit", function (e) {
    e.preventDefault();
    // get the current input values
    const originalFirst = firstNameInput.getAttribute("data-original") || "";
    const originalLast = lastNameInput.getAttribute("data-original") || "";

    const currentFirst = firstNameInput.value.trim();
    const currentLast = lastNameInput.value.trim();

    // Check if values have changed
    const isFirstChanged = currentFirst !== originalFirst;
    const isLastChanged = currentLast !== originalLast;
    const isAvatarUploaded = avatarInput.files.length > 0;

    if (!isFirstChanged && !isLastChanged && !isAvatarUploaded) {
      showProfileUpdateStatus("Please change your info", "error");
      return;
    }
    // AJAX FOR SUBMISSION LOGIC:
    spinner.style.display = "inline-block";
    btnText.textContent = "Updating";

    const formData = new FormData();
    formData.append("first_name", firstNameInput.value.trim());
    formData.append("last_name", lastNameInput.value.trim());

    if (avatarInput.files[0]) {
      formData.append("avatar", avatarInput.files[0]);
    }

    try {
      firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
          showProfileUpdateStatus("No authenticated user", "error");
          spinner.style.display = "none";
          btnText.textContent = "Update";
          return;
        }
        const idToken = await user.getIdToken(true);
        const response = await fetch("/api/account/update-profile/", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          body: formData,
        });
        const result = await response.json();
        if (!response.ok) showProfileUpdateStatus(result.error, "error");
        else {
          showProfileUpdateStatus("Profile updated successfully!", "success");
          /* UPDATE THE DOM AFTER */
          fetchUserDataFromFirestore((userData) => {
            prefillTopBar(userData);
          });
        }
        spinner.style.display = "none";
        btnText.textContent = "Update";
      });
    } catch (error) {
      showProfileUpdateStatus(error.message, "error");
    }
  });
  /* ------------------------------- END OF EDIT PROFILE OPEN MODAL -------------------------------*/

  /* ------------------------------- START OF CHANGE PASSWORD MODAL -------------------------------*/
  const sidebarChangePassword = document.getElementById(
    "sidebarChangePassword"
  );
  const openPasswordModal = document.getElementById("changePasswordBtn");
  const changePassModal = document.getElementById("changePasswordModal");
  const closePasswordModal = document.getElementById("changePasswordCloseBtn");
  const cancelPasswordModal = document.getElementById(
    "changePasswordCancelBtn"
  );
  const passwordForm = document.getElementById("changePasswordForm");

  // OPEN CHANGE PASSWORD MODAL:
  sidebarChangePassword.addEventListener("click", () => {
    changePassModal.style.display = "flex";
  });
  openPasswordModal.addEventListener("click", () => {
    changePassModal.style.display = "flex";
  });

  [closePasswordModal, cancelPasswordModal].forEach((btn) =>
    btn.addEventListener("click", () => {
      changePassModal.style.display = "none";
      clearStatus();
      passwordForm.reset();
    })
  );

  //TOGGLE PASSWORD VISIBILITY:
  document.querySelectorAll(".toggle-password").forEach((icon) => {
    icon.addEventListener("click", () => {
      const targetId = icon.getAttribute("data-target");
      const input = document.getElementById(targetId);
      const isVisible = input.type === "text";
      input.type = isVisible ? "password" : "text";
      icon.classList.toggle("fa-eye-slash", isVisible);
      icon.classList.toggle("fa-eye", !isVisible);
    });
  });

  /* ------------------------------- END OF CHANGE PASSWORD MODAL -------------------------------*/

  /* ------------------------------- START OF LOGOUT CONFIRMATION MODAL -------------------------------*/
  const TBlogoutBtn = document.getElementById("TBlogout-btn");
  const SBlogoutBtn = document.getElementById("SBlogout-btn");
  const logoutModal = document.getElementById("logout-modal");
  const confirmLogout = document.getElementById("confirm-logout");
  const cancelLogout = document.getElementById("cancel-logout");
  const confirmLogoutModalCloseBtn = document.getElementById(
    "confirm-logout-modal-close"
  );

  const openLogoutModalBtn = [TBlogoutBtn, SBlogoutBtn];
  const closeLogoutModalBtn = [cancelLogout, confirmLogoutModalCloseBtn];
  // OPEN LOGOUT MODAL
  openLogoutModalBtn.forEach((btn) => {
    btn.addEventListener("click", () => {
      logoutModal.style.display = "flex";
    });
  });

  // CLOSE LOGOUT MODAL
  closeLogoutModalBtn.forEach((btn) => {
    btn.addEventListener("click", () => {
      logoutModal.style.display = "none";
    });
  });

  //BUTTON LOADING EFFECTS:
  const buttonLoadingEffect = (button, action, isLoading) => {
    const btnText = button.querySelector(".btn-text");
    const btnSpinner = button.querySelector(".spinner");
    if (isLoading) {
      btnSpinner.style.display = "inline-block";
      if (action.toLowerCase() === "update") {
        btnText.textContent = "Updating";
      }
    } else {
      btnSpinner.style.display = "none";
      if (action.toLowerCase() === "update") {
        btnText.textContent = "Update";
      } else {
        btnText.textContent = "Logout";
      }
    }
  };
  //LOGOUT LOGIC:
  confirmLogout.addEventListener("click", async () => {
    try {
      buttonLoadingEffect(confirmLogout, "Logout", true);
      //firebase logout
      await firebase.auth().signOut();

      //django logout
      await fetch("/api/account/firebase-logout/", {
        method: "POST",
      });

      //redirect
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed: ", error);
    } finally {
      buttonLoadingEffect(confirmLogout, "Logout", false);
    }
  });
  /* ------------------------------- END OF LOGOUT CONFIRMATION MODAL -------------------------------*/

  /* ------------------------------- AUTO CLOSE MODAL IF CLICKED OUTSIDE -------------------------------*/
  window.addEventListener("click", function (e) {
    if (e.target === editProfileModal) {
      editProfileModal.style.display = "none";
      clearEditProfileModal();
    }
    if (e.target === changePassModal) {
      changePassModal.style.display = "none";
      clearStatus();
    }
    if (e.target === logoutModal) {
      logoutModal.style.display = "none";
    }
  });

  /* ------------------------------- START OF NOTIFICATION -------------------------------*/
  const notifToggle = document.getElementById("notificationToggle");
  const notifDropdown = document.getElementById("notificationDropdown");

  notifToggle.addEventListener("click", () => {
    notifDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    const isClickInside =
      notifToggle.contains(event.target) ||
      notifDropdown.contains(event.target);
    if (!isClickInside) {
      notifDropdown.classList.add("hidden");
    }
  });

  /* ------------------------------- END OF NOTIFICATION -------------------------------*/
});

/* ------------------------------- END OF DOMCONTENTLOADED -------------------------------*/

// CLOSE CHANGE PASSWORD MODAL:
const clearStatus = () => {
  const errorDiv = document.getElementById("changepassword-status");
  errorDiv.style.display = "none";
};

// STATUS FOR EDIT PROFILE
const showProfileUpdateStatus = (message, type = "error") => {
  const resetStatus = document.getElementById("edit-profile-status");
  const resetStatusIcon = document.getElementById("edit-profile-status-icon");
  const resetStatusMessage = document.getElementById("edit-profile-status-msg");

  resetStatus.style.display = "flex";
  resetStatus.classList.remove("success", "error");
  resetStatus.classList.add(type);

  resetStatusIcon.className =
    type === "success" ? "fas fa-check-circle" : "fas fa-exclamation-circle";

  resetStatusMessage.textContent = message;
};

// USER DATA FROM FIRESTORE:
const fetchUserDataFromFirestore = (callback) => {
  const user = firebase.auth().currentUser;

  if (!user) {
    console.warn("No user is signed in.");
    return;
  }

  firebase
    .firestore()
    .collection("users")
    .doc(user.uid)
    .get()
    .then((doc) => {
      if (doc.exists) {
        const userData = doc.data();
        callback(userData); // call the provided function with the data
      } else {
        console.warn("User document not found in firestore.");
      }
    })
    .catch((error) => {
      console.error("Error fetching user data from firestore: ", error);
    });
};

const prefillEditProfileModal = () => {
  fetchUserDataFromFirestore((userData) => {
    document.getElementById("firstName").value = userData.first_name || "";
    document.getElementById("lastName").value = userData.last_name || "";

    // put data attribute to compare it later:
    document
      .getElementById("firstName")
      .setAttribute("data-original", userData.first_name || "");
    document
      .getElementById("lastName")
      .setAttribute("data-original", userData.last_name || "");

    const avatarImg = document.getElementById("avatarPreview");
    if (avatarImg && userData.avatar) {
      avatarImg.src = userData.avatar;
    }
  });
};

const prefillTopBar = () => {
  return new Promise((resolve, reject) => {
    fetchUserDataFromFirestore((userData) => {
      try {
        document.getElementById("displayName").textContent = `${toTitleCase(
          userData.role
        )}`;
        document.getElementById("userAvatarImg").src = `${userData.avatar}`;

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

const toTitleCase = (str) => {
  if (!str) return "";

  return str
    .toLowerCase()
    .split(" ")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
};

const clearEditProfileModal = () => {
  // Reset first and last name fields
  const firstNameInput = document.getElementById("firstName");
  const lastNameInput = document.getElementById("lastName");

  firstNameInput.value = "";
  lastNameInput.value = "";

  firstNameInput.removeAttribute("data-original");
  lastNameInput.removeAttribute("data-original");

  // Reset avatar preview
  const avatarImg = document.getElementById("avatarPreview");
  avatarImg.src = "";

  // Clear avatar file input
  const avatarInput = document.getElementById("avatarUpload");
  avatarInput.value = "";

  // Hide the status message
  const statusBox = document.getElementById("edit-profile-status");
  const statusIcon = document.getElementById("edit-profile-status-icon");
  const statusMsg = document.getElementById("edit-profile-status-msg");

  statusBox.style.display = "none";
  statusBox.classList.remove("success", "error", "warning");
  statusIcon.className = "fas";
  statusMsg.textContent = "";
};

const setActiveSubNavOnLoad = () => {
  const currentPath = window.location.pathname;

  document.querySelectorAll(".nav-sub-link").forEach((subLink) => {
    const linkHref = subLink.getAttribute("href");
    if (linkHref === currentPath) {
      subLink.classList.add("active");

      const parentItem = subLink.closest(".nav-item");
      if (parentItem) {
        parentItem.classList.add("expanded");

        const subMenu = parentItem.querySelector(".nav-sub-menu");
        if (subMenu) {
          subMenu.style.height = subMenu.scrollHeight + "px";
        }
      }
    }
  });
};
