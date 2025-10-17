const voyageListSection = document.getElementById("voyage-list-section");
const voyageSubmanifest = document.querySelector(".voyage-submanifest");
const voyageNumberDisplay = document.getElementById("voyage-number-display");
const submanifestTableBody = document.getElementById("submanifest-tbody");
const originSelect = document.getElementById("originPortSelect");
const destinationSelect = document.getElementById("destinationPortSelect");
// const generateManifestBtn = document.getElementById("generate-manifest-btn");
const warningText = document.getElementById("manifest-warning");
const toastContainer = document.getElementById("toast-container");

// Load submanifests for a given voyage
export const loadSubmanifests = async (voyageId, voyageNumber) => {
  if (!voyageId) {
    console.error("Voyage ID is required");
    showToast("Invalid voyage ID", true);
    return;
  }

  resetSubmanifestSorting();

  voyageNumberDisplay.textContent = voyageNumber;
  voyageListSection.style.display = "none";
  voyageSubmanifest.style.display = "block";

  // Assign voyageId to the Generate button
  const viewBtn = document.getElementById("view-master-manifest-btn");
  const generateBtn = document.getElementById("generate-manifest-btn");

  if (viewBtn) {
    viewBtn.style.display = "none";
    viewBtn.dataset.voyageId = voyageId;
  }

  if (generateBtn) {
    generateBtn.style.display = "inline-flex";
    generateBtn.dataset.voyageId = voyageId;
    generateBtn.disabled = true;
  }

  try {
    // display submanifest in the table
    toggleHeaderDisplay(false);
    const response = await fetch(`/api/submanifests/${voyageId}/`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { submanifests, has_manifest } = await response.json();

    submanifestTableBody.innerHTML = "";

    // WALAY SUBMANIFEST
    if (!submanifests || !submanifests.length) {
      if (warningText) warningText.style.display = "none";
      if (viewBtn) viewBtn.style.display = "none";
      if (generateBtn) generateBtn.style.display = "none";
      submanifestTableBody.innerHTML = `
        <tr><td colspan="5" class="no-submanifest">No submanifests found.</td></tr>`;
      return;
    }

    // check if there is a submanifest that is approved
    const hasApproved = submanifests.some((sm) => sm.status === "approved");

    // check if naay MASTERMANIFEST
    fetch(`/api/voyage/${voyageId}/has-master-manifest/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to check master manifest");
        return res.json();
      })
      .then(({ has_manifest: masterManifestExists }) => {
        if (warningText) warningText.style.display = "none";

        if (hasApproved && masterManifestExists) {
          // Case: has approved + Master manifest exists → Show View
          if (generateBtn) {
            generateBtn.style.display = "none";
            generateBtn.disabled = true;
          }
          if (viewBtn) {
            viewBtn.style.display = "inline-flex";
            viewBtn.disabled = false;

            viewBtn.onclick = () => {
              fetch(`/get-master-manifest-id/${voyageId}/`)
                .then((res) => {
                  if (!res.ok)
                    throw new Error(`HTTP error! status: ${res.status}`);
                  return res.json();
                })
                .then((data) => {
                  if (data.manifest_id) {
                    window.open(
                      `/master-manifest/${data.manifest_id}/`,
                      "_blank"
                    );
                  } else {
                    showToast("Manifest ID not found.", true);
                  }
                })
                .catch((err) => {
                  console.error("Failed to fetch manifest ID", err);
                  showToast("Error loading manifest.", true);
                });
            };
          }
        } else if (hasApproved && !masterManifestExists) {
          // Case: there is approved submanifest + No master manifest → Show Generate
          if (generateBtn) {
            generateBtn.style.display = "inline-flex";
            generateBtn.disabled = false;
            setupGenerateManifestButton(voyageId, generateBtn);
          }
          if (viewBtn) viewBtn.style.display = "none";
        } else {
          // ⚠️ Case: Some submanifests not approved → Disable Generate, Show Warning
          if (generateBtn) {
            generateBtn.style.display = "inline-flex";
            generateBtn.disabled = true;
          }
          if (viewBtn) viewBtn.style.display = "none";
          if (warningText) warningText.style.display = "block";
        }
      })
      .catch((err) => {
        console.error("Failed to check master manifest:", err);
        showToast("Error checking manifest status.", true);
      });

    submanifests.forEach((sm) => {
      const isAdminPending = sm.status === "pending_admin";
      const row = `
        <tr>
          <td>${escapeHtml(sm.submanifest_number || "")}</td>
          <td>${escapeHtml(sm.consignee_name || "N/A")}</td>
          <td>${escapeHtml(sm.consignor_name || "N/A")}</td>
          <td><span class="status-badge  ${escapeHtml(
            sm.status || ""
          )}">${escapeHtml(sm.status_label || "")}</span></td>
          <td>
            <button class="btn-icon view" data-submanifest-id="${escapeHtml(
              sm.id?.toString() || ""
            )}" title="View">
              <i class="fas fa-eye"></i>
            </button>
            ${
              isAdminPending
                ? `
              <button class="btn-icon approve-btn" data-submanifest-id="${escapeHtml(
                sm.id?.toString() || ""
              )}" title="Approve">
              <i class="fas fa-check"></i>
            </button>
            <button class="btn-icon reject-btn" data-submanifest-id="${escapeHtml(
              sm.id?.toString() || ""
            )}" title="Reject">
              <i class="fas fa-times"></i>
            </button>
            `
                : ""
            }
          </td>
        </tr>`;
      submanifestTableBody.insertAdjacentHTML("beforeend", row);
    });

    storeOriginalSubmanifestOrder();
    initializeSubmanifestSorting();

    initApproveSubmanifest(voyageId);

    if (generateBtn) generateBtn.disabled = !hasApproved;
  } catch (err) {
    console.error("❌ Failed to fetch submanifests:", err);
  }
};

const handleGenerate = async (voyageId) => {
  if (!voyageId) {
    showToast("Invalid voyage ID", true);
    return;
  }

  try {
    // generate master manifest
    const response = await fetch(`/generate-master-manifest/${voyageId}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error: ", data.error);
      showToast(data.error || "Failed to generate master manifest.", true);
      return;
    }

    showToast("Master Manifest generated successfully.", false);

    if (data.manifest_id) {
      const manifestUrl = `/master-manifest/${data.manifest_id}/`;
      window.open(manifestUrl, "_blank");
    }

    // update the ui:
    const generateBtn = document.querySelector(
      `#generate-manifest-btn[data-voyage-id='${voyageId}']`
    );
    if (generateBtn) generateBtn.style.display = "none";

    const viewBtn = document.getElementById("view-master-manifest-btn");
    if (viewBtn) {
      viewBtn.style.display = "inline-flex";
      viewBtn.disabled = false;
      viewBtn.dataset.voyageId = voyageId;

      // Remove existing click handlers to prevent duplicates
      viewBtn.onclick = null;
      viewBtn.onclick = () => {
        // fetch the manifest_id from backend to ensure we have the correct ID
        fetch(`/get-master-manifest-id/${voyageId}/`)
          .then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
          })
          .then((manifestData) => {
            if (manifestData.manifest_id) {
              window.open(
                `/master-manifest/${manifestData.manifest_id}/`,
                "_blank"
              );
            } else {
              showToast("Manifest ID not found.", true);
            }
          })
          .catch((err) => {
            console.error("Failed to fetch manifest ID", err);
            showToast("Error loading manifest.", true);
          });
      };
    }
  } catch (error) {
    console.error("Error: ", error);
    showToast(`Network error: ${error}`);
  }
};

