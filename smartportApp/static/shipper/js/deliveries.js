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

// -------------------- FETCH DELIVERY STATUS --------------------
// const fetchDeliveryStatus = async (cargoId) => {
//   try {
//     const response = await fetch(`/get-delivery-status/${cargoId}/`);
//     const data = await response.json();
//     console.log(data);
//     if (response.ok) {
//       return data.status || "Pending";
//     }
//     return "Error";
//   } catch (error) {
//     console.error("Failed to fetch delivery status:", error);
//     return "Error";
//   }
// };

document.addEventListener("DOMContentLoaded", () => {
  populatePorts();
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
