document.addEventListener("DOMContentLoaded", function () {
  // ---------------- REPORT INCIDENT MODAL ----------------
  const reportModalBtn = document.getElementById("reportPrompt");
  const reportModal = document.getElementById("incidentReportModal");
  const closeReportModal = document.getElementById("closeIncidentModal");
  const cancelReportModal = document.getElementById("cancelIncidentBtn");
  const submitReportBtn = document.getElementById("submitIncidentBtn");

  // OPEN THE MODAL
  reportModalBtn.addEventListener("click", () => {
    reportModal.style.display = "flex";
    populateVesselDropdown();
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
      if (this.value === "other") {
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

    document.getElementById("resolutionModal").style.display = "none";
  });

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

  // SUBMIT LOGIC:
  submitReportBtn.addEventListener("click", async () => {
    const statusMessage = document.querySelector(".status-message");
    const statusText = document.querySelector(".status-message-text");
    const spinner = submitReportBtn.querySelector(".spinner");
    spinner.style.display = "inline-block";
    submitReportBtn.disabled = true;
    // gather form data:
    const location = document.getElementById("incidentLocation").value.trim();
    const type = document.getElementById("incidentType").value;
    const otherType = document.getElementById("otherIncidentType").value.trim();
    const description = document
      .getElementById("incidentDescription")
      .value.trim();
    const vessel = document.getElementById("incidentVessel").value;

    if (!location || !type || !description) {
      showStatus("Please fill in all required fields.", false);
      return;
    }

    if (type === "other" && !otherType) {
      showStatus("Please specify the incident type.", false);
      return;
    }

    const formData = new FormData();
    formData.append("location", location);
    formData.append("incident_type", type);
    formData.append("other_incident_type", otherType);
    formData.append("description", description);
    formData.append("vessel_name", vessel);

    const files = imageInput.files;
    for (let i = 0; i < files.length; i++) {
      formData.append("images", files[i]);
    }

    try {
      const response = await fetch("/submit-incident/", {
        method: "POST",
        headers: {
          "X-CSRFToken": csrftoken,
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        showStatus("Incident Report submitted successfully!", true);
        resetIncidentModal();
        spinner.style.display = "none";
        // to do: insert in feed
      } else {
        showStatus(result.error || "Submission failed", false);
      }
    } catch (error) {
      console.error("Error submitting incident: ", error);
      showStatus("Server error occured.", false);
      submitReportBtn.disabled = false;
    } finally {
      submitReportBtn.disabled = false;
    }
  });

  const resetIncidentModal = () => {
    // Clear form
    document.getElementById("incidentType").selectedIndex = 0;
    document.getElementById("incidentLocation").value = "";
    document.getElementById("otherIncidentType").value = "";
    document.getElementById("incidentDescription").value = "";
    document.getElementById("incidentVessel").value = "";
    document.getElementById("incidentImage").value = "";

    // Hide conditional fields and image previews
    document.getElementById("otherIncidentTypeGroup").style.display = "none";
    previewContainer.innerHTML = "";

    // Close modal
    reportModal.style.display = "none";
  };
});

// OUTSIDE DOM
const populateVesselDropdown = async () => {
  const dropdown = document.getElementById("incidentVessel");

  // Clear previous options except default
  dropdown.innerHTML = `<option value="">-- Select Vessel --</option>`;

  try {
    const response = await fetch("/get-vessels/");
    const result = await response.json();

    if (result.vessels && Array.isArray(result.vessels)) {
      result.vessels.forEach((vessel) => {
        const option = document.createElement("option");
        option.value = vessel.name;
        option.textContent = vessel.name;
        dropdown.appendChild(option);
      });
    } else {
      console.warn("Unexpected response:", result);
    }
  } catch (err) {
    console.error("Failed to fetch vessels:", err);
  }
};

// CAROUSEL FOR IMAGE:
const images = document.querySelectorAll(".incident-image");
const leftBtn = document.querySelector(".left-btn");
const rightBtn = document.querySelector(".right-btn");
let currentImage = 0;
const updateCarousel = (index) => {
  images.forEach((img, i) => {
    img.classList.toggle("active", i === index);
  });

  // Show/hide buttons based on current index
  leftBtn.style.display = index === 0 ? "none" : "flex";
  rightBtn.style.display = index === images.length - 1 ? "none" : "flex";
  console.log(images.length);
};

const showStatus = (message, isSuccess = true) => {
  const statusMessage = document.querySelector(".status-message");
  const statusText = document.querySelector(".status-message-text");

  statusText.textContent = message;
  statusMessage.style.backgroundColor = isSuccess ? "#10b981" : "#d14343";
  statusMessage.style.display = "flex";

  setTimeout(() => {
    statusMessage.style.display = "none";
  }, 2500);
};
