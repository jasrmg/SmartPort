document.addEventListener("DOMContentLoaded", () => {
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

  const avatarInput = document.getElementById("avatarUpload");
  const avatarPreview = document.getElementById("avatarPreview");

  const editableFields = ["firstName", "lastName"];
  // OPEN MODAL:
  sidebarEditProfileBtn.addEventListener("click", () => {
    editProfileModal.style.display = "flex";
  });
  openEditProfileBtn.addEventListener("click", () => {
    editProfileModal.style.display = "flex";
  });
  // CLOSE MODAL:
  closeEditProfileModalBtn.addEventListener("click", () => {
    editProfileModal.style.display = "none";
  });
  // CANCEL MODAL:
  cancelEditProfileBtn.addEventListener("click", () => {
    editProfileModal.style.display = "none";
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

  // FORM SUBMIT:
  editProfileForm.addEventListener("submit", function (e) {
    e.preventDefault();
    // TODO ADD AJAX HERE
  });
  /* ------------------------------- END OF EDIT PROFILE OPEN MODAL -------------------------------*/
  // CLOSE MODAL WHEN CLICKING OUTSIDE:
  // window.addEventListener("click", function (e) {
  //   if (e.target === modal) {
  //     modal.style.display = "none";
  //   }
  // });

  // CHANGE PASSWORD MODAL:
  /* ------------------------------- START OF CHANGE PASSWORD MODAL -------------------------------*/
  const sidebarChangePassword = document.getElementById(
    "sidebarChangePassword"
  );
  const changePassModal = document.getElementById("changePasswordModal");
  const openPasswordModal = document.getElementById("changePasswordBtn");
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

  // CLOSE CHANGE PASSWORD MODAL:
  [closePasswordModal, cancelPasswordModal].forEach((btn) =>
    btn.addEventListener("click", () => {
      changePassModal.style.display = "none";
      errorDiv.style.display = "none";
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

  //HANDLE FORM SUBMISSION
  /*
  passwordForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const oldPassword = form.old_password.value.trim();
    const newPassword = form.new_password.value.trim();
    const confirmPassword = form.confirm_password.value.trim();

    if (!oldPassword || !newPassword || !confirmPassword) {
      errorDiv.textContent = "All fields required.";
      errorDiv.style.display = "block";
      return;
    }

    if (newPassword !== confirmPassword) {
      errorDiv.textContent = "New passwords does not match!";
      errorDiv.style.display = "block";
      return;
    }

    // TODO ACTUAL REQUEST WITH THE BACKEND AJAX
    // FORM SUBMISSION
  });
  */
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
      console.log("clicked: ", btn);
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
    }
    if (e.target === changePassModal) {
      changePassModal.style.display = "none";
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
