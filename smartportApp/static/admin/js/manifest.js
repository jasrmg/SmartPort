const voyageListSection = document.getElementById("voyage-list-section");
const voyageSubmanifest = document.querySelector(".voyage-submanifest");
const voyageNumberDisplay = document.getElementById("voyage-number-display");
const submanifestTableBody = document.getElementById("submanifest-tbody");
const originSelect = document.getElementById("originPortSelect");
const destinationSelect = document.getElementById("destinationPortSelect");

// Handles loading submanifests by voyage ID
export const loadSubmanifests = async (voyageId, voyageNumber) => {
  voyageNumberDisplay.textContent = voyageNumber;
  voyageListSection.style.display = "none";
  voyageSubmanifest.style.display = "block";

  try {
    const response = await fetch(`/api/submanifests/${voyageId}/`);
    const data = await response.json();
    submanifestTableBody.innerHTML = "";

    if (!data.submanifests.length) {
      submanifestTableBody.innerHTML =
        "<tr><td colspan='4'>No submanifests found.</td></tr>";
      return;
    }

    data.submanifests.forEach((sm) => {
      const row = `
        <tr>
          <td>${sm.submanifest_number}</td>
          <td>${sm.item_count}</td>
          <td><span class="status-badge">${sm.status}</span></td>
          <td>
            <button class="btn-icon view" data-submanifest-id="${sm.id}" title="View">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn-icon approve-btn" data-submanifest-id="${sm.id}" title="Approve">
              <i class="fas fa-check"></i>
            </button>
            <button class="btn-icon reject" data-submanifest-id="${sm.id}" title="Reject">
              <i class="fas fa-times"></i>
            </button>
          </td>
        </tr>`;
      submanifestTableBody.insertAdjacentHTML("beforeend", row);
    });

    initApproveSubmanifest();
  } catch (error) {
    console.error("❌ Failed to fetch submanifests:", error);
  }
};

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

const bindSubmanifestTableActions = () => {
  submanifestTableBody.addEventListener("click", (e) => {
    const viewBtn = e.target.closest(".btn-icon.view");
    if (viewBtn) {
      const id = viewBtn.dataset.submanifestId;
      if (id) window.open(`/submanifest/${id}/`, "_blank");
    }
  });
};

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
// populate dropdown for the ports filter
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
    console.error("Error loading port options:", err);
  }
};
// APPROVE SUBMANIFEST
const initApproveSubmanifest = () => {
  const approveBtns = document.querySelectorAll(".approve-btn");
  approveBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      console.log("approve btn clicked: ", btn);
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
          // show toast
          showToast("Error: ", data.error);
          return;
        }
        showToast("Submanifest approved!", "success");
        // remove other buttons, only show view
        const buttonContainer = btn.parentElement;
        const approveBtn = buttonContainer.querySelector(".approve-btn");
        const rejectBtn = buttonContainer.querySelector(".reject-btn");

        approveBtn?.remove();
        rejectBtn?.remove();
      } catch (error) {
        showToast("Network error: ", error);
      }
    });
  });
};

// SHOW TOAST
const showToast = (message, type = "success", duration = 2500) => {
  const toastContainer = document.getElementById("toast-container");

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("transitionend", () => toast.remove());
  }, duration);
};

document.addEventListener("DOMContentLoaded", () => {
  bindVoyageCardEvents();
  bindSubmanifestTableActions();
  setupBackToListButtons();
  setupFlatpickr();
  populatePorts();
  initApproveSubmanifest();
});
