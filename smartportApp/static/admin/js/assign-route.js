document.addEventListener("DOMContentLoaded", function () {
  // -------------- FLATPICKER --------------
  setupFlatpickr("#departurePicker");
  setupFlatpickr("#etaPicker");
});

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
