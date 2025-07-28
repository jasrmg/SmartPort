document.addEventListener("DOMContentLoaded", () => {
  const cargoContainer = document.getElementById("cargoContainer");
  const cargoTemplate = document.getElementById("cargoTemplate");

  const deleteModal = document.getElementById("confirmDeleteCargoModal");
  const closeModalBtn = document.getElementById("closeDeleteCargoModal");
  const cancelBtn = document.getElementById("cancelDeleteCargo");
  const confirmBtn = document.getElementById("confirmDeleteCargoBtn");

  let cargoToDelete = null;

  const renumberCargos = () => {
    document.querySelectorAll(".cargo-entry").forEach((entry, index) => {
      const number = entry.querySelector(".cargo-number");
      if (number) number.textContent = index + 1;
    });
  };

  const updateAddButtons = () => {
    const cargoEntries = document.querySelectorAll(".cargo-entry");

    cargoEntries.forEach((entry, index) => {
      const btnContainer = entry.querySelector(".cargo-btn-container");
      if (!btnContainer) return;

      // Remove any existing button first
      const existingBtn = btnContainer.querySelector(".addCargoBtn");
      if (existingBtn) existingBtn.remove();

      // Only add the button to the last entry
      if (index === cargoEntries.length - 1) {
        const newBtn = document.createElement("button");
        newBtn.type = "button";
        newBtn.className = "btn-confirm-delivery addCargoBtn";
        newBtn.textContent = "+ Add Another Cargo";
        btnContainer.appendChild(newBtn);
      }
    });
  };

  const showModal = () => (deleteModal.style.display = "flex");
  const closeModal = () => {
    deleteModal.style.display = "none";
    cargoToDelete = null;
  };

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

  // Delegated click handler
  cargoContainer.addEventListener("click", (e) => {
    const target = e.target;

    if (target.classList.contains("addCargoBtn")) {
      const clone = cargoTemplate.content.cloneNode(true);
      cargoContainer.appendChild(clone);
      renumberCargos();
      updateAddButtons();
    }

    if (target.classList.contains("btn-remove-cargo")) {
      const entry = target.closest(".cargo-entry");
      const total = document.querySelectorAll(".cargo-entry").length;

      if (entry && total > 1) {
        cargoToDelete = entry;
        showModal();
      } else {
        showToast("At least one cargo entry is required", true);
      }
    }
  });

  // Confirm delete button
  confirmBtn.addEventListener("click", () => {
    if (cargoToDelete) {
      cargoToDelete.remove();
      renumberCargos();
      updateAddButtons();
      showToast("Cargo entry deleted successfully");
    }
    closeModal();
  });

  // Modal close/cancel
  closeModalBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  // Initialize on page load
  renumberCargos();
  updateAddButtons();
});
