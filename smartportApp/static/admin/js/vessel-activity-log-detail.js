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
    currentVesselId = vesselId;
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

    // Group logs by date
    const groupedLogs = {};
    logs.forEach((log) => {
      if (!groupedLogs[log.date]) groupedLogs[log.date] = [];
      groupedLogs[log.date].push(log);
    });

    // Render grouped logs
    Object.entries(groupedLogs).forEach(([date, entries]) => {
      const logGroupDiv = document.createElement("div");
      logGroupDiv.className = "log-date-group";
      logGroupDiv.dataset.date = date;

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
/* --------------------- ADD ACTIVITY LOG MODAL --------------------- */
let currentVesselId = null;

// Show modal
const addLogModal = document.getElementById("addLogModal");
const addLogForm = document.getElementById("addLogForm");
const logDescriptionInput = document.getElementById("logDescription");
const cancelAddLogBtn = document.getElementById("cancelAddLogBtn");
const addLogCloseBtn = document.getElementById("addLogCloseBtn");

const addLogStatus = document.getElementById("add-log-status");
const addLogStatusIcon = document.getElementById("add-log-status-icon");
const addLogStatusMsg = document.getElementById("add-log-status-msg");

document.querySelector(".add-button").addEventListener("click", () => {
  logDescriptionInput.value = "";
  addLogStatus.style.display = "none";
  addLogModal.style.display = "flex";
});

cancelAddLogBtn.addEventListener("click", () => {
  addLogModal.style.display = "none";
});

addLogCloseBtn.addEventListener("click", () => {
  addLogModal.style.display = "none";
});

addLogForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const description = logDescriptionInput.value.trim();
  if (!description) return;

  const spinner = addLogForm.querySelector(".spinner");
  const btnText = addLogForm.querySelector(".btn-text");

  spinner.style.display = "inline-block";
  btnText.style.display = "none";

  try {
    const res = await fetch(`/vessel-log/add/${currentVesselId}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken,
      },
      body: JSON.stringify({ description }),
    });

    const data = await res.json();
    spinner.style.display = "none";
    btnText.style.display = "inline";

    if (!res.ok || !data.success) {
      addLogStatus.style.display = "block";
      addLogStatusIcon.className = "fas fa-times-circle";
      addLogStatusIcon.style.color = "var(--danger)";
      addLogStatusMsg.textContent = data.error || "Failed to add log.";
      return;
    }

    // Success
    addLogStatus.style.display = "block";
    addLogStatusIcon.className = "fas fa-check-circle";
    addLogStatusIcon.style.color = "var(--primary)";
    addLogStatusMsg.textContent = "Log added successfully!";

    addLogModal.style.display = "none";

    setTimeout(() => {
      // Append to top of log
      const newLog = data.log;
      const container = document.querySelector(".activity-log-container");

      let dateGroup = container.querySelector(
        `.log-date-group[data-date="${newLog.date}"]`
      );

      if (dateGroup) {
        // Insert at top of existing date group
        const tbody = dateGroup.querySelector("tbody");
        const newRow = document.createElement("tr");
        newRow.innerHTML = `
        <td class="time-column">${newLog.time}</td>
        <td class="user-column">${newLog.user}</td>
        <td class="type-column">${newLog.action_type}</td>
        <td class="description-column">${newLog.description}</td>
      `;

        newRow.classList.add("new-log-highlight");
        setTimeout(() => {
          newRow.classList.remove("new-log-highlight");
        }, 2000);
        tbody.prepend(newRow);
      } else {
        // Create new group and insert at top
        const newGroup = document.createElement("div");
        newGroup.className = "log-date-group";
        newGroup.dataset.date = newLog.date;

        newGroup.innerHTML = `
        <h3 class="log-date">${formatDate(newLog.date)}</h3>
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
            <tr>
              <td class="time-column">${newLog.time}</td>
              <td class="user-column">${newLog.user}</td>
              <td class="type-column">${newLog.action_type}</td>
              <td class="description-column">${newLog.description}</td>
            </tr>
          </tbody>
        </table>
      `;

        container.prepend(newGroup);
        const newRow = newGroup.querySelector("tr.new-log-highlight");
        setTimeout(() => newRow.classList.remove("new-log-highlight"), 2000);
      }
    }, 300);
  } catch (err) {
    spinner.style.display = "none";
    btnText.style.display = "inline";
    addLogStatus.style.display = "block";
    addLogStatusIcon.className = "fas fa-times-circle";
    addLogStatusIcon.style.color = "var(--danger)";
    addLogStatusMsg.textContent = "Network error. Try again.";
  }
});
