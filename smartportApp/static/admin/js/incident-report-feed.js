let currentSort = "newest";
let page = 2;
let isLoading = false;
let hasMore = true;

document.addEventListener("DOMContentLoaded", () => {
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

    const actionsHTML = incident.is_approved
      ? `<div class="incident-actions">
          <select class="status-dropdown">
            <option value="pending" ${
              incident.status === "pending" ? "selected" : ""
            }>Under Review</option>
            <option value="resolved" ${
              incident.status === "resolved" ? "selected" : ""
            }>Resolved</option>
          </select>
        </div>`
      : `<div class="incident-actions">
          <a class="btn btn-approve"><i class="fas fa-check"></i> Approve</a>
          <a class="btn btn-decline"><i class="fas fa-xmark"></i> Decline</a>
        </div>`;

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
          <p><strong>Date:</strong> ${incident.created_at}</p>
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

    // ✅ APPROVE
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
          showToast("Incident approved");
          card.querySelector(".incident-actions").innerHTML = `
          <select class="status-dropdown">
            <option value="pending" selected>Under Review</option>
            <option value="resolved">Resolved</option>
          </select>`;
        } else {
          showToast("Failed to approve incident", true);
        }
      } catch (err) {
        console.error("Approval failed:", err);
        showToast("An error occurred", true);
      }
    }

    // ✅ DECLINE - open modal
    if (declineBtn) {
      targetDeclineCard = declineBtn.closest(".incident-card");
      modal.style.display = "flex";
    }
  });

  // ✅ Confirm decline
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

  // ✅ Cancel decline
  cancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
    targetDeclineCard = null;
  });

  // ✅ Click outside modal
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
