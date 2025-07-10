document.addEventListener("DOMContentLoaded", function () {
  // Sidebar toggle functionality
  const sidebar = document.querySelector(".sidebar");
  const mainContent = document.querySelector(".main-content");
  const collapseBtn = document.querySelector(".collapse-btn");

  collapseBtn.addEventListener("click", function () {
    sidebar.classList.toggle("sidebar-collapsed");
    mainContent.classList.toggle("expanded");
  });

  // Navigation item expand/collapse
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((item) => {
    const link = item.querySelector(".nav-link");
    if (item.querySelector(".nav-sub-menu")) {
      link.addEventListener("click", function (e) {
        if (sidebar.classList.contains("sidebar-collapsed")) return;
        e.preventDefault();

        // Close all other expanded items
        navItems.forEach((otherItem) => {
          if (otherItem !== item && otherItem.classList.contains("expanded")) {
            otherItem.classList.remove("expanded");
          }
        });

        // Toggle current item
        item.classList.toggle("expanded");
      });
    }
  });

  // ---------------- REPORT INCIDENT MODAL ----------------
  const reportModalBtn = document.getElementById("reportPrompt");
  const reportModal = document.getElementById("incidentReportModal");
  const closeReportModal = document.getElementById("closeIncidentModal");
  const cancelReportModal = document.getElementById("cancelIncidentBtn");
  const submitReportBtn = document.getElementById("submitIncidentBtn");

  // OPEN THE MODAL
  reportModalBtn.addEventListener("click", () => {
    reportModal.style.display = "flex";
  });
  // CLOSE THE MODAL
  const closeReportModalBtns = [closeReportModal, cancelReportModal];
  closeReportModalBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      reportModal.style.display = "none";
    });
  });
  window.addEventListener("click", (e) => {
    if (e.target === reportModal) {
      reportModal.style.display = "none";
    }
  });

  // SHOW THE INPUT FIELD IF THE INCIDENT TYPE IS OTHERS:
  document
    .getElementById("incidentType")
    .addEventListener("change", function () {
      const otherGroup = document.getElementById("otherIncidentTypeGroup");
      if (this.value === "others") {
        otherGroup.style.display = "block";
      } else {
        otherGroup.style.display = "none";
      }
    });
  // SHOW IMAGE PREVIEW WHEN UPLOADING:
  const imageInput = document.getElementById("incidentImage");
  const previewContainer = document.getElementById("imagePreviewContainer");

  imageInput.addEventListener("change", function () {
    previewContainer.innerHTML = ""; // clear previous previews

    const files = Array.from(this.files);
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = function (e) {
        const img = document.createElement("img");
        img.src = e.target.result;
        previewContainer.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });

  // RESOLUTION MODAL:
  document.querySelectorAll(".incident-card").forEach((card) => {
    const dropdown = card.querySelector(".status-dropdown");

    dropdown.addEventListener("change", (e) => {
      if (e.target.value === "Resolved") {
        document.getElementById("resolutionModal").style.display = "flex";

        // Optional: Save reference for use on modal save
        document.getElementById("resolutionModal").dataset.cardId =
          card.dataset.cardId || "";
      }
    });
  });
  // Handle resolution modal close
  document
    .getElementById("closeResolutionModal")
    .addEventListener("click", () => {
      document.getElementById("resolutionModal").style.display = "none";
    });

  document
    .getElementById("cancelResolutionBtn")
    .addEventListener("click", () => {
      document.getElementById("resolutionModal").style.display = "none";
    });

  // Save resolution (example handler)
  document.getElementById("saveResolutionBtn").addEventListener("click", () => {
    const resolutionText = document
      .getElementById("resolutionDescription")
      .value.trim();

    if (!resolutionText) {
      alert("Please describe how the issue was resolved.");
      return;
    }

    // You can fetch the related card ID here if needed
    const relatedCardId =
      document.getElementById("resolutionModal").dataset.cardId;

    // Process resolution logic here...

    document.getElementById("resolutionModal").style.display = "none";
  });

  // CAROUSEL FOR IMAGE:
  const images = document.querySelectorAll(".incident-image");
  const leftBtn = document.querySelector(".left-btn");
  const rightBtn = document.querySelector(".right-btn");
  let currentImage = 0;

  function updateCarousel(index) {
    images.forEach((img, i) => {
      img.classList.toggle("active", i === index);
    });

    // Show/hide buttons based on current index
    leftBtn.style.display = index === 0 ? "none" : "flex";
    rightBtn.style.display = index === 3 - 1 ? "none" : "flex";
    console.log(images.length);
  }

  // Initial call
  updateCarousel(currentImage);

  // Button listeners
  leftBtn.addEventListener("click", () => {
    if (currentImage > 0) {
      currentImage--;
      updateCarousel(currentImage);
    }
  });

  rightBtn.addEventListener("click", () => {
    if (currentImage < images.length - 1) {
      currentImage++;
      updateCarousel(currentImage);
    }
  });

  // FULL SCREEN WHEN IMAGE IS CLICK
  const incidentImages = document.querySelectorAll(".incident-image");
  const fullscreenWrapper = document.getElementById("fullscreenImageWrapper");
  const fullscreenImg = document.getElementById("fullscreenImage");
  const closeBtn = document.querySelector(".close-fullscreen");

  incidentImages.forEach((img) => {
    img.addEventListener("click", () => {
      fullscreenImg.src = img.src;
      fullscreenWrapper.style.display = "flex";
    });
  });

  closeBtn.addEventListener("click", () => {
    fullscreenWrapper.style.display = "none";
    fullscreenImg.src = ""; // clear image
  });

  // Optional: click outside image to close
  fullscreenWrapper.addEventListener("click", (e) => {
    if (e.target === fullscreenWrapper) {
      fullscreenWrapper.style.display = "none";
      fullscreenImg.src = "";
    }
  });
});
