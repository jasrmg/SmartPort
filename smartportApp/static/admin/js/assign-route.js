// -------------- TOAST NOTIFICATION --------------
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
// -------------- POPULATE THE DROPDOWN --------------
const vesselSelect = document.getElementById("vesselSelect");
const originSelect = document.getElementById("originSelect");
const destintaionSelect = document.getElementById("destinationSelect");
document.addEventListener("DOMContentLoaded", function () {
  window.addEventListener("storage", (event) => {
    if (event.key === "vesselAdded") {
      fetchAvailableVessels();
      localStorage.removeItem("vesselAdded");
    }
  });

  // -------------- FLATPICKER --------------
  setupFlatpickr("#departurePicker");
  setupFlatpickr("#etaPicker");

  // POPULATE THE DROPDOWNS
  fetchAvailableVessels();
  fetchPorts();

  // CLEAR THE DROPDOWNS:
  const clearBtn = document.getElementById("assignRouteClrBtn");
  const modal = document.getElementById("confirmClearModal");
  const confirmBtn = document.getElementById("confirmClearBtn");
  const cancelBtn = document.getElementById("cancelClearBtn");

  clearBtn.addEventListener("click", () => {
    modal.style.display = "flex";
  });

  cancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });

  // perform clear
  confirmBtn.addEventListener("click", () => {
    document.getElementById("vesselSelect").selectedIndex = 0;
    document.getElementById("departurePicker").value = "";
    document.getElementById("etaPicker").value = "";
    document.getElementById("originSelect").selectedIndex = 0;
    document.getElementById("destinationSelect").selectedIndex = 0;

    // hide modal:
    modal.style.display = "none";

    showToast("Form cleared succesfully!");
  });

  // ASSIGN ROUTE
  const assignBtn = document.getElementById("assignRouteBtn");
  const spinner = assignBtn.querySelector(".spinner");
  const assignText = assignBtn.querySelector(".btn-text");

  assignBtn.addEventListener("click", async () => {
    const vessel = document.getElementById("vesselSelect").value;
    const departure = document.getElementById("departurePicker").value;
    const eta = document.getElementById("etaPicker").value;
    const origin = document.getElementById("originSelect").value;
    const destination = document.getElementById("destinationSelect").value;

    if (!vessel || !departure || !eta || !origin || !destination) {
      showToast("Please fill out all fields", true);
      return;
    }

    // Date validations
    const now = new Date();
    const departureDate = new Date(departure);
    const etaDate = new Date(eta);

    if (isNaN(departureDate) || isNaN(etaDate)) {
      showToast("Invalid date/time selected.", true);
      return;
    }

    if (departureDate < now) {
      showToast("Departure must be in the future.", true);
      return;
    }

    if (etaDate <= departureDate) {
      showToast("ETA must be after departure time.", true);
      return;
    }

    try {
      // Update button state
      spinner.style.display = "inline-block";
      assignText.textContent = "Assigning...";

      const res = await fetch("/assign-route/submit/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        body: JSON.stringify({
          vessel_id: vessel,
          departure,
          eta,
          origin_id: origin,
          destination_id: destination,
        }),
      });

      const text = await res.text();
      let result;

      try {
        result = JSON.parse(text);
      } catch (err) {
        console.error("Non-JSON response received:", text);
        showToast(
          "Server error (HTML received instead of JSON). Check logs.",
          true
        );
        return;
      }
      // Reset button state
      spinner.style.display = "none";
      assignText.textContent = "Assign Route";

      if (!res.ok) {
        showToast(result.error || "Assignment failed.", true);
        return;
      }

      // Show success modal with voyage number
      showToast(`Voyage ${result.voyage_number} successfully created!`);
      fetchAvailableVessels();

      localStorage.setItem(
        "vesselUpdated",
        JSON.stringify({
          vesselId: parseInt(vessel),
          newStatus: "Assigned",
        })
      );

      // Optional: Clear form
      document.getElementById("vesselSelect").selectedIndex = 0;
      document.getElementById("departurePicker").value = "";
      document.getElementById("etaPicker").value = "";
      document.getElementById("originSelect").selectedIndex = 0;
      document.getElementById("destinationSelect").selectedIndex = 0;
    } catch (err) {
      console.error("Error assigning route:", err);
      alert("Unexpected error occurred.");
      spinner.style.display = "none";
      assignText.textContent = "Assign Route";
    }
  });

  vesselSelect.addEventListener("change", async (e) => {
    const vesselId = e.target.value;

    // Reset origin
    originSelect.innerHTML = '<option value="">Select Origin Port</option>';
    originSelect.disabled = false;

    if (!vesselId) return;

    try {
      const response = await fetch(
        `/get-vessel-last-destination/?vessel_id=${vesselId}`
      );
      const data = await response.json();

      if (data.has_voyage) {
        const option = document.createElement("option");
        option.value = data.last_destination_id;
        option.textContent = data.last_destination_name;
        option.selected = true;
        originSelect.appendChild(option);
        originSelect.disabled = true;
      } else {
        // Populate all ports
        const portRes = await fetch("/get-port-options/");
        const { ports } = await portRes.json();
        populateSelect(originSelect, ports, "name", "id");
      }
    } catch (error) {
      console.error("Failed to fetch vessel last destination:", error);
      showToast("Error retrieving vessel voyage history.", true);
    }
  });
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

const fetchAvailableVessels = async () => {
  try {
    const response = await fetch("/get-vessels/");
    const data = await response.json();

    if (!response.ok || !Array.isArray(data.vessels)) {
      console.error("Unexpected response:", data);
      showToast("Server returned invalid vessel list.", true);
      return;
    }

    vesselSelect.innerHTML = "<option value=''>Select Vessel</option>";

    data.vessels.forEach((vessel) => {
      const option = document.createElement("option");
      option.value = vessel.vessel_id;
      option.textContent = vessel.name;
      vesselSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error fetching vessels:", error);
    showToast("Failed to fetch vessels. Try again later.", true);
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
    dateFormat: "Y-m-d h:i K",
    time_24hr: false,
    minDate: "today",
    onOpen: function (selectedDates, dateStr, instance) {
      setTimeout(() => {
        centerFlatpickr(instance);
      }, 0);
    },
  });
};
