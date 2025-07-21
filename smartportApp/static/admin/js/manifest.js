const voyageListSection = document.getElementById("voyage-list-section");
const voyageSubmanifest = document.querySelector(".voyage-submanifest");
const voyageNumberDisplay = document.getElementById("voyage-number-display");
const submanifestTableBody = document.getElementById("submanifest-tbody");
const originSelect = document.getElementById("originPortSelect");
const destinationSelect = document.getElementById("destinationPortSelect");
const generateManifestBtn = document.getElementById("generate-manifest-btn");
const warningText = document.getElementById("manifest-warning");
const toastContainer = document.getElementById("toast-container");

// Load submanifests for a given voyage
export const loadSubmanifests = async (voyageId, voyageNumber) => {
  if (!voyageId) {
    console.error("Voyage ID is required");
    showToast("Invalid voyage ID", true);
    return;
  }

  voyageNumberDisplay.textContent = voyageNumber;
  voyageListSection.style.display = "none";
  voyageSubmanifest.style.display = "block";

  // Assign voyageId to the Generate button
  const viewBtn = document.getElementById("view-master-manifest-btn");
  const generateBtn = document.getElementById("generate-manifest-btn");
  console.log("view btn: ", viewBtn);
  console.log("generate btn: ", generateBtn);

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
        <tr><td colspan="4">No submanifests found.</td></tr>`;
      return;
    }

    // check if all submanifest is approved and enable it
    const allApproved = submanifests.every(
      (sm) => sm.status === "approved" || sm.status === "pending_customs"
    );
    console.log("IS ALL APPROVED: ", allApproved);

    // check if naay MASTERMANIFEST
    fetch(`/api/voyage/${voyageId}/has-master-manifest/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to check master manifest");
        return res.json();
      })
      .then(({ has_manifest: masterManifestExists }) => {
        if (warningText) warningText.style.display = "none";

        if (allApproved && masterManifestExists) {
          // ✅ Case: All approved + Master manifest exists → Show View
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
        } else if (allApproved && !masterManifestExists) {
          // ✅ Case: All approved + No master manifest → Show Generate
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
          <td>${escapeHtml(sm.item_count?.toString() || "0")}</td>
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

    initApproveSubmanifest(voyageId);

    if (generateBtn) generateBtn.disabled = !allApproved;
  } catch (err) {
    console.error("❌ Failed to fetch submanifests:", err);
  }
};

const handleGenerate = async (voyageId) => {
  console.log("🚀 Attempting to generate master manifest for", voyageId);

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
      console.log("🔗 View manifest at:", manifestUrl);
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
  console.log("🔁 Binding generate button for voyage", voyageId);

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

        // Check if all are approved or pending_customs
        const allApproved = Array.from(
          document.querySelectorAll(".status-badge")
        ).every((badge) => {
          return (
            badge.classList.contains("approved") ||
            badge.classList.contains("pending_customs")
          );
        });

        if (allApproved) {
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

// Init
document.addEventListener("DOMContentLoaded", () => {
  bindVoyageCardEvents();
  bindSubmanifestTableActions();
  setupBackToListButtons();
  setupFlatpickr();
  populatePorts();
});