const setupGenerateManifestButton = (voyageId, generateBtn) => {
  if (!generateBtn) return;

  // Clone the node to prevent multiple listeners
  const newGenerateBtn = generateBtn.cloneNode(true);
  newGenerateBtn.disabled = false;
  generateBtn.replaceWith(newGenerateBtn);

  // Attach new click listener
  newGenerateBtn.addEventListener("click", () => handleGenerate(voyageId));
};

// Bind click events on voyage cards
const bindVoyageCardEvents = () => {
  const container = document.querySelector(".voyage-cards-container");
  if (!container) return;

  container.addEventListener("click", (e) => {
    const card = e.target.closest(".voyage-card");
    if (!card) return;

    const voyageId = card.dataset.voyageId;
    const voyageNumberElement = card.querySelector("h3");
    const voyageNumber = voyageNumberElement?.textContent?.trim() || "Unknown";

    if (voyageId) loadSubmanifests(voyageId, voyageNumber);
  });
};

// Bind view button events in the submanifest table
const bindSubmanifestTableActions = () => {
  if (!submanifestTableBody) return;

  submanifestTableBody.addEventListener("click", (e) => {
    const viewBtn = e.target.closest(".btn-icon.view");
    if (!viewBtn) return;

    const id = viewBtn.dataset.submanifestId;
    if (id) {
      window.open(`/submanifest/${id}/`, "_blank");
    }
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
        toggleHeaderDisplay(true);
      })
    );
};

