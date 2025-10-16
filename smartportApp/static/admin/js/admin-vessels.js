const vesselStatusChoices = [
  { value: "available", label: "Available" },
  { value: "maintenance", label: "Under Maintenance" },
];
const tableBody = document.querySelector(".vessels-table tbody");

let targetRowToDelete = null;
let targetIMO = null;

const deleteVesselModal = document.getElementById("deleteVesselModal");
const deleteVesselCloseBtn = document.getElementById("deleteVesselCloseBtn");
const deleteVesselCancelBtn = document.getElementById("cancelDeleteBtn");
const deleteVesselConfirmBtn = document.getElementById("confirmDeleteBtn");

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

document.addEventListener("DOMContentLoaded", function () {
  // ------------------ SORT TABLE LOGIC ------------------
  const sortButtons = document.querySelectorAll(".sort-btn");

  sortButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.sortable === "false") return;

      const column = parseInt(btn.dataset.column);
      let order = btn.dataset.order;

      // reset other buttons icon and order:
      sortButtons.forEach((b) => {
        if (b !== btn) {
          b.dataset.order = "none";
          const icon = b.querySelector("i");
          if (icon) icon.className = "fas fa-sort";
        }
      });

      // toggle sorting order:
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

  // ------------------ EDIT VESSEL MODAL ------------------
  const editVesselButtons = document.querySelectorAll(".btn-icon.edit");
  const editVesselModal = document.getElementById("editVesselModal");
  const closeEditVesselBtn = document.getElementById("editVesselCloseBtn");
  const cancelEditVesselBtn = document.getElementById("editVesselCancelBtn");
  const updateEditVesselBtn = document.getElementById("editVesselUpdateBtn");
  const editVesselForm = document.getElementById("editVesselForm");

  const vesselNameInput = document.getElementById("vesselName");
  const vesselIMOInput = document.getElementById("vesselIMO");
  const vesselTypeSelect = document.getElementById("vesselType");
  const vesselCapacityInput = document.getElementById("vesselCapacity");

  let originalName = "";

  // OPEN EDIT ACTIVE VESSEL MODAL USING EVENT DELEGATION:
  editVesselButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // EXTRACT THE VESSEL DATA FROM THE BUTTON
      const name = btn.getAttribute("data-name");
      const type = btn.getAttribute("data-type");
      const imo = btn.getAttribute("data-imo");
      const capacity = btn.getAttribute("data-capacity");

      // PREFILL THE FORM
      vesselNameInput.value = name;
      vesselIMOInput.value = imo;
      vesselTypeSelect.value = type;
      vesselCapacityInput.value = capacity;

      // STORE OLD NAME FOR COMPARISON
      originalName = name;
      updateEditVesselBtn.disabled = true;

      // SHOW EDIT MODAL
      editVesselModal.style.display = "flex";
    });
  });

  // VESSEL NAME EDIT:
  editVesselForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newName = vesselNameInput.value.trim();
    const imo = vesselIMOInput.value.trim();

    const statusBox = editVesselModal.querySelector(".status-message");
    const statusText = statusBox.querySelector(".status-message-text");

    if (!newName || newName === originalName) return;

    try {
      const response = await fetch("/api/vessels/update-name/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        body: JSON.stringify({
          name: newName,
          imo: imo,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(
          "Failed to update vessel name: " + (data.message || "Unknown error")
        );
        return;
      }

      // Update table immediately
      const row = document
        .querySelector(`.btn-icon.edit[data-imo='${imo}']`)
        .closest("tr");
      if (row) row.children[0].textContent = newName;

      const editBtn = row.querySelector(".btn-icon.edit");
      if (editBtn) editBtn.setAttribute("data-name", newName);

      // SUCCESS MESSAGE
      showToast("Vessel name updated successfully!");

      setTimeout(() => {
        statusBox.style.display = "none";
        editVesselModal.style.display = "none";

        originalName = newName;

        editVesselForm.reset();
        updateEditVesselBtn.disabled = true;
      }, 1500);
    } catch (err) {
      // ERROR MESSAGE
      showToast("Error updating vessel!");
    }
  });

  // TRACK CHANGES IN VESSEL NAME:
  vesselNameInput.addEventListener("input", () => {
    const currentName = vesselNameInput.value.trim();
    updateEditVesselBtn.disabled =
      currentName === originalName || currentName === "";
  });
  const btnToCloseEditVesselModal = [cancelEditVesselBtn, closeEditVesselBtn];
  // CLOSE THE EDIT VESSEL MODAL:
  btnToCloseEditVesselModal.forEach((btn) => {
    btn.addEventListener("click", () => {
      editVesselModal.style.display = "none";
      editVesselForm.reset();
      updateEditVesselBtn.disabled = true;
    });
  });
  // CLOSE WHEN CLICKING OUTSIDE THE MODAL:
  window.addEventListener("click", (e) => {
    if (e.target === editVesselModal) {
      editVesselModal.style.display = "none";
      editVesselForm.reset();
      updateEditVesselBtn.disabled = true;
    }
  });
  // ------------------ END OF EDIT VESSEL MODAL ------------------

  // ------------------ DELETE VESSEL CONFIRMATION MODAL ------------------

  // OPEN DELETE VESSEL MODAL:
  document.querySelectorAll(".btn-icon.delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      targetRowToDelete = btn.closest("tr");
      targetIMO = btn.dataset.imo;
      deleteVesselModal.style.display = "flex";
    });
  });

  // CLOSE DELETE VESSEL MODAL:
  const btnToCloseDeleteVesselModal = [
    deleteVesselCancelBtn,
    deleteVesselCloseBtn,
  ];
  const closeVesselDeleteModal = () => {
    deleteVesselModal.style.display = "none";
    targetRowToDelete = null;
    targetIMO = null;
  };
  btnToCloseDeleteVesselModal.forEach((btn) => {
    btn.addEventListener("click", () => closeVesselDeleteModal());
  });
  // CLOSE WHEN CLICKING OUTSIDE THE MODAL:
  window.addEventListener("click", (e) => {
    if (e.target === deleteVesselModal) {
      closeVesselDeleteModal();
    }
  });

  deleteVesselConfirmBtn.addEventListener("click", async () => {
    if (!targetRowToDelete || !targetIMO) return;

    const statusBox = deleteVesselModal.querySelector(".status-message");
    const statusText = statusBox.querySelector(".status-message-text");

    if (!targetIMO) {
      statusText.textContent = "Unable to find vessel IMO!";
      statusBox.classList.add("error");
      statusBox.style.display = "flex";
      return;
    }

    try {
      const response = await fetch("/api/vessels/delete/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        body: JSON.stringify({ imo: targetIMO }),
      });

      const data = await response.json();

      // if (!response.ok || !data.success) {
      //   statusText.textContent = "Failed to delete vessel!";
      //   statusBox.classList.add("error");
      //   statusBox.style.display = "flex";
      //   return;
      // }

      // Successfully deleted — remove row from DOM
      targetRowToDelete.remove();
      // Refresh search data if search is active
      if (window.vesselSearch) {
        window.vesselSearch.refreshOriginalData();
      }

      // CHECK IF TABLE IS NOW EMPTY (exclude the search loader row)
      const remainingRows = Array.from(tableBody.querySelectorAll("tr")).filter(
        (row) => row.id !== "searchLoaderRow" && row.style.display !== "none"
      );

      if (remainingRows.length === 0) {
        const emptyRow = document.createElement("tr");
        emptyRow.innerHTML = `
          <td colspan="5" style="text-align: center; color: var(--dark-gray); padding: 1.25rem;">
            <i class="fas fa-info-circle" style="margin-right: 8px"></i>
            No vessels found in the database.
          </td>
        `;
        tableBody.appendChild(emptyRow);
      }

      closeVesselDeleteModal();
      showToast("Vessel deleted successfully!");
    } catch (err) {
      // ERROR MESSAGE
      closeVesselDeleteModal();
      showToast("An error occured while deleting the vessel.", true);
    }
  });

  // ------------------ END OF DELETE VESSEL CONFIRMATION MODAL ------------------

  // ------------------ ADD VESSEL MODAL ------------------
  const addVesselModal = document.getElementById("addVesselModal");
  const addVesselBtn = document.getElementById("addVesselBtn");
  const addVesselCloseBtn = document.getElementById("addVesselCloseBtn");
  const addVesselCancelBtn = document.getElementById("cancelAddVesselBtn");

  const addVesselForm = document.getElementById("addVesselForm");
  const addVesselFields = addVesselForm.querySelectorAll("input, select");

  // OPEN ADD VESSEL MODAL:
  addVesselBtn.addEventListener("click", () => {
    addVesselModal.style.display = "flex";
  });

  addVesselForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const result = validateVesselInputs();
    if (!result) return;

    const submitBtn = document.getElementById("submitAddVesselBtn");
    const btnText = submitBtn.querySelector(".btn-text");
    const spinner = submitBtn.querySelector(".spinner");

    submitBtn.disabled = true;
    btnText.textContent = "Adding...";
    spinner.style.display = "inline-block";

    const { name, imo, vessel_type, capacity } = result;

    try {
      const response = await fetch("/api/vessels/add/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        body: JSON.stringify({
          name,
          imo,
          vessel_type,
          capacity,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      // SHOW ADD VESSEL STATUS:
      closeAddVesselModal();
      showToast("Vessel created successfully");

      // INSERT INTO TABLE
      const vessel = data.vessel;
      localStorage.setItem(
        "vesselAdded",
        JSON.stringify({
          vesselId: vessel.id,
          name: vessel.name,
        })
      );
      // Refresh search data if search is active
      if (window.vesselSearch) {
        window.vesselSearch.refreshOriginalData();
      }
      const tableBody = document.querySelector(".vessels-table tbody");

      // If "No vessels found..." row exists, remove it
      const emptyMessageRow = Array.from(tableBody.querySelectorAll("tr")).find(
        (row) =>
          row.id !== "searchLoaderRow" &&
          row.textContent.includes("No vessels found")
      );

      if (emptyMessageRow) {
        emptyMessageRow.remove();
      }

      const row = document.createElement("tr");
      row.setAttribute("data-vessel-id", vessel.id);
      row.innerHTML = `
        <td>${vessel.name}</td>
        <td>${vessel.imo}</td>
        <td>${vessel.type}</td>
        <td class="status-column">
          <span class="status-badge available">Available</span>
        </td>
        <td>
          <button
            class="btn-icon edit"
            data-name="${vessel.name}"
            data-type="${vessel.type}"
            data-imo="${vessel.imo}"
            data-capacity="${vessel.capacity}"
          >
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-icon delete" data-imo="${vessel.imo}">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(row);

      // Rebind the newly added row’s edit and delete buttons
      bindVesselActionButtons(row);
      makeStatusCellsEditable();

      btnText.textContent = "Add Vessel";
      spinner.style.display = "none";

      this.reset();
    } catch (error) {
      console.log("Error: ", error);
    } finally {
      setTimeout(() => {
        btnText.textContent = "Add Vessel";
        spinner.style.display = "none";
        submitBtn.disabled = false;
        closeAddVesselModal();
      }, 1500);
    }
  });

  // CLOSE ADD VESSEL MODAL:
  const btnToCloseAddVesselModal = [addVesselCloseBtn, addVesselCancelBtn];
  const closeAddVesselModal = () => {
    addVesselModal.style.display = "none";
    addVesselModal.querySelector(".status-message").style.display = "none";

    // Clear the form
    addVesselForm.reset();

    // Remove validation classes if any
    const formFields = addVesselForm.querySelectorAll("input, select");
    formFields.forEach((field) => {
      field.classList.remove("valid", "invalid");
    });
  };
  btnToCloseAddVesselModal.forEach((btn) => {
    btn.addEventListener("click", () => closeAddVesselModal());
  });
  // CLOSE WHEN CLICKING OUTSIDE THE MODAL:
  window.addEventListener("click", (e) => {
    if (e.target === addVesselModal) {
      closeAddVesselModal();
    }
  });
  // ------------------ STATUS UPDATE WHEN CLICKED ------------------

  let selectedCell = null;
  let originalValue = "";

  const confirmModal = document.getElementById("confirmStatusChangeModal");

  const cancelBtn = confirmModal.querySelector(".btn-cancel");
  const confirmBtn = confirmModal.querySelector(".btn-update");
  const closeBtn = confirmModal.querySelector(".modal-close");

  cancelBtn.addEventListener("click", cancelStatusChange);
  confirmBtn.addEventListener("click", confirmStatusChange);
  closeBtn.addEventListener("click", closeConfirmModal);

  makeStatusCellsEditable();
});

// OUTSIDE DOMCONTENTLOADED

const showConfirmModal = (newValue) => {
  document
    .getElementById("confirmStatusMsg")
    .querySelector("strong").textContent = newValue;
  document.getElementById("confirmStatusChangeModal").style.display = "flex";
};

const closeConfirmModal = () => {
  document.getElementById("confirmStatusChangeModal").style.display = "none";
};

const cancelStatusChange = () => {
  selectedCell.innerHTML = `
    <span class="status-badge ${getStatusClass(originalValue)}">
      ${originalValue}
    </span>
  `;
  closeConfirmModal();
};

const getStatusClass = (label) => {
  const map = {
    Available: "available",
    "Under Maintenance": "maintenance",
  };
  return map[label] || "";
};

const confirmStatusChange = () => {
  const newValue = selectedCell.querySelector("select").value;
  const row = selectedCell.closest("tr");
  const imo = row.querySelector(".btn-icon.edit").dataset.imo;

  fetch("/update-vessel-status/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken,
    },
    body: JSON.stringify({ imo, status: newValue }),
  })
    .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (ok && data.success) {
        selectedCell.innerHTML = `
        <span class="status-badge ${newValue}">
          ${formatStatus(newValue)}
        </span>`;

        showToast("Vessel status updated successfully.");
      } else {
        console.error("Backend error:", data);
        showToast(
          "Failed to update: " + (data.message || "Unknown error"),
          true
        );
        cancelStatusChange();
      }
    })
    .catch((err) => {
      console.error("Fetch error:", err);
      showToast("Error updating vessel status.", true);
      cancelStatusChange();
    })
    .finally(() => {
      closeConfirmModal();
    });
};

const formatStatus = (val) => {
  const found = vesselStatusChoices.find((v) => v.value === val);
  return found ? found.label : val;
};

const makeStatusCellsEditable = () => {
  document.querySelectorAll("td.status-column").forEach((cell) => {
    cell.addEventListener("click", () => {
      console.log("test");
      let currentStatus = cell.textContent.trim();
      console.log("cs: ", currentStatus);
      if (cell.querySelector("select")) return;

      selectedCell = cell;
      originalValue = currentStatus;

      if (currentStatus === "Assigned") {
        return;
      }

      const matched = vesselStatusChoices.find(
        (opt) => opt.label.toLowerCase() === originalValue.toLowerCase()
      );
      const originalValueSlug = matched ? matched.value : "";

      const select = document.createElement("select");
      vesselStatusChoices.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        if (opt.value === originalValueSlug) option.selected = true;
        select.appendChild(option);
      });

      cell.textContent = "";
      cell.appendChild(select);
      select.focus();

      select.addEventListener("blur", () => {
        const selectedValue = select.value;
        const selectedLabel = select.options[select.selectedIndex].text;
        if (selectedLabel === originalValue) {
          // No change made, just revert to original
          selectedCell.innerHTML = `<span class="status-badge ${selectedValue}">${originalValue}</span>`;
          return;
        }
        showConfirmModal(selectedLabel);
      });
    });
  });
};

const resetAddVesselForm = () => {
  addVesselForm.reset(); // resets all input values
  addVesselFields.forEach((field) => {
    field.classList.remove("valid", "invalid");
    field.dataset.touched = "false";
  });
  addVesselSubmitBtn.disabled = true;
};

const validateVesselInputs = () => {
  const nameInput = document.getElementById("newVesselName");
  const imoInput = document.getElementById("newVesselIMO");
  const typeInput = document.getElementById("newVesselType");
  const capacityInput = document.getElementById("newVesselCapacity");

  const name = nameInput.value.trim();
  let imo = imoInput.value.trim();
  const vessel_type = typeInput.value;
  const capacity = parseInt(capacityInput.value, 10);

  // Clear previous validation classes
  [nameInput, imoInput, typeInput, capacityInput].forEach((field) => {
    field.classList.remove("invalid");
  });

  // Vessel name
  if (!name) {
    nameInput.classList.add("invalid");
    showToast("Vessel name is required.", true);
    // showVesselStatus(false, addVesselModal);
    return false;
  }

  // AUTO CORRECT USER INPUT IF INPUT ARE JUST DIGITS
  if (/^\d{7}$/.test(imo)) {
    imo = `IMO${imo}`;
  }

  // IF IT STARTS WITH LOWER CASE IMO:
  else if (/^imo\d{7}$/.test(imo)) {
    imo = `IMO${imo.slice(3)}`;
  }

  imoInput.value = imo;

  // IMO number format: IMO1234567
  if (!/^IMO\d{7}$/.test(imo)) {
    imoInput.classList.add("invalid");
    showToast("IMO must only have 7 digits.", true);
    // showVesselStatus(false, addVesselModal);
    return false;
  }

  // Vessel type
  if (!vessel_type) {
    typeInput.classList.add("invalid");
    showToast("Please select a vessel type.", true);
    // showVesselStatus(false, addVesselModal);
    return false;
  }

  // Capacity
  if (isNaN(capacity) || capacity <= 0) {
    capacityInput.classList.add("invalid");
    showToast("Capacity must be a positive number.", true);
    // showVesselStatus(
    //   "Capacity must be a positive number.",
    //   false,
    //   addVesselModal
    // );
    return false;
  }

  return {
    name,
    imo,
    vessel_type,
    capacity,
  };
};

// SORTING FUNCTION
const sortTableByColumn = (columnIndex, order) => {
  const rows = Array.from(tableBody.querySelectorAll("tr")).filter(
    (row) => !row.querySelector("td[colspan]")
  );
  rows.sort((a, b) => {
    const aText = getCellText(a, columnIndex);
    const bText = getCellText(b, columnIndex);

    if (!isNaN(aText) && !isNaN(bText)) {
      return order === "asc"
        ? parseFloat(aText) - parseFloat(bText)
        : parseFloat(bText) - parseFloat(aText);
    }

    return order === "asc"
      ? aText.localeCompare(bText)
      : bText.localeCompare(aText);
  });

  // append sorted rows
  rows.forEach((row) => tableBody.appendChild(row));
};

const getCellText = (row, index) => {
  const cell = row.children[index];
  return cell ? cell.textContent.trim().toLowerCase() : "";
};

const bindVesselActionButtons = (row) => {
  const editBtn = row.querySelector(".btn-icon.edit");
  const deleteBtn = row.querySelector(".btn-icon.delete");
  const updateEditVesselBtn = document.getElementById("editVesselUpdateBtn");

  if (editBtn) {
    editBtn.addEventListener("click", () => {
      const name = editBtn.getAttribute("data-name");
      const type = editBtn.getAttribute("data-type");
      const imo = editBtn.getAttribute("data-imo");
      const capacity = editBtn.getAttribute("data-capacity");

      document.getElementById("vesselName").value = name;
      document.getElementById("vesselIMO").value = imo;
      document.getElementById("vesselType").value = type;
      document.getElementById("vesselCapacity").value = capacity;

      originalName = name;
      updateEditVesselBtn.disabled = true;
      document.getElementById("editVesselModal").style.display = "flex";
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      targetRowToDelete = deleteBtn.closest("tr");
      targetIMO = deleteBtn.dataset.imo;
      deleteVesselModal.style.display = "flex";
    });
  }
};

// UPDATING THE TABLE IF THERE IS A VOYAGE MADE:
window.addEventListener("storage", (event) => {
  if (event.key === "vesselUpdated") {
    try {
      const data = JSON.parse(event.newValue);
      const { vesselId, newStatus } = data;

      if (vesselId && newStatus) {
        const row = document.querySelector(`tr[data-vessel-id='${vesselId}']`);
        if (row) {
          const statusBadge = row.querySelector(".status-badge");
          statusBadge.textContent = newStatus;
          statusBadge.className = `status-badge ${newStatus.toLowerCase()}`;
        }
      }
    } catch (e) {
      console.error("Invalid vesselUpdated data in localStorage");
    }
    localStorage.removeItem("vesselUpdated");
  }
});
