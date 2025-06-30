document.addEventListener("DOMContentLoaded", () => {
  /* ------------------------------- START OF DROPDOWN FOR USER PROFILE -------------------------------*/
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      fetchUserDataFromFirestore((userData) => {
        // console.log("USER DATA: ", userData);
        prefillTopBar(userData);
      });
    }
  });
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
  // OPEN MODAL:
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      sidebarEditProfileBtn.addEventListener("click", () => {
        editProfileModal.style.display = "flex";
        prefillEditProfileModal();
      });
      openEditProfileBtn.addEventListener("click", () => {
        editProfileModal.style.display = "flex";
        prefillEditProfileModal();
      });
    } else {
      console.warn("No user logged in.");
    }
  });
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

  // const isFirstNameChanged = firstNameInput
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
  fetchUserDataFromFirestore((userData) => {
    document.getElementById("displayName").textContent = `${toTitleCase(
      userData.role
    )}`;
    document.getElementById("userAvatarImg").src = `${userData.avatar}`;
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
