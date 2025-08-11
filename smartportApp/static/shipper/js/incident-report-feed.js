let currentSort = "newest";
let page = 2;
let isLoading = false;
let hasMore = true;

document.addEventListener("DOMContentLoaded", () => {
  // ----------------------- SUBMIT REPORT -----------------------
  const reportPrompt = document.getElementById("reportPrompt");
  const incidentModal = document.getElementById("incidentReportModal");
  const closeIncidentModal = document.getElementById("closeIncidentModal");
  const cancelIncidentBtn = document.getElementById("cancelIncidentBtn");

  reportPrompt.addEventListener("click", () => {
    incidentModal.style.display = "flex";
  });

  closeIncidentModal.addEventListener("click", () => {
    incidentModal.style.display = "none";
  });

  cancelIncidentBtn.addEventListener("click", () => {
    incidentModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === incidentModal) {
      incidentModal.style.display = "none";
    }
  });

  // ----------------------- SUBMIT REPORT FORM -----------------------
  const submitIncidentBtn = document.getElementById("submitIncidentBtn");

  submitIncidentBtn.addEventListener("click", async () => {
    const location = document.getElementById("incidentLocation").value.trim();
    const incidentType = document.getElementById("incidentType").value;
    const otherType = document.getElementById("otherIncidentType").value.trim();
    const description = document
      .getElementById("incidentDescription")
      .value.trim();
    const vesselName = document.getElementById("incidentVessel").value;
    const imageFiles = document.getElementById("incidentImage").files;

    if (!location || !incidentType || !description) {
      showToast("Please fill in all required fields.", true);
      return;
    }

    if (incidentType === "other" && !otherType) {
      showToast("Please specify the incident type.", true);
      return;
    }

    const formData = new FormData();
    formData.append("location", location);
    formData.append("incident_type", incidentType);
    formData.append("other_incident_type", otherType);
    formData.append("description", description);
    formData.append("vessel_name", vesselName);
    for (let i = 0; i < imageFiles.length; i++) {
      formData.append("images", imageFiles[i]);
    }

    try {
      submitIncidentBtn.disabled = true;
      submitIncidentBtn.querySelector(".btn-text").style.display = "none";
      submitIncidentBtn.querySelector(".spinner").style.display =
        "inline-block";

      const response = await fetch("/submit-incident/", {
        method: "POST",
        headers: {
          "X-CSRFToken": csrftoken,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // remove the no incident to show if its in the html:
        // const noResultsMsg = document.querySelector(".no-results");
        // if (noResultsMsg) {
        //   noResultsMsg.remove();
        // }
        // const cardHTML = buildIncidentCard(data.incident);
        // const feed = document.getElementById("incidentFeed");
        // feed.insertAdjacentHTML("afterbegin", cardHTML);
        // updateCarouselControls(feed.firstElementChild);
        // attachImagePreviewListeners();

        showToast("Incident report submitted successfully!");
        incidentModal.style.display = "none";
        resetIncidentForm();
      } else {
        showToast(data.error || "Submission failed", true);
      }
    } catch (err) {
      console.error("Submission failed:", err);
      showToast("An error occurred during submission", true);
    } finally {
      submitIncidentBtn.disabled = false;
      submitIncidentBtn.querySelector(".btn-text").style.display =
        "inline-block";
      submitIncidentBtn.querySelector(".spinner").style.display = "none";
    }
  });

  const resetIncidentForm = () => {
    document.getElementById("incidentLocation").value = "";
    document.getElementById("incidentType").value = "";
    document.getElementById("otherIncidentType").value = "";
    document.getElementById("incidentDescription").value = "";
    document.getElementById("incidentVessel").value = "";
    document.getElementById("incidentImage").value = "";
    document.getElementById("imagePreviewContainer").innerHTML = "";
    document.getElementById("otherIncidentTypeGroup").style.display = "none";
  };

  // ------ TOGGLE OF OTHER INCIDENT TYPE ------
  const incidentTypeSelect = document.getElementById("incidentType");
  const otherIncidentGroup = document.getElementById("otherIncidentTypeGroup");

  incidentTypeSelect.addEventListener("change", () => {
    if (incidentTypeSelect.value === "other") {
      otherIncidentGroup.style.display = "block";
    } else {
      otherIncidentGroup.style.display = "none";
    }
  });

  // --------- PREFILL THE DROPDOWN FOR THE VESSEL ---------
  fetch("/get-vessels/")
    .then((res) => res.json())
    .then((data) => {
      if (!data.vessels || !Array.isArray(data.vessels)) {
        console.error("Unexpected response:", data);
        return;
      }

      const select = document.getElementById("incidentVessel");
      data.vessels.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.name;
        opt.textContent = v.name;
        select.appendChild(opt);
      });
    })
    .catch((err) => {
      console.error("Failed to fetch vessels:", err);
      showToast("Could not load vessels", true);
    });

  // --------- PREVIEW OF SELECTED IMAGE ---------
  const imageInput = document.getElementById("incidentImage");
  const previewContainer = document.getElementById("imagePreviewContainer");

  imageInput.addEventListener("change", function () {
    previewContainer.innerHTML = "";

    const files = Array.from(this.files);
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = function (e) {
        const img = document.createElement("img");
        img.src = e.target.result;
        img.className = "preview-thumb";
        previewContainer.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });

  const feed = document.getElementById("incidentFeed");
  const filterSelect = document.querySelector(".filter-select");
  const fullscreenWrapper = document.getElementById("fullscreenImageWrapper");
  const fullscreenImg = document.getElementById("fullscreenImage");
  const closeFullscreenBtn = document.querySelector(".close-fullscreen");

  // ----------------------- FILTER SELECT -----------------------
  filterSelect.addEventListener("change", async (e) => {
    currentSort = e.target.value;
    page = 1;
    hasMore = true;
    isLoading = false;
    feed.innerHTML = `<div class="loader"></div>`;

    try {
      const response = await fetch(`?sort=${currentSort}&page=1`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      const result = await response.json();
      feed.innerHTML = "";

      if (result.incidents.length === 0) {
        feed.innerHTML = `<p class="no-results">No incident reports to show.</p>`;
        return;
      }

      result.incidents.forEach((incident) => {
        const cardHTML = buildIncidentCard(incident);
        feed.insertAdjacentHTML("beforeend", cardHTML);
        const cardEl = feed.lastElementChild;
        updateCarouselControls(cardEl);
      });

      attachImagePreviewListeners();
      page++;
      hasMore = result.has_more;
    } catch (err) {
      console.error("Failed to fetch sorted incidents:", err);
      feed.innerHTML = `<p class="error-msg">Something went wrong while loading incidents.</p>`;
    }
  });

  // ----------------------- INFINITE SCROLL USING DEBOUNCING -----------------------
  let scrollTimeout = null;

  window.addEventListener("scroll", () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const cards = feed.querySelectorAll(".incident-card");
      const secondLast = cards[cards.length - 2];
      if (!secondLast) return;

      const rect = secondLast.getBoundingClientRect();
      if (rect.top < window.innerHeight + 100) {
        loadNextPage();
      }
    }, 150);
  });

  const loadNextPage = async () => {
    if (isLoading || !hasMore) return;
    isLoading = true;

    try {
      const response = await fetch(`?sort=${currentSort}&page=${page}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      const data = await response.json();

      data.incidents.forEach((incident) => {
        const cardHTML = buildIncidentCard(incident);
        feed.insertAdjacentHTML("beforeend", cardHTML);
        const cardEl = feed.lastElementChild;
        updateCarouselControls(cardEl);
      });

      attachImagePreviewListeners();
      page++;
      if (!data.has_more) {
        hasMore = false;
        showEndNotice();
      }
    } catch (err) {
      console.error("Error loading more incidents:", err);
    } finally {
      isLoading = false;
    }
  };

  const showEndNotice = () => {
    if (!document.getElementById("feedEndNotice")) {
      const endDiv = document.createElement("div");
      endDiv.id = "feedEndNotice";
      endDiv.className = "feed-end-notice";
      endDiv.innerHTML = `
        <i class="fas fa-info-circle"></i>
        <span>Nothing more to show.</span>`;
      feed.appendChild(endDiv);
    }
  };

  // ----------------------- FULLSCREEN IMAGE -----------------------
  const attachImagePreviewListeners = () => {
    document.querySelectorAll(".incident-image").forEach((img) => {
      img.addEventListener("click", () => {
        fullscreenImg.src = img.src;
        fullscreenWrapper.style.display = "flex";
      });
    });
  };

  closeFullscreenBtn.addEventListener("click", () => {
    fullscreenWrapper.style.display = "none";
    fullscreenImg.src = "";
  });

  fullscreenWrapper.addEventListener("click", (e) => {
    if (e.target === fullscreenWrapper) {
      fullscreenWrapper.style.display = "none";
      fullscreenImg.src = "";
    }
  });

  // ----------------------- CAROUSEL CONTROLS -----------------------
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".carousel-btn");
    if (!btn) return;

    const card = btn.closest(".incident-card");
    const images = card.querySelectorAll(".incident-image");
    let activeIndex = [...images].findIndex((img) =>
      img.classList.contains("active")
    );

    if (btn.classList.contains("left-btn") && activeIndex > 0) {
      images[activeIndex].classList.remove("active");
      images[--activeIndex].classList.add("active");
    }

    if (
      btn.classList.contains("right-btn") &&
      activeIndex < images.length - 1
    ) {
      images[activeIndex].classList.remove("active");
      images[++activeIndex].classList.add("active");
    }

    updateCarouselControls(card);
  });

  const updateCarouselControls = (card) => {
    const images = card.querySelectorAll(".incident-image");
    const leftBtn = card.querySelector(".left-btn");
    const rightBtn = card.querySelector(".right-btn");
    const dots = card.querySelectorAll(".dot");

    const activeIndex = [...images].findIndex((img) =>
      img.classList.contains("active")
    );

    if (leftBtn) leftBtn.style.display = activeIndex > 0 ? "block" : "none";
    if (rightBtn)
      rightBtn.style.display =
        activeIndex < images.length - 1 ? "block" : "none";
    dots.forEach((dot, i) => dot.classList.toggle("active", i === activeIndex));
  };

  // ----------------------- CARD BUILDER -----------------------
  const buildIncidentCard = (incident) => {
    const images = Array.isArray(incident?.images) ? incident.images : [];
    const imagesHTML = images
      .map(
        (img, i) => `
      <img src="${img.url}" class="incident-image ${
          i === 0 ? "active" : ""
        }" alt="Incident Image" loading="lazy">`
      )
      .join("");

    let carouselHTML = "",
      dotsHTML = "";

    if (images.length === 0) {
      carouselHTML = `
        <div class="incident-image-carousel no-image">
          <div class="incident-image-container">
            <div class="no-image-placeholder">
              <i class="fas fa-image"></i>
              <span>No image available</span>
            </div>
          </div>
        </div>`;
    } else {
      carouselHTML = `
        <div class="incident-image-carousel">
          ${
            images.length > 1
              ? '<button class="carousel-btn left-btn"><i class="fas fa-chevron-left"></i></button>'
              : ""
          }
          <div class="incident-image-container">${imagesHTML}</div>
          ${
            images.length > 1
              ? '<button class="carousel-btn right-btn"><i class="fas fa-chevron-right"></i></button>'
              : ""
          }
        </div>`;
      dotsHTML = `
        <div class="carousel-dots">
          ${images
            .map(
              (_, i) => `<span class="dot ${i === 0 ? "active" : ""}"></span>`
            )
            .join("")}
        </div>`;
    }

    let actionsHTML = "";

    if (incident.is_approved) {
      if (incident.status === "resolved") {
        actionsHTML = `
        <div class="incident-actions">
          <span class="status-label resolved">
            <i class="fas fa-check-circle"></i> Resolved
          </span>
        </div>
      `;
      } else {
        actionsHTML = `
        <div class="incident-actions">
          <span class="status-label unresolved">
            <i class="fas fa-exclamation-triangle"></i>
            Unresolved
          </span>
        </div>
        `;
      }
    } else {
      actionsHTML = `
      <div class="incident-actions">
        <a class="btn btn-approve"><i class="fas fa-check"></i> Approve</a>
        <a class="btn btn-decline"><i class="fas fa-xmark"></i> Decline</a>
      </div>
      `;
    }

    return `
      <div class="incident-card" data-card-id="${incident.incident_id}">
        <div class="incident-header">
          <div><strong>Incident Type:</strong> ${
            incident.incident_type_display
          }</div>
          <div><strong>Impact Level:</strong>
            <span class="impact-badge impact-${(
              incident.impact_level || ""
            ).toLowerCase()}">
              ${incident.impact_level_display || "—"}
            </span>
          </div>
        </div>
        ${carouselHTML}
        ${dotsHTML}
        <div class="incident-meta">
          <p><strong>Date:</strong> ${formatDate(incident.created_at)}</p>
          <p><strong>Reporter:</strong> ${incident.reporter_name}</p>
          <p><strong>Vessel:</strong> ${incident.vessel_name || "—"}</p>
          <p><strong>Location:</strong> ${incident.location}</p>
        </div>
        <div class="incident-description">
          <p><strong>Description:</strong> ${incident.description}</p>
        </div>
        ${actionsHTML}
      </div>`;
  };

  // helper function for the time display:
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      year: "numeric",
      month: "long",
      day: "2-digit",
    };
    return date.toLocaleDateString("en-US", options);
  };
  // Initial attach
  attachImagePreviewListeners();
  document.querySelectorAll(".incident-card").forEach(updateCarouselControls);

  // ----------------------- APPROVE / DECLINE LOGIC -----------------------
  let targetDeclineCard = null;
  const modal = document.getElementById("declineConfirmModal");
  const confirmBtn = document.getElementById("declineConfirmBtn");
  const cancelBtn = document.getElementById("declineCancelBtn");

  document.addEventListener("click", async (e) => {
    const approveBtn = e.target.closest(".btn-approve");
    const declineBtn = e.target.closest(".btn-decline");

    //  APPROVE
    if (approveBtn) {
      const card = approveBtn.closest(".incident-card");
      const incidentId = card.dataset.cardId;

      try {
        const res = await fetch(`/incident/approve/${incidentId}/`, {
          method: "POST",
          headers: {
            "X-CSRFToken": csrftoken,
            "X-Requested-With": "XMLHttpRequest",
          },
        });

        const data = await res.json();
        if (data.success) {
          const status = data.status || "pending"; // fallback
          card.querySelector(".incident-actions").innerHTML = `
            <select class="status-dropdown">
              <option value="pending" ${
                status === "pending" ? "selected" : ""
              }>Under Review</option>
              <option value="resolved" ${
                status === "resolved" ? "selected" : ""
              }>Resolved</option>
            </select>
          `;

          showToast("Incident approved");
        } else {
          showToast("Failed to approve incident", true);
        }
      } catch (err) {
        console.error("Approval failed:", err);
        showToast("An error occurred", true);
      }
    }

    //  DECLINE - open modal
    if (declineBtn) {
      targetDeclineCard = declineBtn.closest(".incident-card");
      modal.style.display = "flex";
    }
  });

  //  Confirm decline
  confirmBtn.addEventListener("click", async () => {
    if (!targetDeclineCard || !targetDeclineCard.isConnected) {
      console.warn("Target decline card is missing or already removed.");
      modal.style.display = "none";
      targetDeclineCard = null;
      return;
    }
    const incidentId = targetDeclineCard.dataset.cardId;

    try {
      const res = await fetch(`/incident/decline/${incidentId}/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrftoken,
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      const data = await res.json();
      if (data.success) {
        targetDeclineCard.remove();
        showToast("Incident declined");
      } else {
        showToast("Failed to decline incident", true);
      }
    } catch (err) {
      console.error("Decline failed:", err);
      showToast("An error occurred", true);
    } finally {
      modal.style.display = "none";
      targetDeclineCard = null;
    }
  });

  //  Cancel decline
  cancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
    targetDeclineCard = null;
  });

  //  Click outside modal
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
      targetDeclineCard = null;
    }
  });

  const resolutionModal = document.getElementById("resolutionModal");
  const resolutionTextarea = document.getElementById("resolutionDescription");
  const saveResolutionBtn = document.getElementById("saveResolutionBtn");
  const cancelResolutionBtn = document.getElementById("cancelResolutionBtn");
  const closeResolutionModal = document.getElementById("closeResolutionModal");

  let targetResolutionCard = null;
  let targetIncidentId = null;

  // Open modal if status is changed to "resolved"
  document.addEventListener("change", (e) => {
    const dropdown = e.target.closest(".status-dropdown");
    if (dropdown && e.target.value === "resolved") {
      targetResolutionCard = e.target.closest(".incident-card");
      targetIncidentId = targetResolutionCard?.dataset.cardId;
      resolutionTextarea.value = "";
      resolutionModal.style.display = "flex";
    }
  });

  // Cancel or close
  const closeResolution = () => {
    resolutionModal.style.display = "none";
    resolutionTextarea.value = "";

    if (targetResolutionCard) {
      const dropdown = targetResolutionCard.querySelector(".status-dropdown");
      if (dropdown) {
        dropdown.value = "pending";
      }
    }

    targetResolutionCard = null;
    targetIncidentId = null;
  };
  cancelResolutionBtn.addEventListener("click", closeResolution);
  closeResolutionModal.addEventListener("click", closeResolution);
  window.addEventListener("click", (e) => {
    if (e.target === resolutionModal) closeResolution();
  });

  // Save resolution
  saveResolutionBtn.addEventListener("click", async () => {
    const resolutionText = resolutionTextarea.value.trim();
    if (!resolutionText || !targetIncidentId) {
      showToast("Please provide a resolution description", true);
      return;
    }

    try {
      const res = await fetch(`/incident/resolve/${targetIncidentId}/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrftoken,
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ resolution: resolutionText }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Incident marked as resolved");
        if (targetResolutionCard) {
          const actions =
            targetResolutionCard.querySelector(".incident-actions");
          if (actions) {
            actions.innerHTML = `
        <span class="status-label resolved">
          <i class="fas fa-check-circle"></i> Resolved
        </span>`;
          }
        }
      } else {
        showToast("Failed to resolve incident", true);
      }
    } catch (err) {
      console.error("Error saving resolution:", err);
      showToast("An error occurred while saving", true);
    } finally {
      closeResolution();
    }
  });
});

const showToast = (msg, isError = false) => {
  const toast = document.createElement("div");
  toast.className = `custom-toast ${isError ? "error" : ""}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};
