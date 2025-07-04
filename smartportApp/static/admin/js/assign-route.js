// -------------- POPULATE THE DROPDOWN --------------
const vesselSelect = document.getElementById("vesselSelect");
const originSelect = document.getElementById("originSelect");
const destintaionSelect = document.getElementById("destinationSelect");
document.addEventListener("DOMContentLoaded", function () {
  // -------------- FLATPICKER --------------
  setupFlatpickr("#departurePicker");
  setupFlatpickr("#etaPicker");

  populateVesselDropdown();
  fetchPorts();
});

// OUTSIDE DOM
const populateSelect = (selectEl, datalist, labelKey, valueKey) => {
  datalist.forEach((item) => {
    const option = document.createElement("option");
    option.value = item[valueKey];
    option.textContent = item[labelKey];
    selectEl.appendChild(option);
  });
};

const fetchVessels = async () => {
  try {
    const response = await fetch("/get-vessels/");
    const { vessels } = await response.json();
    populateSelect(vesselSelect, vessels, "name", "vessel_id");
  } catch (error) {
    console.error("Failed to load vessels", error);
  }
};

const populateVesselDropdown = async () => {
  try {
    const res = await fetch("/get-vessels/");
    const { vessels } = await res.json();

    // Clear current options
    vesselSelect.innerHTML = "";

    if (vessels.length === 0) {
      // Show only a disabled message
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = "No available vessels";
      emptyOption.disabled = true;
      emptyOption.selected = true;
      vesselSelect.appendChild(emptyOption);
      vesselSelect.disabled = true;
      return;
    }

    // Enable dropdown if it was disabled before
    vesselSelect.disabled = false;

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose a vessel...";
    placeholder.disabled = true;
    placeholder.selected = true;
    vesselSelect.appendChild(placeholder);

    // Add vessels
    vessels.forEach((vessel) => {
      const option = document.createElement("option");
      option.value = vessel.vessel_id;
      option.textContent = vessel.name;
      vesselSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Failed to fetch vessels:", error);
    // Optional: Show error message in UI
  }
};

const fetchPorts = async () => {
  try {
    const response = await fetch("/get-port-options/");
    const { ports } = await response.json();
    populateSelect(originSelect, ports, "name", "id");
    populateSelect(destinationSelect, ports, "name", "id");
  } catch (error) {
    console.error("Failed to load ports, ", error);
  }
};

const centerFlatpickr = (instance) => {
  const calendar = instance.calendarContainer;
  const inputRect = instance._input.getBoundingClientRect();
  const calendarRect = calendar.getBoundingClientRect();

  const left = inputRect.left + inputRect.width / 2 - calendarRect.width / 2;
  const top = inputRect.top + window.scrollY - calendarRect.height - 8; // small gap *above* input

  calendar.style.position = "absolute";
  calendar.style.left = `${left}px`;
  calendar.style.top = `${top}px`;
};

const setupFlatpickr = (selector) => {
  flatpickr(selector, {
    enableTime: true,
    dateFormat: "Y-m-d H:i",
    time_24hr: true,
    minDate: "today",
    onOpen: function (selectedDates, dateStr, instance) {
      setTimeout(() => {
        centerFlatpickr(instance);
      }, 0);
    },
  });
};

setupFlatpickr("#departurePicker");
setupFlatpickr("#etaPicker");
