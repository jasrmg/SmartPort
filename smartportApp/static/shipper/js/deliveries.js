const originSelect = document.getElementById("originPortSelect");
const destinationSelect = document.getElementById("destinationPortSelect");

document.addEventListener("DOMContentLoaded", () => {
  populatePorts();
  setupFlatpickr();
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
