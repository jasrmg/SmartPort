const originSelect = document.getElementById("originPortSelect");
const destinationSelect = document.getElementById("destinationPortSelect");

// -------------------- SHOW TOAST --------------------
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

// -------------------- MODAL STATE --------------------
let selectedCargoId = null;

// -------------------- BIND BUTTONS --------------------
export const bindDeliveryButtons = () => {
  const btns = document.querySelectorAll(".btn-icon.approve");

  document.querySelectorAll(".btn-icon.approve").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedCargoId = btn.dataset.cargoId;

      // You may need to store additional data using data-* attributes on the button
      const description = btn.dataset.description || "N/A";
      const quantity = btn.dataset.quantity || "0";
      const vessel = btn.dataset.vessel || "N/A";

      document.querySelector("#deliveryDescription .inline-text").textContent =
        description;
      document.querySelector("#deliveryQuantity .inline-text").textContent =
        quantity;
      document.querySelector("#deliveryVessel .inline-text").textContent =
        vessel;

      document.getElementById("deliveryRemarks").value = "";
      document.getElementById("confirmDeliveryModal").style.display = "flex";
    });
  });
};

// -------------------- MODAL CONTROL --------------------
const confirmDeliveryModal = document.getElementById("confirmDeliveryModal");
document
  .getElementById("closeConfirmDeliveryModal")
  .addEventListener("click", () => {
    confirmDeliveryModal.style.display = "none";
  });

document
  .getElementById("cancelConfirmDelivery")
  .addEventListener("click", () => {
    confirmDeliveryModal.style.display = "none";
  });

window.addEventListener("click", (e) => {
  if (e.target === document.getElementById("confirmDeliveryModal")) {
    confirmDeliveryModal.style.display = "none";
  }
});

// -------------------- CONFIRM DELIVERY --------------------
document
  .getElementById("confirmDeliveryBtn")
  .addEventListener("click", async () => {
    const remarks = document.getElementById("deliveryRemarks").value;
    const spinner = document.querySelector("#confirmDeliveryBtn .spinner");
    const btnText = document.querySelector("#confirmDeliveryBtn .btn-text");

    if (!selectedCargoId) return;

    spinner.style.display = "inline-block";
    btnText.style.display = "none";

    try {
      const response = await fetch(
        `/shipper/confirm-delivery/${selectedCargoId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken,
          },
          body: JSON.stringify({
            cargo_id: selectedCargoId,
            remarks: remarks,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        showToast("Delivery confirmed!");
        document.getElementById("confirmDeliveryModal").style.display = "none";
      } else {
        showToast(data.error || "Failed to confirm delivery.", true);
      }
    } catch (error) {
      showToast("Network error. Please try again.", true);
    } finally {
      spinner.style.display = "none";
      btnText.style.display = "inline";
    }
  });

document.addEventListener("DOMContentLoaded", () => {
  populatePorts();
  // -------------------- INIT --------------------
  bindDeliveryButtons();
});

// OUTSIDE DOM

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
