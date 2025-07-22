/* ------------------------------- GLOBAL CHART COLORS ------------------------------- */
const bgColors = ["#0a1f44", "#1e3a8a", "#4682b4"];

/* ------------------------------- INIT: DOCUMENT READY ------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initSidebarToggle();
  initTableSorting();
  initShipmentChart();
  initVesselChart();
  initIncidentChart();
  updateNotificationBadge();
});

/* ------------------------------- SIDEBAR TOGGLE ------------------------------- */
const initSidebarToggle = () => {
  const collapseBtn = document.querySelector(".collapse-btn");

  collapseBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
      Object.values(Chart.instances || {}).forEach((chart) => {
        chart.resize();
        chart.render();
      });
    }, 350);
  });

  window.addEventListener("resize", () => {
    Object.values(Chart.instances || {}).forEach((chart) => chart.resize());
  });
};

/* ------------------------------- TABLE SORTING ------------------------------- */
const initTableSorting = () => {
  const sortButtons = document.querySelectorAll(".sort-btn");

  sortButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const columnIndex = +btn.dataset.column;
      const currentOrder = btn.dataset.order;
      const newOrder = currentOrder === "asc" ? "desc" : "asc";
      const icon = btn.querySelector("i");

      sortButtons.forEach((b) => {
        if (b !== btn) {
          b.dataset.order = "none";
          b.querySelector("i").className = "fas fa-sort";
        }
      });

      btn.dataset.order = newOrder;
      icon.className =
        newOrder === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";

      const table = btn.closest("table");
      const tbody = table.querySelector("tbody");
      const rows = Array.from(tbody.querySelectorAll("tr"));

      rows.sort((a, b) => {
        const valA = a.children[columnIndex].textContent.trim().toLowerCase();
        const valB = b.children[columnIndex].textContent.trim().toLowerCase();
        return newOrder === "asc"
          ? valA.localeCompare(valB, "en", { numeric: true })
          : valB.localeCompare(valA, "en", { numeric: true });
      });

      rows.forEach((row) => tbody.appendChild(row));
    });
  });
};

/* ------------------------------- SHIPMENT BAR CHART ------------------------------- */
let shipmentChart;

const initShipmentChart = () => {
  const ctx = document.getElementById("shipmentChart")?.getContext("2d");
  const filterSelect = document.getElementById("shipmentFilter");

  const updateShipmentChart = async (filter = "this_month") => {
    try {
      const res = await fetch(`/api/chart/shipment-data/?filter=${filter}`);
      const { labels, data: values, comparison_stat } = await res.json();

      if (shipmentChart) {
        shipmentChart.data.labels = labels;
        shipmentChart.data.datasets[0].data = values;
        shipmentChart.update();
      } else {
        shipmentChart = new Chart(ctx, {
          type: "bar",
          data: {
            labels,
            datasets: [
              {
                label: "Cargo Quantity",
                data: values,
                backgroundColor: bgColors,
              },
            ],
          },
          options: {
            plugins: {
              legend: {
                display: true,
                position: "bottom",
                labels: { color: "#0a1f44", font: { size: 12 } },
              },
            },
          },
        });
      }

      const { percent_change, comparison_label } = comparison_stat;
      const statValueEl = document.querySelector(".stat-value");
      const statLabelEl = document.querySelector(".stat-label");

      statValueEl.textContent = `${
        percent_change >= 0 ? "+" : ""
      }${percent_change.toFixed(1)}%`;
      statValueEl.style.color = percent_change < 0 ? "#d14343" : "#2d9c5a";
      statLabelEl.textContent = comparison_label;
    } catch (err) {
      console.error("Error fetching shipment chart data:", err);
    }
  };

  filterSelect?.addEventListener("change", (e) =>
    updateShipmentChart(e.target.value)
  );
  updateShipmentChart();
};

/* ------------------------------- VESSEL DOUGHNUT CHART ------------------------------- */
let vesselChart;

const initVesselChart = () => {
  const ctx = document.getElementById("vesselChart")?.getContext("2d");

  const updateVesselChart = async () => {
    try {
      const res = await fetch("/api/vessel-status-chart/");
      const { labels, data: values, colors } = await res.json();

      if (vesselChart) {
        Object.assign(vesselChart.data, {
          labels,
          datasets: [
            {
              ...vesselChart.data.datasets[0],
              data: values,
              backgroundColor: colors,
            },
          ],
        });
        vesselChart.update();
      } else {
        vesselChart = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels,
            datasets: [
              {
                data: values,
                backgroundColor: colors,
                borderWidth: 0,
                cutout: "70%",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  boxWidth: 12,
                  padding: 20,
                  font: { size: 12, family: "'Montserrat', sans-serif" },
                  color: "#1e3a8a",
                },
              },
            },
          },
        });
      }

      const statsGrid = document.querySelector(".chart-stats-grid");
      statsGrid.innerHTML = "";

      labels.forEach((label, i) => {
        statsGrid.innerHTML += `
          <div class="stat-item">
            <div class="stat-value" style="color: ${colors[i]}">${values[i]}%</div>
            <div class="stat-label">${label}</div>
          </div>`;
      });
    } catch (err) {
      console.error("Error fetching vessel chart data:", err);
    }
  };

  updateVesselChart();
};

/* ------------------------------- INCIDENT LINE CHART ------------------------------- */
let incidentChart;

const initIncidentChart = () => {
  const ctx = document.getElementById("incidentChart")?.getContext("2d");
  const filterSelect = document.getElementById("incidentFilter");

  const updateIncidentChart = async (filter = "last_6_months") => {
    try {
      const res = await fetch(`/api/chart/incident-data/?filter=${filter}`);
      const data = await res.json();

      if (incidentChart) {
        incidentChart.data.labels = data.labels;
        incidentChart.data.datasets[0].data = data.counts;
        incidentChart.update();
      } else {
        incidentChart = new Chart(ctx, {
          type: "line",
          data: {
            labels: data.labels,
            datasets: [
              {
                label: "Incidents",
                data: data.counts,
                fill: false,
                borderColor: "#D14343",
                tension: 0.3,
                pointBackgroundColor: "#D14343",
                pointBorderColor: "#fff",
                pointHoverRadius: 6,
                pointRadius: 4,
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: "#f0f0f0", drawBorder: false },
              },
              x: { grid: { display: false } },
            },
          },
        });
      }

      document.querySelector(
        ".chart-stat .stat-value"
      ).textContent = `+${data.this_month_count}`;
    } catch (err) {
      console.error("Failed to fetch incident chart data:", err);
    }
  };

  filterSelect?.addEventListener("change", (e) =>
    updateIncidentChart(e.target.value)
  );
  updateIncidentChart();
};

/* ------------------------------- NOTIFICATION BADGE ------------------------------- */
const updateNotificationBadge = () => {
  const unreadCount = document.querySelectorAll(
    ".notification-item.unread"
  ).length;
  const badge = document.querySelector(".notification-badge");

  badge.style.display = unreadCount > 0 ? "inline-block" : "none";
  if (unreadCount > 0) badge.textContent = unreadCount;
};
