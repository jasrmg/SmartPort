document.addEventListener("DOMContentLoaded", () => {
  const cargoContainer = document.getElementById("cargoContainer");
  const cargoTemplate = document.getElementById("cargoTemplate");

  const renumberCargos = () => {
    document.querySelectorAll(".cargo-entry").forEach((entry, index) => {
      const number = entry.querySelector(".cargo-number");
      if (number) number.textContent = index + 1;
    });
  };

  cargoContainer.addEventListener("click", (e) => {
    // ADD CARGO
    if (e.target.closest(".addCargoBtn")) {
      // 1. Remove the add button from the current block
      const currentEntry = e.target.closest(".cargo-entry");
      if (currentEntry) {
        const oldAddBtn = currentEntry.querySelector(".addCargoBtn");
        if (oldAddBtn) oldAddBtn.remove();
      }

      // 2. Clone and append new cargo block
      const clone = cargoTemplate.content.cloneNode(true);
      cargoContainer.appendChild(clone);

      // 3. Renumber all
      renumberCargos();
    }

    // REMOVE CARGO
    if (e.target.closest(".btn-remove-cargo")) {
      const entry = e.target.closest(".cargo-entry");

      // Safety: At least one entry must remain
      const allEntries = document.querySelectorAll(".cargo-entry");
      if (entry && allEntries.length > 1) {
        entry.remove();

        // 1. If last entry has no add button, append it there
        const lastEntry = cargoContainer.querySelector(
          ".cargo-entry:last-child"
        );
        const hasAddBtn = lastEntry.querySelector(".addCargoBtn");
        if (!hasAddBtn) {
          const btnContainer = document.createElement("div");
          btnContainer.className = "cargo-btn-container";
          btnContainer.innerHTML = `
            <button type="button" class="btn-confirm-delivery addCargoBtn">
              + Add Another Cargo
            </button>`;
          lastEntry.appendChild(btnContainer);
        }

        // 2. Renumber
        renumberCargos();
      }
    }
  });

  renumberCargos();
});
