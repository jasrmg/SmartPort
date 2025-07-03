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
