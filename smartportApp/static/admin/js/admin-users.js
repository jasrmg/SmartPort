// Toggle sidebar collapse
document.addEventListener("DOMContentLoaded", function () {
  // Tab switching functionality
  const tabButtons = document.querySelectorAll(".tab-btn");
  const userGrid = document.querySelector(".user-grid");
  const loader = document.getElementById("userLoader");

  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      console.warn("❌ No user is signed in.");
      return;
    }

    tabButtons.forEach((button) => {
      button.addEventListener("click", async (e) => {
        // console.log(e.target.dataset.role);
        // Check if we're in search mode OR if there's a search query active
        if (
          window.userSearch &&
          (window.userSearch.isSearchMode ||
            (window.userSearch.searchInput &&
              window.userSearch.searchInput.value.trim().length >= 2))
        ) {
          return; // maanged by user-search
        }

        // TOGGLE ACTIVE TAB:
        tabButtons.forEach((b) => b.classList.remove("active"));
        button.classList.add("active");

        const role = button.dataset.role;

        // CLEAR GRID AND SHOW LOADER:
        userGrid.innerHTML = "";
        loader.style.display = "flex";

        try {
          const token = await user.getIdToken();

          const [response] = await Promise.all([
            fetch(`/api/account/get-users/?role=${role}`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }),
            new Promise((resolve) => setTimeout(resolve, 500)), // to show loader
          ]);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
          }

          const data = await response.json();

          // clear the grid first
          userGrid.innerHTML = "";

          // Clear any search info that might be present
          const searchInfo = document.querySelector(".search-results-info");
          if (searchInfo) {
            searchInfo.remove();
          }

          if (data.users.length === 0) {
            userGrid.innerHTML =
              '<p class="no-users-msg">No users found for this role.</p>';
            return;
          }

          // RENDER USER CARDS
          data.users.forEach((user) => {
            const statusClass = user.is_online
              ? "status-active"
              : "status-inactive";
            const statusText = user.is_online ? "Active" : "Inactive";

            const card = document.createElement("div");
            card.classList.add("user-card", "userCard");

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
                  <p>${capitalize(user.role)}</p>
                  <span class="user-status ${statusClass}">
                    ${statusText}
                  </span>
                </div>
              </div>
            `;

            card.addEventListener("click", () => {
              document.getElementById("editFirstName").value = user.first_name;
              document.getElementById("editLastName").value = user.last_name;
              document.getElementById("editEmail").value = user.email;

              const profilePic = document.getElementById("adminProfilePic");
              profilePic.src = user.avatar || "/static/default-avatar.png";

              document.querySelector(
                ".modal-title"
              ).textContent = `${capitalize(user.role)} ${user.first_name} ${
                user.last_name
              }`;
              const statusIndicator =
                document.querySelector(".status-indicator");

              statusIndicator.classList.remove("active", "inactive");

              statusIndicator.classList.add(
                user.is_online ? "active" : "inactive"
              );

              document.getElementById("userProfileModal").style.display =
                "flex";

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

            userGrid.appendChild(card);
          });
        } catch (error) {
          console.error(error);
          userGrid.innerHTML =
            '<p class="error-msg">Something went wrong while loading users.</p>';
        } finally {
          loader.style.display = "none";
        }
      });
    });

    // ✅ Trigger admin tab after all listeners are set
    setTimeout(() => {
      document.querySelector('.tab-btn[data-role="admin"]')?.click();
    }, 0);
  });

  // ------------- CREATE ADMIN MODAL -------------
  const addAdminBtn = document.getElementById("addAdmin");
  const addAdminModal = document.getElementById("createAdminModal");
  const addAdminCloseBtn = document.getElementById("closeAdminModal");
  const addAdminCancelBtn = document.getElementById("cancelAdminModal");
  const createAdminBtn = document.getElementById("createAdmin");

  const adminCloseBtns = [addAdminCancelBtn, addAdminCloseBtn];
  adminCloseBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      closeModal(addAdminModal);
      // Clear form fields
      document.getElementById("adminFirstName").value = "";
      document.getElementById("adminLastName").value = "";
      document.getElementById("adminEmail").value = "";
    });
  });

  addAdminBtn.addEventListener("click", () => {
    // OPEN CREATE ADMIN MODAL
    addAdminModal.style.display = "flex";

    document.getElementById("createAdmin").disabled = true;
    // Validate on input
    const adminFirstName = document.getElementById("adminFirstName");
    const adminLastName = document.getElementById("adminLastName");
    const adminEmail = document.getElementById("adminEmail");

    adminFirstName.addEventListener("input", validateAdminForm);
    adminLastName.addEventListener("input", validateAdminForm);
    adminEmail.addEventListener("input", validateAdminForm);

    // Run validation once to set initial state
    validateAdminForm();
  });

  // CREATE ADMIN LOGIC
  createAdminBtn.addEventListener("click", async () => {
    const adminFirstName = document
      .getElementById("adminFirstName")
      .value.trim();
    const adminLastName = document.getElementById("adminLastName").value.trim();
    const adminEmail = document.getElementById("adminEmail").value.trim();
    createUser(
      adminFirstName,
      adminLastName,
      adminEmail,
      "admin",
      createAdminBtn,
      addAdminModal
    );
  });

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
      // Clear form fields
      document.getElementById("employeeFirstName").value = "";
      document.getElementById("employeeLastName").value = "";
      document.getElementById("employeeEmail").value = "";
    });
  });

  addEmployeeBtn.addEventListener("click", () => {
    // OPEN CREATE EMPLOYEE MODAL MODAL
    addEmployeeModal.style.display = "flex";

    // Disable button initially
    document.getElementById("createEmployee").disabled = true;

    // Validate on input
    const employeeFirstName = document.getElementById("employeeFirstName");
    const employeeLastName = document.getElementById("employeeLastName");
    const employeeEmail = document.getElementById("employeeEmail");

    employeeFirstName.addEventListener("input", validateEmployeeForm);
    employeeLastName.addEventListener("input", validateEmployeeForm);
    employeeEmail.addEventListener("input", validateEmployeeForm);

    // Run validation once to set initial state
    validateEmployeeForm();
  });

  // TODO: CREATE EMPLOYEE LOGIC HERE
  createEmployeeBtn.addEventListener("click", async () => {
    const employeeFirstName = document
      .getElementById("employeeFirstName")
      .value.trim();
    const employeeLastName = document
      .getElementById("employeeLastName")
      .value.trim();
    const employeeEmail = document.getElementById("employeeEmail").value.trim();

    createUser(
      employeeFirstName,
      employeeLastName,
      employeeEmail,
      "employee",
      createEmployeeBtn,
      addEmployeeModal
    );
  });

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
      closeModal(e.target);
    }
  });
});

// OUTSIDE DOM
const showToast = (msg, isError = false, duration = 2500) => {
  const toast = document.createElement("div");
  toast.className = `custom-toast ${isError ? "error" : ""}`;
  toast.textContent = msg;

  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("transitionend", () => toast.remove());
  }, duration);
};
const capitalize = (word) => {
  return word.charAt(0).toUpperCase() + word.slice(1);
};

const createUser = async (
  first_name,
  last_name,
  email,
  role,
  button,
  modal
) => {
  const statusBox = modal.querySelector(".status-message");
  const statusText = modal.querySelector(".status-message-text");
  const spinner = button.querySelector(".spinner");
  const btnText = button.querySelector(".btn-text");

  try {
    button.disabled = true;
    spinner.style.display = "inline-block";
    btnText.textContent = "Creating";
    // GETS THE LOGGED USER IN FIREBASE
    const user = firebase.auth().currentUser;
    if (!user) throw new Error("Not authenticated");

    const token = await user.getIdToken();

    avatar =
      role === "admin"
        ? `${window.location.origin}/media/avatars/default_admin.jfif`
        : `${window.location.origin}/media/avatars/default_employee.jfif`;

    // MYSQL BACKEND
    const response = await fetch("/api/account/create-user/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: first_name,
        last_name: last_name,
        email: email,
        role: role,
        avatar: avatar,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong");
    }

    showToast(`${capitalize(role)} account successfully created!`);
    // Clear form fields
    if (role === "admin") {
      document.getElementById("adminFirstName").value = "";
      document.getElementById("adminLastName").value = "";
      document.getElementById("adminEmail").value = "";
    } else {
      document.getElementById("employeeFirstName").value = "";
      document.getElementById("employeeLastName").value = "";
      document.getElementById("employeeEmail").value = "";
    }

    closeModal(modal);

    // Refresh the user grid to show the new user
    const activeTab = document.querySelector(".tab-btn.active");
    if (activeTab) {
      activeTab.click(); // Trigger reload of current tab
    }
  } catch (err) {
    console.error(err);
    showToast(err.message, true);
  } finally {
    button.disabled = false;
    spinner.style.display = "none";
    btnText.textContent = "Create";
  }
};

const closeModal = (modal) => {
  modal.style.display = "none";
};

const validateAdminForm = () => {
  const firstName = document.getElementById("adminFirstName").value.trim();
  const lastName = document.getElementById("adminLastName").value.trim();
  const email = document.getElementById("adminEmail").value.trim();
  const createBtn = document.getElementById("createAdmin");

  const isValid = firstName && lastName && email;
  createBtn.disabled = !isValid;

  return isValid;
};

const validateEmployeeForm = () => {
  const firstName = document.getElementById("employeeFirstName").value.trim();
  const lastName = document.getElementById("employeeLastName").value.trim();
  const email = document.getElementById("employeeEmail").value.trim();
  const createBtn = document.getElementById("createEmployee");

  const isValid = firstName && lastName && email;
  createBtn.disabled = !isValid;

  return isValid;
};