const setupFlatpickr = () => {
  const dateFilterElement = document.getElementById("dateFilter");
  const clearDateBtn = document.getElementById("clearDateBtn");

  if (!dateFilterElement || !clearDateBtn) return;

  const datePicker = flatpickr(dateFilterElement, {
    dateFormat: "Y-m-d",
    allowInput: false,
    onChange: (selectedDates, dateStr) => {
      if (dateStr) {
        dateFilterElement.value = dateStr;
        // Reset to page 1 and reload with new filter
        currentPage = 1;
        loadPage(currentPage);
      }
      toggleClearBtn();
    },
    onClose: () => {
      toggleClearBtn();
    },
  });

  // Show/hide clear button based on value
  const toggleClearBtn = () => {
    if (dateFilterElement.value.trim() !== "") {
      clearDateBtn.style.display = "block";
    } else {
      clearDateBtn.style.display = "none";
    }
  };

  // Manual clear handler
  clearDateBtn.addEventListener("click", () => {
    console.log("Clear date filter clicked");
    datePicker.clear();
    dateFilterElement.value = "";
    toggleClearBtn();
    currentPage = 1;
    loadPage(currentPage); // reload without date filter
  });

  // Show clear button on load if date exists
  toggleClearBtn();
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
const initApproveSubmanifest = (voyageId) => {
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
          showToast("Error: " + data.error, true);
          console.error("Error: ", data.error);
          return;
        }

        showToast("Submanifest approved!", false);
        const row = btn.closest("tr");
        const statusBadge = row?.querySelector(".status-badge");

        if (statusBadge) {
          statusBadge.textContent = "Pending Customs Review";
          statusBadge.className = "status-badge pending_customs";
        }

        btn.remove();
        row.querySelector(".reject-btn")?.remove();

        // Check if all are approved
        const hasApproved = Array.from(
          document.querySelectorAll(".status-badge")
        ).every((badge) => {
          return badge.classList.contains("approved");
        });

        if (hasApproved) {
          const dynamicGenerateBtn = document.querySelector(
            `#generate-manifest-btn[data-voyage-id="${voyageId}"]`
          );
          if (dynamicGenerateBtn) {
            setupGenerateManifestButton(voyageId, dynamicGenerateBtn);
            checkMasterManifestExists(voyageId);
          }
          if (warningText) warningText.style.display = "none";
        }
      } catch (error) {
        console.error("error: ", error);
        showToast("Network error: " + error.message, true);
      }
    });
  });
};

// helper to check if mastermanifest exist
const checkMasterManifestExists = async (voyageId) => {
  try {
    const response = await fetch(`/api/submanifests/${voyageId}/`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const { has_manifest } = await response.json();

    const generateBtn = document.querySelector(
      `#generate-manifest-btn[data-voyage-id="${voyageId}"]`
    );
    const viewBtn = document.getElementById("view-master-manifest-btn");

    if (has_manifest && viewBtn) {
      viewBtn.style.display = "inline-flex";
      viewBtn.disabled = false;
      viewBtn.dataset.voyageId = voyageId;

      // Remove existing click handlers to prevent duplicates
      viewBtn.onclick = null;
      viewBtn.onclick = () =>
        window.open(`/view-master-manifest/${voyageId}/`, "_blank");

      if (generateBtn) generateBtn.style.display = "none";
    } else if (!has_manifest && generateBtn) {
      generateBtn.style.display = "inline-flex";
      generateBtn.disabled = false;
      if (viewBtn) viewBtn.style.display = "none";
    }
  } catch (error) {
    console.error("Error checking master manifest:", error);
    showToast("Error checking manifest status", true);
  }
};

// Utility function to escape HTML
const escapeHtml = (text) => {
  if (typeof text !== "string") return text;
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

// Toast Utility
const showToast = (msg, isError = false, duration = 2500) => {
  const toast = document.createElement("div");
  toast.className = `custom-toast ${isError ? "error" : ""}`;
  toast.textContent = msg;

  const containerId = "toast-container";
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    document.body.appendChild(container);
  }

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("transitionend", () => toast.remove());
  }, duration);
};

