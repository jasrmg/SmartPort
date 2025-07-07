document.addEventListener("DOMContentLoaded", function () {
  const listSection = document.getElementById("voyage-reports-list-section");
  const detailSection = document.getElementById("voyageReportContent");
  const backButton = document.getElementById("back-to-voyage-list");

  const attachClickEvents = () => {
    const cards = document.querySelectorAll(".voyage-report-card");
    cards.forEach((card) => {
      card.addEventListener("click", () => {
        const reportId = card.dataset.reportId;

        listSection.style.display = "none";
        detailSection.style.display = "block";

        fetch(`/voyage-report/detail/${reportId}`, {
          headers: {
            "X-Requested-With": "XMLHttpRequest",
          },
        })
          .then((response) => response.json())
          .then((data) => populateVoyageDetail(data))
          .catch((err) => console.error("Failed to fetch report detail", err));
      });
    });
  };

  if (backButton) {
    backButton.addEventListener("click", () => {
      detailSection.style.display = "none";
      listSection.style.display = "block";
    });
  }

  attachClickEvents(); // Run on initial load

  // Also expose it so you can rebind after pagination fetch:
  window.rebindVoyageCardEvents = attachClickEvents;
});

const populateVoyageDetail = (data) => {
  const parsed = data.data; // NEW: extract `data` key
  const summary = parsed.voyage_summary;
  const vessel = parsed.vessel;

  document.querySelector('[data-field="voyageNumber"]').textContent =
    summary.voyage_number;
  document.querySelector('[data-field="departurePort"]').textContent =
    summary.departure_port;
  document.querySelector('[data-field="departureDateTime"]').textContent =
    formatDate(summary.departure_date);
  document.querySelector('[data-field="arrivalPort"]').textContent =
    summary.arrival_port;
  document.querySelector('[data-field="arrivalDateTime"]').textContent =
    formatDate(summary.arrival_date);
  document.querySelector('[data-field="totalDuration"]').textContent =
    summary.duration.startsWith("-") ? "—" : summary.duration;
  document.querySelector('[data-field="generatedBy"]').textContent =
    summary.generated_by;
  document.querySelector('[data-field="Status"]').textContent = summary.status;
  document.querySelector('[data-field="delayReason"]').textContent =
    summary.delayed_reason;

  document.querySelector('[data-field="vesselName"]').textContent = vessel.name;
  document.querySelector('[data-field="imoNumber"]').textContent = vessel.imo;
  document.querySelector('[data-field="vesselType"]').textContent = vessel.type;
};

const formatReadable = (str) => {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatDate = (isoStr) => {
  const date = new Date(isoStr);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};
