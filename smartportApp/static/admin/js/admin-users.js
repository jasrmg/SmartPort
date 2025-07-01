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
      button.addEventListener("click", async () => {
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

            // Attach click listener immediately to open the user detail modal
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
      closeModal(e.target);
    }
  });
});

// OUTSIDE DOM
const capitalize = (word) => {
  return word.charAt(0).toUpperCase() + word.slice(1);
};
