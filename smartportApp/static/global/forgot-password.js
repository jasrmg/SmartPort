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
      const statusMsg = document.getElementById("reset-status");
      const sendBtn = document.getElementById("send-reset-email");

      sendBtn.disabled = true;
      statusMsg.style.display = "block";
      statusMsg.textContent = "Sending reset email...";

      try {
        const response = await fetch("/api/account/send-reset-link", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Failed to send reset link");

        statusMsg.textContent = "Reset link sent! Please check your email.";
        statusMsg.style.color = "green";
      } catch (error) {
        statusMsg.textContent = error.message || "Error sending reset link";
        statusMsg.style.color = "red";
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
