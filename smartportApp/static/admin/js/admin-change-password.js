document.addEventListener("DOMContentLoaded", () => {
  /* NAA SA ADMIN BASE ANG PAG HANDLE SA MODALS */
  document
    .getElementById("changepassword-btn")
    .addEventListener("click", async function (e) {
      e.preventDefault();
      const oldPassword = document.getElementById("oldPassword").value.trim();
      const newPassword = document.getElementById("newPassword").value.trim();
      const confirmPassword = document
        .getElementById("confirmPassword")
        .value.trim();

      const errorBox = document.getElementById("changepassword-status");
      const errorText = errorBox.querySelector(".changepassword-status-msg");
      const spinner = this.querySelector(".spinner");
      const btnText = this.querySelector(".btn-text");

      // validation:
      if (newPassword !== confirmPassword) {
        return showResetStatus("Passwords do not match!", "error");
      }
      if (newPassword.length < 8) {
        return showResetStatus(
          "New password must be at least 8 characters!",
          "error"
        );
      }

      //show spinner:
      spinner.style.display = "inline-block";
      btnText.textContent = "Updating";

      firebase.auth().onAuthStateChanged(async function (user) {
        if (!user) {
          showResetStatus("No user signed in.", "error");
          spinner.style.display = "none";
          btnText.textContent = "Update";
          return;
        }
        const email = user.email;

        try {
          const credential = firebase.auth.EmailAuthProvider.credential(
            email,
            oldPassword
          );

          await user.reauthenticateWithCredential(credential); // confirm old password
          await user.updatePassword(newPassword);

          // get id token to notify django:
          const idToken = await user.getIdToken(true);

          const response = await fetch("/api/account/notify-password-change/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ email }),
          });

          const result = await response.json();
          if (!response.ok)
            showResetStatus(result.error || "Password update failed", "error");

          showResetStatus("Password successfully changed!", "success");

          document.getElementById("changePasswordForm").reset();
        } catch (error) {
          if (error.code === "auth/invalid-credential") {
            showResetStatus("Old password is incorrect.", "error");
          }
        } finally {
          spinner.style.display = "none";
          btnText.textContent = "Update";
        }
      });
    });
});

// OUTSIDE DOM
const showResetStatus = (message, type = "error") => {
  const resetStatus = document.getElementById("changepassword-status");
  const resetStatusIcon = document.getElementById("changepassword-status-icon");
  const resetStatusMessage = document.getElementById(
    "changepassword-status-msg"
  );

  resetStatus.style.display = "flex";
  resetStatus.classList.remove("success", "error");
  resetStatus.classList.add(type);

  resetStatusIcon.className =
    type === "success" ? "fas fa-check-circle" : "fas fa-exclamation-circle";

  resetStatusMessage.textContent = message;
};

const clearResetStatus = () => {
  document.getElementById("changepassword-status").style.display = "none";
};
