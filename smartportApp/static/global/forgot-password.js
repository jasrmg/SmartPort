document.addEventListener("DOMContentLoaded", () => {
  // FORGOT PASSWORD
  const forgotPasswordBtn = document.getElementById("forgot-password-btn");
  const forgotPasswordModal = document.getElementById("forgotPasswordModal");
  const forgotPasswordCloseBtn = document.getElementById(
    "close-forgot-password"
  );
  const forgotPasswordCancelBtn = document.getElementById(
    "cancel-forgot-password"
  );
  // OPEN FORGOT PASSWORD MODAL
  forgotPasswordBtn.addEventListener("click", () => {
    forgotPasswordModal.style.display = "flex";
  });

  // CLOSE FORGOT PASSWORD MODAL
  const forgotPasswordCloseBtns = [
    forgotPasswordCancelBtn,
    forgotPasswordCloseBtn,
  ];
  forgotPasswordCloseBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      forgotPasswordModal.style.display = "none";
    });
  });
  // CLOSE WHEN CLICKING OUTSIDE
  window.addEventListener("click", (e) => {
    if (e.target === forgotPasswordModal) {
      forgotPasswordModal.style.display = "none";
    }
  });

  // RESET PASSWORD LOGIC:
  // Firebase: Send password reset email
  document
    .getElementById("forgot-password-form")
    .addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = document.getElementById("reset-email").value.trim();
      const btnText = forgotPasswordModal.querySelector(".btn-text");
      const btnSpinner = forgotPasswordModal.querySelector(".spinner");
      console.log(btnSpinner);

      const sendBtn = document.getElementById("send-reset-email");
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (email === "") {
        showResetStatus("Please enter your email!", "error");
        // statusMsg.textContent = "Please enter your email!";
        return;
      }
      if (!isValidEmail) {
        showResetStatus("Invalid Email! Please try again.", "error");
        // statusMsg.textContent = "Invalid Email! Please try again.";
        return;
      }

      sendBtn.disabled = true;
      //
      // statusMsg.style.display = "block";
      // statusMsg.textContent = "Sending reset email...";

      try {
        btnSpinner.style.display = "inline-block";
        btnText.textContent = "Sending";
        sendBtn.disabled = true;

        const response = await fetch("/api/account/send-reset-link/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        const result = await response.json();

        if (!response.ok)
          throw new Error(result.error || "Failed to send reset link");

        btnSpinner.style.display = "none";
        btnText.textContent = "Send Reset Link";
        showResetStatus("Reset link sent! Please check your email", "success");
      } catch (error) {
        btnSpinner.display = "none";
        btnText.textContent = "Send Reset Link";
        showResetStatus(error.message || "Error sending reset link", "error");
      } finally {
        sendBtn.disabled = false;
      }

      // firebase
      //   .auth()
      //   .sendPasswordResetEmail(email)
      //   .then(() => {
      //     statusMsg.textContent =
      //       "Password reset email sent. Please check your inbox.";
      //     statusMsg.style.color = "var(--success)";
      //   })
      //   .catch((error) => {
      //     console.error("Reset email error:", error);
      //     statusMsg.textContent =
      //       error.message || "An error occurred. Please try again.";
      //     statusMsg.style.color = "var(--danger)";
      //   });
    });
});

const showResetStatus = (message, type = "error") => {
  const resetStatus = document.getElementById("reset-status");
  const resetStatusIcon = document.getElementById("reset-status-icon");
  const resetStatusMessage = document.getElementById("reset-status-msg");

  resetStatus.style.display = "flex";
  resetStatus.classList.remove("success", "error");
  resetStatus.classList.add(type);

  if (type === "success") {
    resetStatusIcon.className = "fas fa-check-circle";
  } else {
    resetStatusIcon.className = "fas fa-exclamation-circle";
  }

  resetStatusMessage.textContent = message;
};
