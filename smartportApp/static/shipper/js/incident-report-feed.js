// ----------------------- GLOBAL -----------------------
window.currentSort = "newest";
window.page = 2;
window.isLoading = false;
window.hasMore = true;
let feed;
// ----------------------- CARD BUILDER -----------------------
window.buildIncidentCard = (incident) => {
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
          <span class="status-label resolved clickable-status" style="cursor: pointer;">
            <i class="fas fa-check-circle"></i> Resolved - View Details
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

window.updateCarouselControls = (card) => {
  const images = card.querySelectorAll(".incident-image");
  const leftBtn = card.querySelector(".left-btn");
  const rightBtn = card.querySelector(".right-btn");
  const dots = card.querySelectorAll(".dot");

  const activeIndex = [...images].findIndex((img) =>
    img.classList.contains("active")
  );

  if (leftBtn) leftBtn.style.display = activeIndex > 0 ? "block" : "none";
  if (rightBtn)
    rightBtn.style.display = activeIndex < images.length - 1 ? "block" : "none";
  dots.forEach((dot, i) => dot.classList.toggle("active", i === activeIndex));
};

window.attachImagePreviewListeners = () => {
  document.querySelectorAll(".incident-image").forEach((img) => {
    img.addEventListener("click", () => {
      fullscreenImg.src = img.src;
      fullscreenWrapper.style.display = "flex";
    });
  });
};

window.showEndNotice = () => {
  const feedElement = feed || document.getElementById("incidentFeed");
  if (!feedElement) return;

  if (!document.getElementById("feedEndNotice")) {
    const endDiv = document.createElement("div");
    endDiv.id = "feedEndNotice";
    endDiv.className = "feed-end-notice";
    endDiv.innerHTML = `
        <i class="fas fa-info-circle"></i>
        <span>Nothing more to show.</span>`;
    feedElement.appendChild(endDiv);
  }
};

window.loadNextPage = async () => {
  if (isLoading || !hasMore) return;
  isLoading = true;

  // Get feed element safely
  const feedElement = feed || document.getElementById("incidentFeed");
  if (!feedElement) {
    console.error("Feed element not found");
    isLoading = false;
    return;
  }

  try {
    const response = await fetch(`?sort=${currentSort}&page=${page}`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    const data = await response.json();

    data.incidents.forEach((incident) => {
      const cardHTML = window.buildIncidentCard(incident);
      feedElement.insertAdjacentHTML("beforeend", cardHTML);
      const cardEl = feedElement.lastElementChild;
      window.updateCarouselControls(cardEl);
    });

    window.attachImagePreviewListeners();
    page++;
    if (!data.has_more) {
      hasMore = false;
      window.showEndNotice();
    }
  } catch (err) {
    console.error("Error loading more incidents:", err);
  } finally {
    isLoading = false;
  }
};
// helper function for the time display:
window.formatDate = (dateString) => {
  const date = new Date(dateString);
  const options = {
    year: "numeric",
    month: "long",
    day: "2-digit",
  };
  return date.toLocaleDateString("en-US", options);
};

// ----------------------- END OF GLOBAL -----------------------

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

  // ----------------------- RESOLUTION DETAILS MODAL -----------------------
  const resolutionModal = document.getElementById("resolutionDetailsModal");
  const closeResolutionModal = document.getElementById(
    "closeResolutionDetailsModal"
  );
  const okResolutionBtn = document.getElementById("okResolutionBtn");

  closeResolutionModal.addEventListener("click", () => {
    resolutionModal.style.display = "none";
  });

  okResolutionBtn.addEventListener("click", () => {
    resolutionModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === resolutionModal) {
      resolutionModal.style.display = "none";
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

  feed = document.getElementById("incidentFeed");
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
    // Clear search if active
    if (
      window.clearSearch &&
      document.querySelector(".search-bar input")?.value.trim()
    ) {
      window.clearSearch();
    }

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

  const handleScroll = () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const cards = document.querySelectorAll(".incident-card");
      if (cards.length < 2) return;

      const secondLast = cards[cards.length - 2];
      if (!secondLast) return;

      const rect = secondLast.getBoundingClientRect();
      if (rect.top < window.innerHeight + 100) {
        // Only call loadNextPage if search is not active
        if (!window.isSearchActive) {
          console.log("Calling loadMoreSearchResults, page:", window.page);
          window.loadNextPage();
        } else if (window.loadNextPage) {
          console.log("Calling regular loadNextPage, page:", window.page);
          window.loadNextPage();
        }
      }
    }, 150);
  };

  // ----------------------- FULLSCREEN IMAGE -----------------------

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

  // ----------------------- CAROUSEL CONTROLS & RESOLUTION MODAL -----------------------
  // diri ra na part giusab
  document.addEventListener("click", async (e) => {
    // Handle carousel buttons
    const btn = e.target.closest(".carousel-btn");
    if (btn) {
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
      return; // Exit early for carousel buttons
    }

    // Handle resolution status label clicks
    const statusLabel = e.target.closest(".status-label.resolved");
    if (statusLabel) {
      const card = statusLabel.closest(".incident-card");
      const incidentId = card.dataset.cardId;

      try {
        const response = await fetch(`/get-resolution-details/${incidentId}/`, {
          headers: { "X-Requested-With": "XMLHttpRequest" },
        });
        const data = await response.json();

        if (data.success && data.resolution) {
          const resolutionText = document.getElementById(
            "resolutionDetailsText"
          );
          const resolution = data.resolution;

          resolutionText.innerHTML = `
            <div class="resolution-detail">
              <p><strong>Resolution Report:</strong></p>
              <p class="resolution-report">${resolution.resolution_report}</p>
            </div>
            <div class="resolution-meta">
              <p><strong>Resolved Date:</strong> ${formatDate(
                resolution.resolution_date
              )}</p>
              <p><strong>Resolved By:</strong> ${
                resolution.resolved_by_name
              }</p>
            </div>
          `;

          resolutionModal.style.display = "flex";
        } else {
          showToast("Could not load resolution details", true);
        }
      } catch (err) {
        console.error("Failed to fetch resolution details:", err);
        showToast("Error loading resolution details", true);
      }
    }
  });

  // Initial attach
  attachImagePreviewListeners();
  document.querySelectorAll(".incident-card").forEach(updateCarouselControls);
});

const showToast = (msg, isError = false) => {
  const toast = document.createElement("div");
  toast.className = `custom-toast ${isError ? "error" : ""}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};
