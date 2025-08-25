document.addEventListener("DOMContentLoaded", () => {
  // ------------------ LOGIN LOGIC ------------------
  const loginErrorDiv = document.getElementById("login-error");
  const loginErrorMsg = document.getElementById("login-error-msg");
  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");

  const showLoginError = (message) => {
    loginErrorMsg.textContent = message;
    loginErrorDiv.style.display = "flex";
  };

  const clearLoginError = () => {
    loginErrorDiv.style.display = "none";
    loginEmail.classList.remove("field-error");
    loginPassword.classList.remove("field-error");
  };

  document
    .getElementById("login")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;
      const loginBtn = this.querySelector("button[type='submit']");
      const originalText = this.querySelector("span.btn-text");
      const loginSpinner = this.querySelector("span.spinner");

      loginBtn.disabled = true;
      originalText.textContent = "Logging in";
      loginSpinner.style.display = "inline-block";

      console.log("EMAIL: ", email);
      console.log("PASSWORD: ", password);
      clearLoginError();

      try {
        const userCredential = await firebase
          .auth()
          .signInWithEmailAndPassword(email, password);

        const user = userCredential.user;

        if (!user.emailVerified) {
          showLoginError("Please verify your email before logging in");
          return;
        }

        const token = await user.getIdToken(true);
        localStorage.setItem("firebaseToken", token); //ambot nagamit ba hahaha
        try {
          const response = await fetch("/api/account/firebase-login/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          const result = await response.json();
          console.log("BACKEND LOGIN RESPONSE: ", result);

          if (!response.ok)
            throw new Error("Backend failed to authorize login.");

          // REDIRECT THE USER DIRI ILISANAN IG REDIRECT SA LOG IN:
          // LOG IN DIRI
          const userRole = result.role;
          if (userRole === "admin") {
            window.location.href = "/admin-dashboard/";
          } else if (userRole === "custom") {
            window.location.href = "/customs/dashboard/";
          } else if (userRole === "shipper") {
            window.location.href = "/shipper-dashboard/";
          } else {
            window.location.href = "/employee-dashboard/";
          }
        } catch (backendError) {
          console.error("Backend login error: ", backendError);
          showLoginError("Login failed. Please try again later.");
        }
      } catch (firebaseError) {
        console.error("Login error: ", firebaseError);
        console.log("Error code: ", firebaseError.code);
        // FIREBASE ERROR CODES:
        if (firebaseError.code === "auth/user-not-found") {
          showLoginError("No user found with that email");
        } else if (firebaseError.code === "auth/wrong-password") {
          showLoginError("Incorrect password. Please try again.");
        } else if (firebaseError.code === "auth/too-many-requests") {
          showLoginError("Too many failed attempts. Try again later.");
        } else if (firebaseError.code === "auth/invalid-email") {
          showLoginError("Wrong email format");
        } else {
          showLoginError("Login failed. Please check your credentials.");
        }
      } finally {
        loginBtn.disabled = false;
        originalText.textContent = "Login";
        loginSpinner.style.display = "none";
      }
    });

  // ------------------ END OF LOGIN LOGIC ------------------
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

      const selectedRole = this.dataset.role;
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

  const getUserInfo = () => {
    return {
      firstName: document.getElementById("signup-firstname").value,
      lastName: document.getElementById("signup-lastname").value,
      email: document.getElementById("signup-email").value,
      password: document.getElementById("signup-password").value,
      confirm: document.getElementById("signup-confirm").value,
      role: document.getElementById("user-role").value,
    };
  };

  // Form validation for each step
  function validateStep(step) {
    let isValid = true;

    if (step === 2) {
      const { firstName, lastName, email, password, confirm } = getUserInfo();

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

  //test
  // document.getElementById("testBtn").addEventListener("click", () => {
  //   const { firstName, lastName, email, password, confirm, role } =
  //     getUserInfo();
  //   console.log("test fn: ", firstName);
  //   console.log("test ln: ", lastName);
  //   console.log("test e: ", email);
  //   console.log("test p: ", password);
  //   console.log("test cp: ", confirm);
  //   console.log("test r: ", role);
  // });

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

  /* ------------- FINAL VERIFICATION SIGN UP ------------- */
  document
    .getElementById("signup-form")
    .addEventListener("submit", async function (e) {
      e.preventDefault();
      const submitBtn = document.querySelector(
        "#signup-form button[type='submit']"
      );

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
        return;
      }

      // Check if terms are agreed to
      if (!termsCheckbox.checked) {
        errorMessage.textContent =
          "You must agree to the Terms and Privacy Policy.";
        errorBox.style.display = "flex";
        return;
      }

      const btnText = submitBtn.querySelector(".btn-text");
      const spinner = submitBtn.querySelector(".spinner");

      submitBtn.disabled = true;
      btnText.textContent = "Processing";
      spinner.style.display = "inline-block";
      // Proceed if valid
      try {
        // RETRIEVE USER DATA:
        const { firstName, lastName, email, password } = getUserInfo();

        const userCredential = await firebase
          .auth()
          .createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        const token = await user.getIdToken(true);
        // EMAIL VERIFICATION
        await fetch("/api/account/send-custom-verification-email/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
          }),
        });

        showVerifyModal();
      } catch (error) {
        console.error(error.message);
        errorMessage.textContent = error.message;
        errorBox.style.display = "flex";
      } finally {
        // keep the button disabled until modal is shown
        submitBtn.textContent = "Complete Registration";
        submitBtn.disabled = false;
        spinner.style.display = "none";
      }
    });

  /* ------------ COOLDOWN FOR RESET -------------- */
  const startCooldown = (button, duration) => {
    const btnText = button.querySelector(".btn-text");
    const btnSpinner = button.querySelector(".spinner");

    let seconds = duration;
    const originalText = button.id === "resend-btn" ? "Resend" : "Verify";
    console.log("BUTTON TEXT: ", originalText);
    btnSpinner.style.display = "none";
    btnText.textContent = `${originalText} (${seconds})`;

    // Disable both buttons
    const verifyBtn = document.getElementById("verify-btn");
    const resendBtn = document.getElementById("resend-btn");
    verifyBtn.disabled = true;
    resendBtn.disabled = true;

    const countdown = setInterval(() => {
      console.log("SECONDS: ", seconds);
      seconds--;
      btnText.textContent = `${originalText} (${seconds})`;
      if (seconds <= 0) {
        clearInterval(countdown);
        verifyBtn.disabled = false;
        resendBtn.disabled = false;
        btnText.textContent = originalText;
      }
    }, 1000);
  };
  const showVerifyModal = () => {
    const verificationModal = document.getElementById("email-verify-modal");
    verificationModal.style.display = "flex";
    const verifyOKBtn = document.getElementById("verify-btn");
    const btnText = verifyOKBtn.querySelector(".btn-text");
    const btnSpinner = verifyOKBtn.querySelector(".spinner");

    verifyOKBtn.addEventListener("click", async function () {
      try {
        verifyOKBtn.disabled = true;
        btnText.textContent = "Processing";
        btnSpinner.style.display = "inline-block";

        const user = firebase.auth().currentUser;
        if (!user) {
          console.error("No authenticated user found!");
          return;
        }

        await user.reload();

        const verifyModalTitle = document.getElementById("verify-modal-title");
        const verifyModalBody = document.getElementById("verify-modal-message");
        if (user.emailVerified) {
          //update modal
          verifyModalTitle.classList.remove("modal-error");
          verifyModalTitle.textContent = "Success!";
          verifyModalBody.textContent = "Email verified logging you in...";

          const token = await user.getIdToken(true);
          const userInfo = getUserInfo();

          let avatar = "";
          if (userInfo.role === "admin") {
            avatar = `${window.location.origin}/media/avatars/default_admin.jfif`;
          } else if (userInfo.role === "custom") {
            avatar = `${window.location.origin}/media/avatars/default_custom.jfif`;
          } else if (userInfo.role === "shipper") {
            avatar = `${window.location.origin}/media/avatars/default_shipper.jfif`;
          } else if (userInfo.role === "employee") {
            avatar = `${window.location.origin}/media/avatars/default_employee.jfif`;
          } else {
            avatar = `${window.location.origin}/media/avatars/default.png`;
          }

          // INITIALIZE FIRESTORE:
          const db = firebase.firestore();
          // ADD FIRESTORE DETAILS:
          await db.collection("users").doc(user.uid).set({
            first_name: userInfo.firstName,
            last_name: userInfo.lastName,
            email: user.email,
            role: userInfo.role,
            avatar: avatar,
          });

          //register to the backend MYSQL:
          await fetch("/api/account/firebase-register/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              first_name: userInfo.firstName,
              last_name: userInfo.lastName,
              email: userInfo.email,
              role: userInfo.role,
              avatar: avatar,
            }),
          });

          // LOGIN TO BACKEND SESSION:
          const loginResponse = await fetch("/api/account/firebase-login/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (!loginResponse.ok) {
            throw new Error("Failed to log in user on the backend");
          }

          // REDIRECT THE USER:
          if (userInfo.role === "admin") {
            window.location.href = "/admin-dashboard/";
          } else if (userInfo.role === "custom") {
            window.location.href = "/dashboard/";
          } else if (userInfo.role === "shipper") {
            window.location.href = "/shipper-dashboard/";
          } else {
            window.location.href = "/employee-dashboard/";
          }
        } else {
          verifyModalTitle.classList.add("modal-error");
          verifyModalTitle.textContent = "Error!";
          verifyModalBody.textContent =
            "Still not verified, please check your email inbox!";
          verifyOKBtn.disabled = false;
          btnText.textContent = "Verify";
          startCooldown(verifyOKBtn, 30);
        }
      } catch (error) {
        console.error("verify btn error: ", error);
      } finally {
        console.log("FINALLY VERIFY");
        btnText.textContent = "Verify";
        btnSpinner.style.display = "none";
      }
    });

    /* ------------ RESEND BUTTON -------------- */
    const resendBtn = document.getElementById("resend-btn");
    resendBtn.addEventListener("click", async () => {
      const btnText = resendBtn.querySelector(".btn-text");
      const btnSpinner = resendBtn.querySelector(".spinner");
      try {
        resendBtn.disabled = true;
        btnText.textContent = "Processing";
        btnSpinner.style.display = "inline-block";
        const user = firebase.auth().currentUser;
        if (!user) {
          console.error("No authenticated user found!");
          return;
        }
        const token = await user.getIdToken(true);
        const userInfo = getUserInfo();

        await fetch("/api/account/resend-verification/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            first_name: userInfo.firstName,
            last_name: userInfo.lastName,
          }),
        });
        const verifyModalTitle = document.getElementById("verify-modal-title");
        const verifyModalBody = document.getElementById("verify-modal-message");
        verifyModalTitle.textContent = "Verification Resent";
        verifyModalBody.textContent =
          "Verification email resent. Please check your inbox.";
      } catch (error) {
        console.error("resend btn error: ", error);
      } finally {
        console.log("finally");
        startCooldown(resendBtn, 30);
      }
    });
  };

  /* ------------- VERIFICATION ------------- */
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
});
