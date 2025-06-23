document.addEventListener("DOMContentLoaded", () => {
  // Toggle between login and signup forms
  document
    .getElementById("show-signup")
    .addEventListener("click", function (e) {
      e.preventDefault();
      document.getElementById("login-form").style.display = "none";
      document.getElementById("signup-form").style.display = "block";
      goToStep(1);
    });

  document
    .getElementById("back-to-login")
    .addEventListener("click", function (e) {
      e.preventDefault();
      document.getElementById("login-form").style.display = "block";
      document.getElementById("signup-form").style.display = "none";
      goToStep(1);
    });

  // User type selection in signup
  const userTypes = document.querySelectorAll(".user-type[data-role]");
  userTypes.forEach((type) => {
    type.addEventListener("click", function () {
      userTypes.forEach((t) => t.classList.remove("selected"));
      this.classList.add("selected");
      document.getElementById("user-role").value = this.dataset.role;
    });
  });

  // Verification method selection
  const verificationMethods = document.querySelectorAll(
    ".user-type[data-verification]"
  );
  verificationMethods.forEach((method) => {
    method.addEventListener("click", function () {
      verificationMethods.forEach((m) => m.classList.remove("selected"));
      this.classList.add("selected");
      document.getElementById("verification-type").value =
        this.dataset.verification;
    });
  });

  // Multi-step form navigation
  let currentStep = 1;
  const totalSteps = 3;

  function goToStep(step) {
    // Hide all form pages
    document.querySelectorAll(".form-page").forEach((page) => {
      page.classList.remove("active");
    });

    // Show the selected form page
    document.getElementById(`signup-step${step}`).classList.add("active");

    // Update progress steps
    document.querySelectorAll(".step").forEach((stepEl) => {
      const stepNum = parseInt(stepEl.dataset.step);
      stepEl.classList.remove("active", "completed");

      if (stepNum < step) {
        stepEl.classList.add("completed");
      } else if (stepNum === step) {
        stepEl.classList.add("active");
      }
    });

    // Update progress line
    const progressPercent = ((step - 1) / (totalSteps - 1)) * 100;
    document.getElementById(
      "progress-fill"
    ).style.width = `${progressPercent}%`;

    currentStep = step;

    // Scroll to top of form on step change
    document
      .querySelector(".form-container")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Next/Previous buttons
  document.getElementById("next-step1").addEventListener("click", function (e) {
    e.preventDefault();
    const roleValue = document.getElementById("user-role").value;
    const roleError = document.getElementById("role-error");

    if (roleValue) {
      roleError.style.display = "none";
      goToStep(2);
    } else {
      roleError.style.display = "flex";
    }
  });

  document.getElementById("next-step2").addEventListener("click", function (e) {
    e.preventDefault();
    if (validateStep(2)) {
      goToStep(3);
    }
  });

  document.getElementById("prev-step2").addEventListener("click", function (e) {
    e.preventDefault();
    goToStep(1);
  });

  document.getElementById("prev-step3").addEventListener("click", function (e) {
    e.preventDefault();
    goToStep(2);
  });

  // Form validation for each step
  function validateStep(step) {
    let isValid = true;

    if (step === 2) {
      const firstName = document.getElementById("signup-firstname").value;
      const lastName = document.getElementById("signup-lastname").value;
      const email = document.getElementById("signup-email").value;
      const password = document.getElementById("signup-password").value;
      const confirm = document.getElementById("signup-confirm").value;

      const errorBox = document.getElementById("signup-error");
      const errorMessage = errorBox.querySelector(".error-message");

      // Clear previous errors
      [
        "signup-firstname",
        "signup-lastname",
        "signup-email",
        "signup-password",
        "signup-confirm",
      ].forEach((id) => {
        document.getElementById(id).classList.remove("field-error");
      });

      if (!firstName || !lastName || !email || !password || !confirm) {
        errorMessage.textContent = "Please fill in all required fields.";
        errorBox.style.display = "flex";

        if (!firstName)
          document
            .getElementById("signup-firstname")
            .classList.add("field-error");
        if (!lastName)
          document
            .getElementById("signup-lastname")
            .classList.add("field-error");
        if (!email)
          document.getElementById("signup-email").classList.add("field-error");
        if (!password)
          document
            .getElementById("signup-password")
            .classList.add("field-error");
        if (!confirm)
          document
            .getElementById("signup-confirm")
            .classList.add("field-error");

        isValid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errorMessage.textContent = "Please enter a valid email address.";
        errorBox.style.display = "flex";
        document.getElementById("signup-email").classList.add("field-error");
        isValid = false;
      } else if (password !== confirm) {
        errorMessage.textContent = "Passwords do not match.";
        errorBox.style.display = "flex";
        document.getElementById("signup-password").classList.add("field-error");
        document.getElementById("signup-confirm").classList.add("field-error");
        isValid = false;
      } else if (password.length < 8) {
        errorMessage.textContent = "Password must be at least 8 characters.";
        errorBox.style.display = "flex";
        document.getElementById("signup-password").classList.add("field-error");
        isValid = false;
      } else {
        errorBox.style.display = "none";
      }

      [
        "signup-firstname",
        "signup-lastname",
        "signup-email",
        "signup-password",
        "signup-confirm",
      ].forEach((id) => {
        const input = document.getElementById(id);
        input.addEventListener("focus", () => {
          input.classList.remove("field-error");
        });
      });
    }

    return isValid;
  }

  // Password toggle functionality
  document.querySelectorAll(".password-toggle").forEach((toggle) => {
    toggle.addEventListener("click", function () {
      const passwordInput = this.previousElementSibling;
      const isPassword = passwordInput.type === "password";

      passwordInput.type = isPassword ? "text" : "password";
      this.classList.toggle("fa-eye-slash");
      this.classList.toggle("fa-eye");
      this.style.color = isPassword ? "var(--accent)" : "var(--secondary)";
    });
  });

  /* ------------- FINAL VERIFICATION ------------- */
  document
    .getElementById("signup-step3")
    .addEventListener("submit", function (e) {
      e.preventDefault(); // prevent actual form submission

      let isValid = true;

      const verificationInput = document.getElementById("verification-type");
      const termsCheckbox = document.getElementById("terms-agree");

      const errorBox = document.getElementById("signup-step3-error");
      const errorMessage = errorBox.querySelector(".error-message");

      // Reset error visibility
      errorBox.style.display = "none";

      // Check verification method
      if (!verificationInput.value) {
        errorMessage.textContent = "Please select a verification method.";
        errorBox.style.display = "flex";
        isValid = false;
        return; // Stop further checks
      }

      // Check if terms are agreed to
      if (!termsCheckbox.checked) {
        errorMessage.textContent =
          "You must agree to the Terms and Privacy Policy.";
        errorBox.style.display = "flex";
        isValid = false;
        return;
      }

      // If everything is valid
      if (isValid) {
        errorBox.style.display = "none";
        console.log("Form is valid. Proceeding to submit...");
        // this.submit(); // Or trigger AJAX here
      }
    });

  // /* ------------- VERIFICATION ------------- */
  const verificationOptions = document.querySelectorAll(
    "#verification-method .user-type"
  );
  const verificationInput = document.getElementById("verification-type");
  const phoneGroup = document.getElementById("phone-number-group");

  // Hide the phone field by default
  phoneGroup.style.display = "none";

  // Add click event to each option
  verificationOptions.forEach((option) => {
    option.addEventListener("click", () => {
      // Update hidden input
      const method = option.getAttribute("data-verification");
      verificationInput.value = method;

      // Toggle active styling (optional but common UX)
      verificationOptions.forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");

      // Show/hide phone number input
      if (method === "sms") {
        phoneGroup.style.display = "block";
      } else {
        phoneGroup.style.display = "none";
      }
    });
  });

  /* ------------- EULA MODAL ------------- */
  // Open modal
  document.getElementById("eula").addEventListener("click", function (e) {
    e.preventDefault();
    document.getElementById("eula-modal").style.display = "flex";
  });

  // Close modal (top or bottom)
  document
    .getElementById("eula-close-top")
    .addEventListener("click", function () {
      document.getElementById("eula-modal").style.display = "none";
    });
  document
    .getElementById("eula-close-bottom")
    .addEventListener("click", function () {
      document.getElementById("eula-modal").style.display = "none";
    });

  // Agree button checks the box and closes modal
  document.getElementById("eula-agree").addEventListener("click", function () {
    document.getElementById("terms-agree").checked = true;
    document.getElementById("eula-modal").style.display = "none";
  });

  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document.getElementById("eula-modal").style.display = "none";
    }
  });

  document.getElementById("eula-modal").addEventListener("click", function (e) {
    const modalContent = document.querySelector(".modal-content");
    if (!modalContent.contains(e.target)) {
      this.style.display = "none";
    }
  });

  document.getElementById("eula-modal").addEventListener("click", function (e) {
    if (e.target === this) {
      this.style.display = "none";
    }
  });

  // Form submissions
});
