document.addEventListener("DOMContentLoaded", async () => {
  // TO CLEAR THE REPORTS WHEN CLOSED:
  const clearReportDetail = () => {
    // Clear voyage number title
    document.querySelector("#detail-voyage-number").textContent = "Loading...";

    // Clear vessel details
    document.querySelector('[data-field="vesselName"]').textContent = "—";
    document.querySelector('[data-field="imoNumber"]').textContent = "—";
    document.querySelector('[data-field="vesselType"]').textContent = "—";

    // Clear voyage summary
    document.querySelector('[data-field="voyageNumber"]').textContent = "—";
    document.querySelector('[data-field="departurePort"]').textContent = "—";
    document.querySelector('[data-field="departureDateTime"]').textContent =
      "—";
    document.querySelector('[data-field="arrivalPort"]').textContent = "—";
    document.querySelector('[data-field="arrivalDateTime"]').textContent = "—";
    document.querySelector('[data-field="totalDuration"]').textContent = "—";
    document.querySelector('[data-field="generatedBy"]').textContent = "—";
    document.querySelector('[data-field="Status"]').textContent = "—";
    document.querySelector('[data-field="delayReason"]').textContent = "—";
  };
  // PREFILLING THE PORTS OPTION
  const originSelect = document.getElementById("filter-origin-port");
  const destinationSelect = document.getElementById("filter-destination-port");

  try {
    const res = await fetch("/get-port-options/");
    const { ports } = await res.json();

    let i = 0;
    ports.forEach((port) => {
      const optionOrigin = document.createElement("option");
      optionOrigin.value = port.id;
      optionOrigin.textContent = port.name;
      console.log(i + "=" + optionOrigin.value);
      i++;
      const optionDestination = optionOrigin.cloneNode(true);

      originSelect.appendChild(optionOrigin);
      destinationSelect.appendChild(optionDestination);
    });
  } catch (err) {
    console.error("❌ Failed to load port options:", err);
  }

  const listSection = document.getElementById("voyage-reports-list-section");
  const detailSection = document.getElementById("voyageReportContent");
  const backButton = document.getElementById("back-to-voyage-list");

  const attachClickEvents = () => {
    const cards = document.querySelectorAll(".voyage-report-card");
    cards.forEach((card) => {
      card.addEventListener("click", () => {
        const reportId = card.dataset.reportId;

        clearReportDetail();

        listSection.style.display = "none";
        detailSection.style.display = "block";

        toggleHeaderDisplay(false);

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

      clearReportDetail();
      toggleHeaderDisplay(true);
    });
  }

  attachClickEvents(); // Run on initial load

  // Also expose it so you can rebind after pagination fetch:
  window.rebindVoyageCardEvents = attachClickEvents;

  // HIDE BUTTONS
  const hideButtons = (state) => {
    if (state === "hide") {
      document
        .querySelectorAll(".print-hidden")
        .forEach((el) => (el.style.display = "none"));
    } else {
      document
        .querySelectorAll(".print-hidden")
        .forEach((el) => (el.style.display = ""));
    }
  };

  // ------------- PRINT BUTTON -------------
  const printBtn = document.getElementById("printReport");
  if (printBtn) {
    printBtn.addEventListener("click", () => window.print());
  }

  // ------------- PDF BUTTON -------------
  const PDFBtn = document.getElementById("exportPdf");
  if (PDFBtn) {
    PDFBtn.addEventListener("click", () => {
      const reportElement = document.getElementById("voyageReportContent");
      const voyageNumber =
        document.querySelector('[data-field="voyageNumber"]')?.innerText ||
        "voyage-report";
      // hide the buttons:
      hideButtons("hide");
      const opt = {
        margin: [1, 0, 0, 0],
        filename: `${voyageNumber.trim().replace(/\s+/g, "-")}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          scrollY: 0,
          windowWidth: document.body.scrollWidth,
          windowHeight: document.body.scrollHeight,
        },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      html2pdf()
        .set(opt)
        .from(reportElement)
        .save()
        .then(() => {
          // return the button
          hideButtons("show");
        });
    });
  }
});

const populateVoyageDetail = (data) => {
  const parsed = data.data; // NEW: extract `data` key
  const summary = parsed.voyage_summary;
  const vessel = parsed.vessel;

  const rawDuration = summary.duration;

  document.querySelector("#detail-voyage-number").textContent =
    summary.voyage_number;
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
  if (!rawDuration || rawDuration.startsWith("-")) {
    document.querySelector('[data-field="totalDuration"]').textContent = "—";
  } else {
    const match = rawDuration.match(
      /(?:(\d+)\s+days?,\s*)?(\d{1,2}):(\d{1,2})/
    );

    const daysNum = match?.[1] ? parseInt(match[1]) : 0;
    const hoursNum = match?.[2] ? parseInt(match[2]) : 0;
    const minsNum = match?.[3] ? parseInt(match[3]) : 0;

    const parts = [];

    if (daysNum > 0) {
      parts.push(`${daysNum} day${daysNum !== 1 ? "s" : ""}`);
    }
    if (hoursNum > 0) {
      parts.push(`${hoursNum} hour${hoursNum !== 1 ? "s" : ""}`);
    }
    if (minsNum > 0) {
      parts.push(`${minsNum} min${minsNum !== 1 ? "s" : ""}`);
    }

    const displayText = parts.join(" and ");
    document.querySelector('[data-field="totalDuration"]').textContent =
      displayText || "—";
  }

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
  if (str) return "-";
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
