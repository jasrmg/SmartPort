const voyageStatusChoices = ["in_transit", "delayed", "arrived", "assigned"];
const tableBody = document.querySelector(".vessels-table tbody");

let selectedCell = null;
let originalStatus = null;
let newStatus = null;
let currentVoyageId = null;
let currentVoyageNumber = null;

const reasonModal = document.getElementById("delayedReasonModal");

const showToast = (msg, isError = false, duration = 2500) => {
  const toast = document.createElement("div");
  toast.className = `custom-toast ${isError ? "error" : ""}`;
  toast.textContent = msg;

  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("transitionend", () => toast.remove());
  }, duration);
};

document.addEventListener("DOMContentLoaded", () => {
  const confirmModal = document.getElementById(
    "confirmVoyageStatusChangeModal"
  );

  // ------------------ SORT TABLE LOGIC ------------------
  const sortButtons = document.querySelectorAll(".sort-btn");

  sortButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const column = parseInt(btn.dataset.column);
      let order = btn.dataset.order;

      // Reset other buttons icon and order
      sortButtons.forEach((b) => {
        if (b !== btn) {
          b.dataset.order = "none";
          const icon = b.querySelector("i");
          if (icon) icon.className = "fas fa-sort";
        }
      });

      // Toggle sorting order
      if (order === "none" || order === "desc") {
        order = "asc";
        btn.dataset.order = "asc";
        btn.querySelector("i").className = "fas fa-sort-up";
      } else {
        order = "desc";
        btn.dataset.order = "desc";
        btn.querySelector("i").className = "fas fa-sort-down";
      }

      sortTableByColumn(column, order);
    });
  });
  // ------------------ END SORT TABLE LOGIC ------------------

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

        // Define disabled options based on current status
        let shouldDisable = false;

        /*
          Voyage Status Transition Rules:

          - ASSIGNED → can only change to IN TRANSIT
          - IN TRANSIT → can change to DELAYED or ARRIVED
          - DELAYED → can change back to IN TRANSIT or proceed to ARRIVED
          - ARRIVED → final state; no further updates allowed
        */
        if (originalStatus === "assigned") {
          shouldDisable = status !== "assigned" && status !== "in_transit";
        } else if (originalStatus === "in_transit") {
          shouldDisable = status === "assigned";
        } else if (originalStatus === "delayed") {
          shouldDisable = status === "assigned";
        } else if (originalStatus === "arrived") {
          shouldDisable = status !== "arrived";
        }

        if (shouldDisable) {
          option.disabled = true;
          option.style.color = "#999";
        }

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
  });

  confirmCancelBtn.addEventListener("click", () => {
    cancelEdit();
    closeModals();
  });

  confirmCloseBtn.addEventListener("click", () => {
    cancelEdit();
    closeModals();
  });

  reasonCancelBtn.addEventListener("click", () => {
    cancelEdit();
    closeModals();
  });

  reasonCloseBtn.addEventListener("click", () => {
    cancelEdit();
    closeModals();
  });
});

// OUTSIDE DOM
// SORTING FUNCTION
const sortTableByColumn = (columnIndex, order) => {
  const rows = Array.from(tableBody.querySelectorAll("tr")).filter(
    (row) => !row.querySelector("td[colspan]") && row.id !== "searchLoaderRow"
  );

  rows.sort((a, b) => {
    const aText = getCellText(a, columnIndex);
    const bText = getCellText(b, columnIndex);

    // Special handling for date columns (indices 4 and 5)
    if (columnIndex === 4 || columnIndex === 5) {
      const aDate = new Date(aText);
      const bDate = new Date(bText);

      return order === "asc" ? aDate - bDate : bDate - aDate;
    }

    // Check if both values are numbers
    if (!isNaN(aText) && !isNaN(bText)) {
      return order === "asc"
        ? parseFloat(aText) - parseFloat(bText)
        : parseFloat(bText) - parseFloat(aText);
    }

    // String comparison
    return order === "asc"
      ? aText.localeCompare(bText)
      : bText.localeCompare(aText);
  });

  // Append sorted rows back to table
  rows.forEach((row) => tableBody.appendChild(row));
};

const getCellText = (row, index) => {
  const cell = row.children[index];
  if (!cell) return "";

  // For status column, get text from span inside
  const statusSpan = cell.querySelector(".status-badge");
  if (statusSpan) {
    return statusSpan.textContent.trim().toLowerCase();
  }

  return cell.textContent.trim().toLowerCase();
};
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
};

const showSpinner = (button) => {
  button.querySelector(".spinner").style.display = "inline-block";
};

const hideSpinner = (button) => {
  button.querySelector(".spinner").style.display = "none";
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Status update failed.");
    }

    // Parse response data
    const responseData = await response.json();

    if (!selectedCell) {
      selectedCell = document.querySelector(
        `.status-column[data-id="${voyageId}"]`
      );
    }

    // update table ui after success response
    if (selectedCell) {
      const row = selectedCell.closest("tr");
      const tableBody = row.parentElement;

      if (status === "arrived") {
        row.remove();

        // Count actual data rows (those with class status-column)
        const dataRows = tableBody.querySelectorAll("tr .status-column");

        if (dataRows.length === 0) {
          // Clear table and show empty state
          tableBody.innerHTML = `
            <tr>
              <td colspan="7" style="text-align: center; color: var(--dark-gray); padding: 1.25rem;">
                <i class="fas fa-info-circle" style="margin-right: 8px"></i>
                No active voyages found in the database.
              </td>
            </tr>
          `;
        }
      } else {
        const displayText = formatStatus(status);
        const className = status.toLowerCase();
        selectedCell.innerHTML = `<span class="status-badge ${className}">${displayText}</span>`;
      }

      selectedCell = null;
    }

    closeModals();
    notifyVoyageUpdated();

    // Handle different toast messages based on status and master manifest generation
    if (status === "in_transit") {
      if (responseData.master_manifest_generated === true) {
        showToast(
          "Voyage marked as In Transit. Master Manifest generated successfully!"
        );
      } else if (responseData.master_manifest_generated === "already_exists") {
        showToast(
          "Voyage marked as In Transit. Master Manifest already exists for this voyage."
        );
      } else {
        showToast(
          "Voyage marked as In Transit. No approved submanifests found — Master Manifest not generated."
        );
      }
    } else {
      showToast("Voyage status updated successfully!");
    }
  } catch (err) {
    showToast(err.message || "An error occurred. Please try again.", true);
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

// Support for search functionality - refresh search data after status updates
const notifyVoyageUpdated = () => {
  if (window.voyageSearch) {
    setTimeout(() => {
      window.voyageSearch.refreshOriginalData();
    }, 100);
  }
};
