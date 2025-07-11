document.addEventListener("DOMContentLoaded", function () {
  // ---------------- REPORT INCIDENT MODAL ----------------
  const reportModalBtn = document.getElementById("reportPrompt");
  if (!reportModalBtn) return;
  const reportModal = document.getElementById("incidentReportModal");
  const closeReportModal = document.getElementById("closeIncidentModal");
  const cancelReportModal = document.getElementById("cancelIncidentBtn");
  const submitReportBtn = document.getElementById("submitIncidentBtn");

  // OPEN THE MODAL
  reportModalBtn.addEventListener("click", () => {
    resetIncidentModal();
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
  cancelReportModal.addEventListener("click", () => {
    const confirmCancel = confirm(
      "Are you sure you want to discard this report?"
    );
    if (confirmCancel) {
      reportModal.style.display = "none";
    }
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

  // SUBMIT LOGIC:
  submitReportBtn.addEventListener("click", async () => {
    const statusMessage = document.querySelector(".status-message");
    const statusText = document.querySelector(".status-message-text");
    const spinner = submitReportBtn.querySelector(".spinner");

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

    spinner.style.display = "inline-block";
    submitReportBtn.disabled = true;

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
      const feed = document.getElementById("incidentFeed");

      if (result.success) {
        if (!result.incident) {
          console.error("Missing incident in response:", result);
          showStatus("Server returned an invalid incident report.", false);
          return;
        }

        showStatus("Incident Report submitted successfully!", true);
        resetIncidentModal();
        spinner.style.display = "none";

        const cardHTML = buildIncidentCard(result.incident);
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = cardHTML;
        const newCard = tempDiv.firstElementChild;

        const approvedCards = feed.querySelectorAll(".incident-card");
        let inserted = false;

        for (let card of approvedCards) {
          const isApproved = card.querySelector(".btn-approve") === null; // if there's no approve btn, it's approved
          if (isApproved) {
            card.before(newCard);
            inserted = true;
            break;
          }
        }

        if (!inserted) {
          feed.appendChild(newCard);
        }

        updateCarouselControls(newCard);
        attachImagePreviewListeners(
          document.getElementById("fullscreenImageWrapper"),
          document.getElementById("fullscreenImage")
        );
      } else {
        showStatus(result.error || "Submission failed", false);
      }
    } catch (error) {
      console.error("Error submitting incident: ", error);
      showStatus("Server error occured.", false);
      submitReportBtn.disabled = false;
    } finally {
      submitReportBtn.disabled = false;
      spinner.style.display = "none";
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