// SUBMANIFEST REJECTION
const setupRejectModal = () => {
  const rejectModal = document.getElementById("rejectModal");
  const rejectForm = document.getElementById("rejectForm");
  const rejectNoteInput = document.getElementById("rejectNote");
  const rejectIdInput = document.getElementById("rejectSubmanifestId");
  const cancelBtn = document.getElementById("cancelRejectBtn");

  if (!rejectModal || !rejectForm || !rejectNoteInput || !rejectIdInput) return;

  // cancel
  cancelBtn.addEventListener("click", () => {
    rejectModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === rejectModal) {
      rejectModal.style.display = "none";
    }
  });

  // handle form submission for the reject
  rejectForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submanifestId = rejectIdInput.value;
    const note = rejectNoteInput.value.trim();

    if (!submanifestId || !note) {
      showToast("Please enter a rejection reason.", true);
      return;
    }

    try {
      const response = await fetch(`/submanifest/${submanifestId}/reject/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        body: JSON.stringify({ note }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Rejection failed.", true);
        return;
      }

      showToast("Submanifest rejected successfully.", false);

      // ui update after success:
      rejectModal.style.display = "none";

      const row = document
        .querySelector(`.reject-btn[data-submanifest-id="${submanifestId}"]`)
        ?.closest("tr");

      if (row) {
        const badge = row.querySelector(".status-badge");
        if (badge) {
          badge.textContent = "Rejected by Admin";
          badge.className = "status-badge rejected_by_admin";
        }

        row.querySelector(".approve-btn")?.remove();
        row.querySelector(".reject-btn")?.remove();
      }
    } catch (error) {
      console.error("Error rejecting submanifest:", error);
      showToast("Network error during rejection.", true);
    }
  });
};

// bind reject button clicks
const bindRejectButtons = () => {
  document.addEventListener("click", (e) => {
    const rejectBtn = e.target.closest(".reject-btn");
    if (!rejectBtn) return;

    const submanifestId = rejectBtn.dataset.submanifestId;
    if (!submanifestId) return;

    document.getElementById("rejectSubmanifestId").value = submanifestId;
    document.getElementById("rejectNote").value = "";
    document.getElementById("rejectModal").style.display = "flex";
  });
};

// -------------------- Table sorting functionality for submanifests --------------------
let originalSubmanifestOrder = [];

const initializeSubmanifestSorting = () => {
  const table = document.querySelector(".submanifest-table");
  if (!table) return;

  const sortButtons = table.querySelectorAll(".sort-btn");
  const tbody = table.querySelector("tbody");

  sortButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Check if there's any actual data to sort
      const dataRows = tbody.querySelectorAll("tr:not([class*='no-'])");
      if (dataRows.length === 0) {
        return; // Don't sort if there's no data
      }

      const column = parseInt(this.dataset.column);
      const currentOrder = this.dataset.order;
      let newOrder = "asc";

      // Determine new sort order
      if (currentOrder === "asc") {
        newOrder = "desc";
      } else if (currentOrder === "desc") {
        newOrder = "none";
      } else {
        newOrder = "asc";
      }

      // Reset all other sort buttons
      sortButtons.forEach((btn) => {
        if (btn !== this) {
          btn.dataset.order = "none";
          btn.querySelector("i").className = "fas fa-sort";
        }
      });

      // Update current button
      this.dataset.order = newOrder;
      updateSubmanifestSortIcon(this, newOrder);

      // Sort the table
      if (newOrder === "none") {
        // Reset to original order
        restoreOriginalSubmanifestOrder();
      } else {
        sortSubmanifestTable(column, newOrder);
      }
    });
  });
};

const updateSubmanifestSortIcon = (button, order) => {
  const icon = button.querySelector("i");
  switch (order) {
    case "asc":
      icon.className = "fas fa-sort-up";
      break;
    case "desc":
      icon.className = "fas fa-sort-down";
      break;
    case "none":
    default:
      icon.className = "fas fa-sort";
      break;
  }
};

const storeOriginalSubmanifestOrder = () => {
  const tbody = document.querySelector(".submanifest-table tbody");
  if (!tbody) return;

  originalSubmanifestOrder = Array.from(tbody.querySelectorAll("tr")).filter(
    (row) => !row.querySelector("td[colspan]") // Exclude "no data" rows
  );
};

const restoreOriginalSubmanifestOrder = () => {
  const tbody = document.querySelector(".submanifest-table tbody");
  if (!tbody) return;

  // Clear tbody
  tbody.innerHTML = "";

  // Re-append rows in original order
  originalSubmanifestOrder.forEach((row) => tbody.appendChild(row));

  // Add the "no data" row back if it exists and there are no data rows
  if (originalSubmanifestOrder.length === 0) {
    const noDataRow = document.createElement("tr");
    noDataRow.innerHTML =
      '<td colspan="5" class="no-submanifest">No submanifests found.</td>';
    tbody.appendChild(noDataRow);
  }
};

const sortSubmanifestTable = (columnIndex, order) => {
  const tbody = document.querySelector(".submanifest-table tbody");
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll("tr")).filter(
    (row) => !row.querySelector("td[colspan]") // Exclude "no data" rows
  );

  rows.sort((a, b) => {
    const cellA = a.cells[columnIndex];
    const cellB = b.cells[columnIndex];

    if (!cellA || !cellB) return 0;

    let valueA = cellA.textContent.trim();
    let valueB = cellB.textContent.trim();

    // Handle different data types
    let comparison = 0;

    switch (columnIndex) {
      case 0: // Submanifest ID - alphanumeric (SUBM-YYYYMMDD-ID format)
        comparison = valueA.localeCompare(valueB, undefined, {
          numeric: true,
        });
        break;
      case 1: // Consignee Name - text
        comparison = valueA.localeCompare(valueB);
        break;
      case 2: // Consignor Name - text
        comparison = valueA.localeCompare(valueB);
        break;
      case 3: // Status - text (but should sort by status hierarchy)
        // Define status order for logical sorting
        const statusOrder = {
          pending_admin: 1,
          rejected_by_admin: 2,
          pending_customs: 3,
          rejected_by_customs: 4,
          approved: 5,
        };

        // Extract status from the span element
        const statusA =
          cellA.querySelector(".status-badge")?.className.split(" ")[1] || "";
        const statusB =
          cellB.querySelector(".status-badge")?.className.split(" ")[1] || "";

        const orderA = statusOrder[statusA] || 999;
        const orderB = statusOrder[statusB] || 999;

        comparison = orderA - orderB;

        // If status order is the same, sort by text
        if (comparison === 0) {
          comparison = valueA.localeCompare(valueB);
        }
        break;
      default:
        comparison = valueA.localeCompare(valueB);
    }

    return order === "desc" ? -comparison : comparison;
  });

  // Clear tbody and re-append rows in sorted order
  tbody.innerHTML = "";
  rows.forEach((row) => tbody.appendChild(row));

  // Add the "no data" row back at the end if no data rows exist
  if (rows.length === 0) {
    const noDataRow = document.createElement("tr");
    noDataRow.innerHTML = '<td colspan="5">No submanifests found.</td>';
    tbody.appendChild(noDataRow);
  }
};

const resetSubmanifestSorting = () => {
  const sortButtons = document.querySelectorAll(".submanifest-table .sort-btn");
  sortButtons.forEach((btn) => {
    // Clear the original order array
    originalSubmanifestOrder = [];

    btn.dataset.order = "none";
    btn.querySelector("i").className = "fas fa-sort";
  });
};

// Init
document.addEventListener("DOMContentLoaded", () => {
  bindVoyageCardEvents();
  bindSubmanifestTableActions();
  setupBackToListButtons();
  populatePorts();

  // setupFlatpickr();

  setupRejectModal();
  bindRejectButtons();

  // Initialize sorting functionality (it will be re-initialized when data loads)
  initializeSubmanifestSorting();
});
