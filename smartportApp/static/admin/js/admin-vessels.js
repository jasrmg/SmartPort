document.addEventListener("DOMContentLoaded", function () {
  // ---------------------------- SIDEBAR JS ----------------------------
  const sidebar = document.querySelector(".sidebar");
  const mainContent = document.querySelector(".main-content");

  document
    .querySelector(".collapse-btn")
    .addEventListener("click", function (e) {
      e.preventDefault();

      // Apply transitions
      sidebar.classList.toggle("sidebar-collapsed");
      mainContent.classList.toggle("sidebar-collapsed-content");

      // Force a reflow for smooth transitions
      void sidebar.offsetWidth;
    });

  // Submenu toggle functionality
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((item) => {
    const link = item.querySelector(".nav-link");
    const hasSubmenu = item.querySelector(".nav-sub-menu");

    if (hasSubmenu) {
      link.addEventListener("click", function (e) {
        e.preventDefault();

        // Don't toggle if sidebar is collapsed - use hover instead
        if (!sidebar.classList.contains("sidebar-collapsed")) {
          // Toggle expanded class and show/hide submenu
          const isExpanded = item.classList.contains("expanded");

          if (isExpanded) {
            // If it's already expanded, collapse it
            item.classList.remove("expanded");
            hasSubmenu.style.height = "0px";
          } else {
            // If it's collapsed, expand it
            item.classList.add("expanded");
            hasSubmenu.style.height = "auto";

            // Close other expanded items
            navItems.forEach((otherItem) => {
              if (
                otherItem !== item &&
                otherItem.classList.contains("expanded")
              ) {
                otherItem.classList.remove("expanded");
                const otherSubmenu = otherItem.querySelector(".nav-sub-menu");
                if (otherSubmenu) {
                  otherSubmenu.style.height = "0px";
                }
              }
            });
          }
        }
      });
    }
  });

  // Initial layout state
  if (window.innerWidth <= 768) {
    sidebar.classList.add("sidebar-collapsed");
    mainContent.classList.add("sidebar-collapsed-content");
  }

  // ---------------------------- END OF SIDEBAR JS ----------------------------

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
  const addVesselSubmitBtn = document.getElementById("addVesselSubmitBtn");

  // OPEN ADD VESSEL MODAL:
  addVesselBtn.addEventListener("click", () => {
    addVesselModal.style.display = "flex";
    // INITIAL CHECK WHEN MODAL IS OPENED:
    clearFormValidation();
  });
  const clearFormValidation = () => {
    addVesselFields.forEach((field) => {
      field.classList.remove("valid", "invalid");
      field.dataset.touched = "false";
    });
    addVesselSubmitBtn.disabled = true;
  };
  // Validate a field only if it's been touched (blurred)
  const validateField = (field) => {
    if (field.dataset.touched === "true") {
      if (field.checkValidity()) {
        field.classList.add("valid");
        field.classList.remove("invalid");
      } else {
        field.classList.add("invalid");
        field.classList.remove("valid");
      }
    }
  };

  // Run overall form validation
  const validateForm = () => {
    let allValid = true;
    addVesselFields.forEach((field) => {
      validateField(field);
      if (!field.checkValidity()) {
        allValid = false;
      }
    });
    addVesselSubmitBtn.disabled = !allValid;
  };

  // Mark fields as touched on blur
  addVesselFields.forEach((field) => {
    field.dataset.touched = "false";

    field.addEventListener("blur", () => {
      field.dataset.touched = "true";
      validateField(field);
      validateForm();
    });

    field.addEventListener("input", () => {
      validateForm();
    });
  });

  const resetAddVesselForm = () => {
    addVesselForm.reset(); // resets all input values
    addVesselFields.forEach((field) => {
      field.classList.remove("valid", "invalid");
      field.dataset.touched = "false";
    });
    addVesselSubmitBtn.disabled = true;
  };

  // CLOSE ADD VESSEL MODAL:
  const btnToCloseAddVesselModal = [addVesselCloseBtn, addVesselCancelBtn];
  const closeAddVesselModal = () => {
    addVesselModal.style.display = "none";
    resetAddVesselForm();
    clearFormValidation();
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
  // ------------------ END OF ADD VESSEL MODAL ------------------
});
// OUTSIDE DOMCONTENTLOADED
