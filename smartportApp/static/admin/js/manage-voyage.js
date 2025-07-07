const voyageStatusChoices = ["in_transit", "delayed", "arrived"];

let selectedCell = null;
let originalStatus = null;
let newStatus = null;
let currentVoyageId = null;
let currentVoyageNumber = null;

const reasonModal = document.getElementById("delayedReasonModal");

document.addEventListener("DOMContentLoaded", () => {
  const confirmModal = document.getElementById(
    "confirmVoyageStatusChangeModal"
  );

  const confirmMsg = document.getElementById("confirmStatusChangeMsg");
  const confirmUpdateBtn = confirmModal.querySelector(".btn-update");
  const confirmCancelBtn = confirmModal.querySelector(".btn-cancel");
  const confirmCloseBtn = confirmModal.querySelector(".modal-close");

  const reasonInput = document.getElementById("delayed-reason-text");
  const reasonSubmitBtn = document.getElementById("submitDelayReason");
  const reasonCancelBtn = document.getElementById("cancelDelayModal");
  const reasonCloseBtn = document.getElementById("closeDelayModalBtn");

  // Click handler for voyage status cells
  document.querySelectorAll(".status-column").forEach((cell) => {
    cell.addEventListener("click", () => {
      if (cell.querySelector("select") || cell.dataset.locked === "true")
        return;

      selectedCell = cell;
      originalStatus = cell.innerText.trim().toLowerCase();
      currentVoyageId = cell.dataset.id;
      currentVoyageNumber = cell.closest("tr").querySelector("td").innerText;

      const select = document.createElement("select");
      select.classList.add("status-dropdown");

      voyageStatusChoices.forEach((status) => {
        const option = document.createElement("option");
        option.value = status;
        option.text = formatStatus(status);
        if (status === originalStatus) option.selected = true;
        select.appendChild(option);
      });

      cell.innerHTML = "";
      cell.appendChild(select);
      select.focus();

      select.addEventListener("change", () => {
        const selectedValue = select.value;

        if (selectedValue === originalStatus) {
          cancelEdit();
          return;
        }

        newStatus = selectedValue;

        confirmMsg.innerHTML = `
          Are you sure you want to update the voyage
          <strong>${currentVoyageNumber}</strong> status to
          <strong>${formatStatus(newStatus)}</strong>?
        `;

        confirmModal.style.display = "flex";
      });
    });
  });

  // Detect outside click using mousedown to allow dropdown to render
  document.addEventListener("mousedown", (e) => {
    if (!selectedCell || selectedCell.contains(e.target)) return;

    cancelEdit();
  });

  // CONFIRM MODAL - Update Button
  confirmUpdateBtn.addEventListener("click", () => {
    if (newStatus === "delayed") {
      confirmModal.style.display = "none";
      reasonModal.style.display = "flex";
      hideReasonMessage();
    } else {
      updateVoyageStatus(currentVoyageId, newStatus);
      closeModals();
    }
  });

  // REASON MODAL - Submit Button
  reasonSubmitBtn.addEventListener("click", () => {
    const reason = reasonInput.value.trim();
    if (!reason) {
      showReasonError("Please provide a reason for the delay.");
      return;
    }
    hideReasonMessage();

    updateVoyageStatus(currentVoyageId, "delayed", reason);
    closeModals();
  });

  // CANCEL/Close Buttons for both modals
  [confirmCancelBtn, confirmCloseBtn, reasonCancelBtn, reasonCloseBtn].forEach(
    (btn) =>
      btn.addEventListener("click", () => {
        cancelEdit();
        closeModals();
      })
  );
});

// OUTSIDE DOM

// FORMATTER
const formatStatus = (status) =>
  status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());

// CANCEL EDIT
const cancelEdit = () => {
  if (!selectedCell) return;

  const displayText = formatStatus(originalStatus);
  const className = originalStatus.toLowerCase().replace(/\s+/g, "_");

  selectedCell.innerHTML = `<span class="status-badge ${className}">${displayText}</span>`;
  selectedCell = null;
};

// CLOSE MODALS AND RESET UI
const closeModals = () => {
  document.getElementById("confirmVoyageStatusChangeModal").style.display =
    "none";
  document.getElementById("delayedReasonModal").style.display = "none";
  document.getElementById("delayed-reason-text").value = "";

  if (selectedCell) {
    const row = selectedCell.closest("tr");
    const tableBody = row.parentElement;

    const displayText = formatStatus(newStatus);
    const className = newStatus.toLowerCase();
    selectedCell.innerHTML = `<span class="status-badge ${className}">${displayText}</span>`;

    if (newStatus === "arrived") {
      row.remove();

      const remainingRows = tableBody.querySelectorAll("tr");
      if (remainingRows.length === 0) {
        const emptyRow = document.createElement("tr");
        emptyRow.innerHTML = `
          <td colspan="7" style="text-align: center; color: var(--dark-gray); padding: 1.25rem;">
            <i class="fas fa-info-circle" style="margin-right: 8px"></i>
            No active voyages found in the database.
          </td>
        `;
        tableBody.appendChild(emptyRow);
      }
    } else {
      selectedCell.innerHTML = `<span class="status-badge ${newStatus}">${formatStatus(
        newStatus
      )}</span>`;
    }

    selectedCell = null;
  }
};

const showSpinner = (button) => {
  button.querySelector(".spinner").style.display = "inline-block";
};

const hideSpinner = (button) => {
  button.querySelector(".spinner").style.display = "none";
};

const showSuccessModal = () => {
  const modal = document.getElementById("statusSuccessModal");
  modal.style.display = "flex";
  setTimeout(() => {
    modal.style.display = "none";
  }, 2500);
};

// BACKEND CALL
const updateVoyageStatus = async (voyageId, status, reason = "") => {
  const button =
    status === "delayed"
      ? document.getElementById("submitDelayReason")
      : document.querySelector("#confirmVoyageStatusChangeModal .btn-update");

  try {
    showSpinner(button);

    const response = await fetch("/update-voyage-status/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken,
      },
      body: JSON.stringify({ voyage_id: voyageId, status, reason }),
    });

    if (!response.ok) throw new Error("Status update failed.");

    closeModals();
    showSuccessModal();
  } catch (err) {
    alert("An error occurred. Please try again.");
    console.error(err);
  } finally {
    hideSpinner(button);
  }
};

const showReasonError = (message) => {
  const statusBox = reasonModal.querySelector(".status-message");
  const icon = statusBox.querySelector("i");
  const text = statusBox.querySelector(".status-message-text");

  statusBox.classList.add("error");
  statusBox.style.display = "flex";
  icon.classList.remove("fa-check-circle");
  icon.classList.add("fa-exclamation-circle");
  icon.style.color = "var(--white)";
  text.innerText = message;
};

const hideReasonMessage = () => {
  const statusBox = reasonModal.querySelector(".status-message");
  const icon = statusBox.querySelector("i");
  const text = statusBox.querySelector(".status-message-text");

  statusBox.style.display = "none";
  icon.className = "fas fa-check-circle";
  icon.style.color = "var(--accent)";
  text.innerText = "Vessel Creation Successful!";
};
