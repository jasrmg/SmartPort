// Toggle between login and signup forms
document.getElementById("show-signup").addEventListener("click", function (e) {
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
  document.getElementById("progress-fill").style.width = `${progressPercent}%`;

  // Show/hide role-specific fields when going to step 2
  if (step === 2) {
    const role = document.getElementById("user-role").value;
    document.getElementById("admin-fields").style.display = "none";
    document.getElementById("shipper-fields").style.display = "none";
    document.getElementById("customs-fields").style.display = "none";
    document.getElementById("employee-fields").style.display = "none";

    if (role) {
      document.getElementById(`${role}-fields`).style.display = "block";
    }
  }

  currentStep = step;

  // Scroll to top of form on step change
  document
    .querySelector(".form-container")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}

// Next/Previous buttons
document.getElementById("next-step1").addEventListener("click", function (e) {
  e.preventDefault();
  if (document.getElementById("user-role").value) {
    goToStep(2);
  } else {
    alert("Please select your user role");
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

    if (!firstName || !lastName || !email || !password || !confirm) {
      alert("Please fill in all required fields");
      isValid = false;
    } else if (password !== confirm) {
      alert("Passwords do not match");
      isValid = false;
    } else if (password.length < 8) {
      alert("Password must be at least 8 characters");
      isValid = false;
    }

    // Role-specific validation has been removed since those fields are no longer required
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

// Form submissions
document.getElementById("login").addEventListener("submit", function (e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  // Check if input fields are filled
  if (email && password) {
    // Authenticate based on credentials
    if (email === "admin@gmail.com" && password === "admin123456") {
      // Redirect to admin dashboard
      window.location.href = "admin side/admin-dashboard.html";
    } else if (email === "shipper@gmail.com" && password === "shipper123456") {
      // Redirect to shipper dashboard
      window.location.href = "shipper side/view-vessels.html";
    } else if (email === "custom@gmail.com" && password === "custom123456") {
      // Redirect to custom dashboard
      window.location.href = "custom side/custom-dashboard.html";
    } else if (
      email === "employee@gmail.com" &&
      password === "employee123456"
    ) {
      // Redirect to employee dashboard
      window.location.href = "employee side/employee-dashboard.html";
    } else {
      alert("Invalid email or password");
    }
  } else {
    alert("Please fill in all required fields");
  }
});

document
  .getElementById("signup-step3")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    const terms = document.getElementById("terms-agree").checked;
    const verification = document.getElementById("verification-type").value;

    if (!terms) {
      alert("You must agree to the terms and conditions");
      return;
    }

    if (!verification) {
      alert("Please select a verification method");
      return;
    }

    const role = document.getElementById("user-role").value;
    // Redirect to admin dashboard after successful signup
    window.location.href = "admin-dashboard.html";
  });
