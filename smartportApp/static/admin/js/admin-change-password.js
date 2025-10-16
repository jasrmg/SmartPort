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
        return showToast("Passwords do not match!", true);
      }
      if (newPassword.length < 8) {
        return showToast("New password must be at least 8 characters!", true);
      }

      //show spinner:
      spinner.style.display = "inline-block";
      btnText.textContent = "Updating";

      firebase.auth().onAuthStateChanged(async function (user) {
        if (!user) {
          showToast("No user signed in.", true);
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
            showToast(result.error || "Password update failed", true);

          showToast("Password successfully changed!");

          document.getElementById("changePasswordForm").reset();
          document.getElementById("changePasswordModal").style.display = "none";
        } catch (error) {
          if (error.code === "auth/invalid-credential") {
            showToast("Old password is incorrect.", true);
          }
        } finally {
          spinner.style.display = "none";
          btnText.textContent = "Update";
        }
      });
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
const clearResetStatus = () => {
  document.getElementById("changepassword-status").style.display = "none";
};
