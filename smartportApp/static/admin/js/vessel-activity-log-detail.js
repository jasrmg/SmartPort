const vesselDetailSection = document.getElementById("vessel-detail-section");
const vesselListSection = document.getElementById("vessels-list-section");
const backToListBtn = document.getElementById("back-to-list");

// Back button
backToListBtn.addEventListener("click", () => {
  vesselDetailSection.style.display = "none";
  vesselListSection.style.display = "block";
});

// Bind click listeners to all vessel cards
const attachVesselCardClickHandlers = () => {
  document.querySelectorAll(".vessel-card").forEach((card) => {
    card.addEventListener("click", () => {
      const vesselId = card.dataset.vesselId;
      loadVesselDetail(vesselId);
    });
  });
};

const loadVesselDetail = async (vesselId) => {
  try {
    const res = await fetch(`/vessel-detail/${vesselId}/`);

    if (!res.ok) throw new Error("Failed to load detail.");

    const data = await res.json();

    const vessel = data;
    const logs = data.logs;

    const infoValues = document.querySelectorAll(".vessel-info-value");
    infoValues[0].textContent = vessel.name;
    infoValues[1].textContent = vessel.imo;
    infoValues[2].textContent = vessel.vessel_type;
    infoValues[3].textContent = vessel.gross_tonnage;
    infoValues[4].textContent = vessel.current_port;
    infoValues[5].textContent = vessel.last_port;

    const container = document.querySelector(".activity-log-container");
    container.innerHTML = "";

    // Step 1: Group logs by date
    const groupedLogs = {};
    logs.forEach((log) => {
      if (!groupedLogs[log.date]) groupedLogs[log.date] = [];
      groupedLogs[log.date].push(log);
    });

    // Step 2: Render grouped logs
    Object.entries(groupedLogs).forEach(([date, entries]) => {
      const logGroupDiv = document.createElement("div");
      logGroupDiv.className = "log-date-group";

      logGroupDiv.innerHTML = `
    <h3 class="log-date">${formatDate(date)}</h3>
    <table class="activity-log-table">
      <thead class="sticky">
        <tr>
          <th class="time-column">Time</th>
          <th class="user-column">Created By</th>
          <th class="type-column">Action Type</th>
          <th class="description-column">Description</th>
        </tr>
      </thead>
      <tbody>
        ${entries
          .map(
            (log) => `
          <tr>
            <td class="time-column">${log.time}</td>
            <td class="user-column">${log.user}</td>
            <td class="type-column">${log.action_type}</td>
            <td class="description-column">${log.description}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

      container.appendChild(logGroupDiv);
    });

    vesselListSection.style.display = "none";
    vesselDetailSection.style.display = "block";
  } catch (err) {
    console.error("Failed to load vessel detail:", err);
    alert("Could not load vessel information. Try again.");
  }
};
// Optional date formatter
const formatDate = (isoStr) => {
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};
