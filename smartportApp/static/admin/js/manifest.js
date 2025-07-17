const voyageListSection = document.getElementById("voyage-list-section");
const voyageSubmanifest = document.querySelector(".voyage-submanifest");
const voyageNumberDisplay = document.getElementById("voyage-number-display");
const submanifestTableBody = document.getElementById("submanifest-tbody");
const originSelect = document.getElementById("originPortSelect");
const destinationSelect = document.getElementById("destinationPortSelect");
const generateManifestBtn = document.getElementById("generate-manifest-btn");
const manifestWarning = document.getElementById("manifest-warning");
const toastContainer = document.getElementById("toast-container");

// Load submanifests for a given voyage
export const loadSubmanifests = async (voyageId, voyageNumber) => {
  voyageNumberDisplay.textContent = voyageNumber;
  voyageListSection.style.display = "none";
  voyageSubmanifest.style.display = "block";

  try {
    const response = await fetch(`/api/submanifests/${voyageId}/`);
    const { submanifests } = await response.json();

    submanifestTableBody.innerHTML = "";

    if (!submanifests.length) {
      submanifestTableBody.innerHTML = `
        <tr><td colspan="4">No submanifests found.</td></tr>`;
      return;
    }

    submanifests.forEach((sm) => {
      const row = `
        <tr>
          <td>${sm.submanifest_number}</td>
          <td>${sm.item_count}</td>
          <td><span class="status-badge ${sm.status}">${sm.status_label}</span></td>
          <td>
            <button class="btn-icon view" data-submanifest-id="${sm.id}" title="View">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn-icon approve-btn" data-submanifest-id="${sm.id}" title="Approve">
              <i class="fas fa-check"></i>
            </button>
            <button class="btn-icon reject-btn" data-submanifest-id="${sm.id}" title="Reject">
              <i class="fas fa-times"></i>
            </button>
          </td>
        </tr>`;
      submanifestTableBody.insertAdjacentHTML("beforeend", row);
    });

    initApproveSubmanifest();
  } catch (err) {
    console.error("❌ Failed to fetch submanifests:", err);
  }
};

// Bind click events on voyage cards
const bindVoyageCardEvents = () => {
  const container = document.querySelector(".voyage-cards-container");
  if (!container) return;

  container.addEventListener("click", (e) => {
    const card = e.target.closest(".voyage-card");
    if (!card) return;

    const voyageId = card.dataset.voyageId;
    const voyageNumber = card.querySelector("h3")?.innerText;
    if (voyageId) loadSubmanifests(voyageId, voyageNumber);
  });
};

// Bind view button events in the submanifest table
const bindSubmanifestTableActions = () => {
  submanifestTableBody.addEventListener("click", (e) => {
    const viewBtn = e.target.closest(".btn-icon.view");
    if (!viewBtn) return;

    const id = viewBtn.dataset.submanifestId;
    if (id) window.open(`/submanifest/${id}/`, "_blank");
  });
};

// Back to list buttons
const setupBackToListButtons = () => {
  document
    .querySelectorAll(".back-to-list-btn, #back-to-voyage-list")
    .forEach((btn) =>
      btn.addEventListener("click", () => {
        voyageSubmanifest.style.display = "none";
        voyageListSection.style.display = "block";
      })
    );
};

// Setup Flatpickr on date filter
const setupFlatpickr = () => {
  flatpickr("#dateFilter", {
    clickOpens: true,
    dateFormat: "Y-m-d",
    allowInput: false,
    onChange: (dates, dateStr) => {
      document.getElementById("dateFilter").textContent =
        dateStr || "Select Date";
      document.getElementById("selectedDate").value = dateStr;
    },
  });
};

// Load port dropdown options
const populatePorts = async () => {
  try {
    const res = await fetch("/get-port-options/");
    const { ports } = await res.json();

    ports.forEach((port) => {
      [originSelect, destinationSelect].forEach((select) => {
        const opt = document.createElement("option");
        opt.value = port.id;
        opt.textContent = port.name;
        select.appendChild(opt);
      });
    });
  } catch (err) {
    console.error("❌ Error loading port options:", err);
  }
};

// Approve submanifest
const initApproveSubmanifest = () => {
  document.querySelectorAll(".approve-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const submanifestId = btn.dataset.submanifestId;
      if (!submanifestId) return;

      try {
        const response = await fetch(`/submanifest/${submanifestId}/approve/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          showToast("Error: " + data.error, "error");
          return;
        }

        showToast("Submanifest approved!", "success");

        const row = btn.closest("tr");
        const statusBadge = row.querySelector(".status-badge");

        if (statusBadge) {
          statusBadge.textContent = "Pending Customs Review";
          statusBadge.className = "status-badge pending_customs";
        }

        btn.remove();
        row.querySelector(".reject-btn")?.remove();

        // Check if all are approved or pending_customs
        const allApproved = Array.from(
          document.querySelectorAll(".status-badge")
        ).every((badge) => {
          const val = badge.textContent.trim().toLowerCase();
          return val === "approved" || val === "pending customs review";
        });

        if (allApproved) {
          generateManifestBtn.disabled = false;
          manifestWarning.style.display = "none";
        }
      } catch (error) {
        showToast("Network error: " + error.message, "error");
      }
    });
  });
};

// Toast Utility
const showToast = (message, type = "success", duration = 2500) => {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("transitionend", () => toast.remove());
  }, duration);
};

// Init
document.addEventListener("DOMContentLoaded", () => {
  bindVoyageCardEvents();
  bindSubmanifestTableActions();
  setupBackToListButtons();
  setupFlatpickr();
  populatePorts();
  initApproveSubmanifest();
});
