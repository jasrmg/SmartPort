// -------------- POPULATE THE DROPDOWN --------------
const vesselSelect = document.getElementById("vesselSelect");
const originSelect = document.getElementById("originSelect");
const destintaionSelect = document.getElementById("destinationSelect");

const voyageInfo = document.getElementById("assignVoyageInfo");
const successModal = document.getElementById("assignSuccessModal");
const closeSuccessBtn = document.getElementById("assignCloseSuccessModal");

const errorModal = document.getElementById("assignErrorModal");
const errorMsg = document.getElementById("assignErrorMsg");

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
  });

  // ASSIGN ROUTE
  const assignBtn = document.getElementById("assignRouteBtn");
  const spinner = assignBtn.querySelector(".spinner");
  const assignText = assignBtn.querySelector(".btn-text");

  // error
  const closeErrorBtn = document.getElementById("assignCloseErrorModal");
  closeErrorBtn.addEventListener("click", () => {
    errorModal.style.display = "none";
  });

  assignBtn.addEventListener("click", async () => {
    const vessel = document.getElementById("vesselSelect").value;
    const departure = document.getElementById("departurePicker").value;
    const eta = document.getElementById("etaPicker").value;
    const origin = document.getElementById("originSelect").value;
    const destination = document.getElementById("destinationSelect").value;

    if (!vessel || !departure || !eta || !origin || !destination) {
      showErrorModal("Please fill out all fields");
      return;
    }

    // Date validations
    const now = new Date();
    const departureDate = new Date(departure);
    const etaDate = new Date(eta);

    if (isNaN(departureDate) || isNaN(etaDate)) {
      showErrorModal("Invalid date/time selected.");
      return;
    }

    if (departureDate < now) {
      showErrorModal("Departure must be in the future.");
      return;
    }

    if (etaDate <= departureDate) {
      showErrorModal("ETA must be after departure time.");
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
        showErrorModal(
          "Server error (HTML received instead of JSON). Check logs."
        );
        return;
      }
      // Reset button state
      spinner.style.display = "none";
      assignText.textContent = "Assign Route";

      if (!res.ok) {
        showErrorModal(result.error || "Assignment failed.");
        return;
      }

      // Show success modal with voyage number
      showSuccessModal(result.voyage_number);
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

  closeSuccessBtn.addEventListener("click", () => {
    successModal.style.display = "none";
  });
});

// OUTSIDE DOM

const showSuccessModal = (voyageNumber) => {
  voyageInfo.innerHTML = `Voyage <strong>${voyageNumber}</strong> has been successfully created.`;
  successModal.style.display = "flex";
  successModal.classList.remove("fade-out");

  setTimeout(() => {
    successModal.classList.add("fade-out");
    setTimeout(() => {
      successModal.style.display = "none";
      successModal.classList.remove("fade-out");
    }, 400); // match transition duration
  }, 3000);
};

const showErrorModal = (message) => {
  errorMsg.textContent = message;
  errorModal.style.display = "flex";
};

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
      showErrorModal("Server returned invalid vessel list.");
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
    showErrorModal("Failed to fetch vessels. Try again later.");
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
