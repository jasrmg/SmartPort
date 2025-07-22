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
function initSidebarToggle() {
  const collapseBtn = document.querySelector(".collapse-btn");
  const charts = Chart.instances ? Object.values(Chart.instances) : [];

  collapseBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
      charts.forEach((chart) => {
        chart.resize();
        chart.render();
      });
    }, 350);
  });

  window.addEventListener("resize", () => {
    charts.forEach((chart) => chart.resize());
  });
}

/* ------------------------------- TABLE SORTING ------------------------------- */
function initTableSorting() {
  const sortButtons = document.querySelectorAll(".sort-btn");

  sortButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const columnIndex = parseInt(btn.dataset.column);
      const currentOrder = btn.dataset.order;
      const newOrder = currentOrder === "asc" ? "desc" : "asc";
      const icon = btn.querySelector("i");

      sortButtons.forEach((otherBtn) => {
        if (otherBtn !== btn) {
          otherBtn.dataset.order = "none";
          otherBtn.querySelector("i").className = "fas fa-sort";
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
}

/* ------------------------------- SHIPMENT BAR CHART ------------------------------- */
let shipmentChart;

function initShipmentChart() {
  const ctx = document.getElementById("shipmentChart")?.getContext("2d");
  const filterSelect = document.getElementById("shipmentFilter");

  async function updateShipmentChart(filter = "this_month") {
    try {
      const response = await fetch(
        `/api/chart/shipment-data/?filter=${filter}`
      );
      const { labels, data: values, comparison_stat } = await response.json();

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
                labels: {
                  color: "#0a1f44",
                  font: { size: 12 },
                },
              },
            },
          },
        });
      }

      const statValueEl = document.querySelector(".stat-value");
      const statLabelEl = document.querySelector(".stat-label");
      const change = comparison_stat.percent_change;
      const label = comparison_stat.comparison_label;

      statValueEl.textContent = `${change >= 0 ? "+" : ""}${change.toFixed(
        1
      )}%`;
      statValueEl.style.color = change < 0 ? "#d14343" : "#2d9c5a";
      statLabelEl.textContent = label;
    } catch (err) {
      console.error("Error fetching shipment chart data:", err);
    }
  }

  filterSelect?.addEventListener("change", (e) =>
    updateShipmentChart(e.target.value)
  );
  updateShipmentChart();
}

/* ------------------------------- VESSEL DOUGHNUT CHART ------------------------------- */
let vesselChart;

function initVesselChart() {
  const ctx = document.getElementById("vesselChart")?.getContext("2d");

  async function updateVesselChart() {
    try {
      const res = await fetch("/api/vessel-status-chart/");
      const { labels, data: values, colors } = await res.json();

      if (vesselChart) {
        vesselChart.data.labels = labels;
        vesselChart.data.datasets[0].data = values;
        vesselChart.data.datasets[0].backgroundColor = colors;
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
        const item = document.createElement("div");
        item.className = "stat-item";

        const valueDiv = document.createElement("div");
        valueDiv.className = "stat-value";
        valueDiv.style.color = colors[i];
        valueDiv.textContent = `${values[i]}%`;

        const labelDiv = document.createElement("div");
        labelDiv.className = "stat-label";
        labelDiv.textContent = label;

        item.appendChild(valueDiv);
        item.appendChild(labelDiv);
        statsGrid.appendChild(item);
      });
    } catch (err) {
      console.error("Error fetching vessel chart data:", err);
    }
  }

  updateVesselChart();
}

/* ------------------------------- INCIDENT LINE CHART ------------------------------- */
let incidentChart;

const initIncidentChart = () => {
  const ctx = document.getElementById("incidentChart").getContext("2d");
  let incidentChart;

  const fetchIncidentChartData = async (filter = "last_6_months") => {
    try {
      const res = await fetch(`/api/chart/incident-data/?filter=${filter}`);
      if (!res.ok) throw new Error("Failed to fetch");

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

      // Update footer stat
      document.querySelector(
        ".chart-stat .stat-value"
      ).textContent = `+${data.this_month_count}`;
    } catch (err) {
      console.error("Failed to fetch incident chart data:", err);
    }
  };

  // Initial load
  fetchIncidentChartData();

  // Bind filter
  const filterDropdown = document.getElementById("incidentFilter");
  filterDropdown?.addEventListener("change", () => {
    fetchIncidentChartData(filterDropdown.value);
  });
};

/* ------------------------------- NOTIFICATION BADGE ------------------------------- */
function updateNotificationBadge() {
  const unreadCount = document.querySelectorAll(
    ".notification-item.unread"
  ).length;
  const badge = document.querySelector(".notification-badge");

  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }
}
