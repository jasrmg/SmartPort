document.addEventListener("DOMContentLoaded", function () {
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

  // ------------------ SORT TABLE (STATUS) ------------------
  const statusOptions = [
    "Arrived",
    "In Transit",
    "Under Maintenance",
    "Delayed",
  ];
  const portOptions = ["Manila", "Cebu", "Davao", "Zamboanga", "Iloilo"];

  // Apply event delegation to all editable td cells
  document.querySelectorAll("table.vessels-table tbody td").forEach((cell) => {
    const header = cell
      .closest("table")
      .querySelectorAll("thead th")
      [cell.cellIndex].textContent.trim();

    const isEditable = ["Origin", "Destination", "Status"].includes(header);
    if (!isEditable) return;

    cell.classList.add("editable");

    cell.addEventListener("click", function handleCellClick(e) {
      if (cell.querySelector("select")) return; // prevent duplicate selects

      const currentValue = cell.textContent.trim();
      const select = document.createElement("select");

      const options = header === "Status" ? statusOptions : portOptions;

      options.forEach((opt) => {
        const optionEl = document.createElement("option");
        optionEl.value = opt;
        optionEl.textContent = opt;
        if (opt === currentValue) optionEl.selected = true;
        select.appendChild(optionEl);
      });

      cell.textContent = "";
      cell.appendChild(select);
      select.focus();

      // On blur or change, save the value MAO NI USBON NA PART IG BUTANG BACKEND
      const commitChange = () => {
        const newValue = select.value;

        // IF STATUS ANG G EDIT:
        if (header === "Status") {
          const badge = document.createElement("span");
          badge.classList.add("status-badge");
          // DYNAMICALLY APPLYING THE CORRECT STATUS:
          const classMap = {
            Arrived: "arrived",
            "In Transit": "in-transit",
            "Under Maintenance": "under-maintenance",
            Delayed: "delayed",
          };
          const badgeClass = classMap[newValue];
          if (badgeClass) badge.classList.add(badgeClass);

          badge.textContent = newValue;
          cell.innerHTML = "";
          cell.appendChild(badge);
        } else {
          cell.textContent = newValue;
        }
      };

      select.addEventListener("blur", commitChange);
      select.addEventListener("change", commitChange);
    });
  });
  // ------------------ END OF SORT TABLE (STATUS) ------------------

  // ------------------ SORT TABLE (INCOMPLETE) ------------------
  const statusPriority = {
    "in transit": 1,
    arrived: 2,
    delayed: 3,
    "under maintenance": 4,
    decommissioned: 5,
  };

  document.querySelectorAll(".sort-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const table = button.closest("table");
      const tbody = table.querySelector("tbody");
      const rows = Array.from(tbody.querySelectorAll("tr"));
      const currentOrder = button.getAttribute("data-order");
      const isAsc = currentOrder !== "asc";

      // Reset all sort icons and orders
      table.querySelectorAll(".sort-btn").forEach((btn) => {
        btn.setAttribute("data-order", "none");
        const icon = btn.querySelector("i");
        if (icon) icon.className = "fas fa-sort";
      });

      // SET CURRENT BUTTON
      button.setAttribute("data-order", isAsc ? "asc" : "desc");
      const sortIcon = button.querySelector("i");
      if (sortIcon) {
        sortIcon.className = isAsc ? "fas fa-sort-up" : "fas fa-sort-down";
      }

      // Sort the rows
      const colIndex = button.closest("th").cellIndex;

      // CHECK IF ITS THE STATUS COLUMN
      const isStatusColumn = button
        .closest("th")
        .classList.contains("status-column");

      // CHECK IF ITS THE ETA; ETA>= NOW
      const isETA = button
        .closest("th")
        .textContent.toLowerCase()
        .includes("eta");

      const sortedRows = rows.sort((a, b) => {
        const valA = a.children[colIndex].textContent.trim().toLowerCase();
        const valB = b.children[colIndex].textContent.trim().toLowerCase();

        // IF STATUS COLUMN:
        if (isStatusColumn) {
          const aPriority = statusPriority[valA] || 99;
          const bPriority = statusPriority[valB] || 99;
          return isAsc ? aPriority - bPriority : bPriority - aPriority;
        }
        // DI PA MUGANA, UNYA NA LNG IG NAA NAY BACKEND NAKO LIHUKON
        // PARSE DATE FUNCTION TO FOLLOW THIS FORMAT: Jun 14, 2025 – 08:00 AM
        const parseDate = (text) => {
          const toPHTime = (date) => {
            const utc = date.getTime() + date.getTimezoneOffset() * 60000;
            return new Date(utc + 8 * 60 * 1000 * 60); // UTC+8
          };

          if (text.toLowerCase().includes("today")) {
            const nowPH = toPHTime(new Date());
            const timePart = text.split("–")[1]?.trim(); // e.g. "08:00 AM"
            const [time, period] = timePart.split(" ");
            let [hours, minutes] = time.split(":").map(Number);

            if (period === "PM" && hours < 12) hours += 12;
            if (period === "AM" && hours === 12) hours = 0;

            nowPH.setHours(hours, minutes, 0, 0);
            return nowPH;
          }

          // Format: "Jun 14, 2025 – 08:00 AM"
          const regex =
            /^([A-Za-z]{3}) (\d{1,2}), (\d{4})\s–\s(\d{2}):(\d{2}) (AM|PM)$/;
          const match = text.match(regex);

          if (match) {
            const [, monthAbbr, day, year, hourStr, minuteStr, period] = match;

            const monthMap = {
              Jan: 0,
              Feb: 1,
              Mar: 2,
              Apr: 3,
              May: 4,
              Jun: 5,
              Jul: 6,
              Aug: 7,
              Sep: 8,
              Oct: 9,
              Nov: 10,
              Dec: 11,
            };

            const month = monthMap[monthAbbr];
            let hour = Number(hourStr);
            const minute = Number(minuteStr);

            // convert to 24-hour format
            if (period === "PM" && hour < 12) hour += 12;
            if (period === "AM" && hour === 12) hour = 0;

            const date = new Date(Date.UTC(year, month, day, hour, minute));
            return toPHTime(date);
          }

          // fallback
          return toPHTime(new Date(text));
        };

        // IF ETA:
        if (isETA) {
          const now = (() => {
            const d = new Date();
            const utc = d.getTime() + d.getTimezoneOffset() * 60000;
            return new Date(utc + 8 * 60 * 60 * 1000); // PH time now
          })();

          const aDate = parseDate(valA);
          const bDate = parseDate(valB);

          const aPast = aDate < now;
          const bPast = bDate < now;

          //past dates at the bottom:
          if (aPast && !bPast) return 1;
          if (!aPast && bPast) return -1;

          return isAsc ? aDate - bDate : bDate - aDate;
        }

        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });

      // Re-append sorted rows
      sortedRows.forEach((row) => tbody.appendChild(row));
    });
  });
  // ------------------ END OF SORT TABLE (INCOMPLETE) ------------------

  // ------------------ DELETE VESSEL CONFIRMATION MODAL ------------------
  const deleteVesselModal = document.getElementById("deleteVesselModal");
  const deleteVesselCloseBtn = document.getElementById("deleteVesselCloseBtn");
  const deleteVesselCancelBtn = document.getElementById("cancelDeleteBtn");
  const deleteVesselConfirmBtn = document.getElementById("confirmDeleteBtn");

  let targetRowToDelete = null;

  // OPEN DELETE VESSEL MODAL:
  document.querySelectorAll(".btn-icon.delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      targetRowToDelete = btn.closest("tr");
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
      const user = firebase.auth().currentUser;
      const token = await user.getIdToken();

      const response = await fetch("/api/vessels/add/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
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
      showVesselStatus("Vessel Creation Successful", true, addVesselModal);
      this.reset();
    } catch (error) {
      console.log("Error: ", error);
    } finally {
      btnText.textContent = "Add Vessel";
      spinner.style.display = "none";
    }
  });

  // CLOSE ADD VESSEL MODAL:
  const btnToCloseAddVesselModal = [addVesselCloseBtn, addVesselCancelBtn];
  const closeAddVesselModal = () => {
    addVesselModal.style.display = "none";
    addVesselModal.querySelector(".status-message").style.display = "none";
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
});

// OUTSIDE DOMCONTENTLOADED
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
    showVesselStatus("Vessel name is required.", false, addVesselModal);
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
    showVesselStatus("IMO must only have 7 digits.", false, addVesselModal);
    return false;
  }

  // Vessel type
  if (!vessel_type) {
    typeInput.classList.add("invalid");
    showVesselStatus("Please select a vessel type.", false, addVesselModal);
    return false;
  }

  // Capacity
  if (isNaN(capacity) || capacity <= 0) {
    capacityInput.classList.add("invalid");
    showVesselStatus(
      "Capacity must be a positive number.",
      false,
      addVesselModal
    );
    return false;
  }

  return {
    name,
    imo,
    vessel_type,
    capacity,
  };
};

const showVesselStatus = (message, isSuccess = true, modal) => {
  const statusBox = modal.querySelector(".status-message");
  const statusText = modal.querySelector(".status-message-text");

  // RESET PREVIOUS STYLES
  statusBox.classList.remove("error", "success");

  // APPLY NEW STYLES
  statusBox.classList.add(isSuccess ? "success" : "error");

  // SET MESSAGE TEXT
  statusText.textContent = message;

  // SHOW THE DIV
  statusBox.style.display = "flex";
};
