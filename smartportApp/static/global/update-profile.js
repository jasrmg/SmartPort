document.addEventListener("DOMContentLoaded", () => {
  console.log("hell");
  /* ------------------------------- UPDATE PROFILE GLOBAL LOGIC -------------------------------*/
  const form = document.getElementById("editProfileForm");
  const avatarInput = document.getElementById("avatarUpload");
  const firstNameInput = document.getElementById("firstName");
  const lastNameInput = document.getElementById("lastName");
  const spinner = form.querySelector(".spinner");
  const btnText = form.querySelector(".btn-text");

  //form submission:
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
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
          document.getElementById("editProfileModal").style.display = "none";
          /* UPDATE THE DOM AFTER */
        }
        spinner.style.display = "none";
        btnText.textContent = "Update";
      });
    } catch (error) {
      showProfileUpdateStatus(error.message, "error");
    }
  });
});

/* OUTSIDE DOMCONTENT */
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
