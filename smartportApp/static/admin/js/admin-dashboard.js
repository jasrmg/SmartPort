/* ------------------------------- START OF DASHBOARDNAV JS -------------------------------*/
// Toggle sidebar collapse
document.addEventListener("DOMContentLoaded", function () {
  const charts = initCharts();
  const sidebar = document.querySelector(".sidebar");
  const mainContent = document.querySelector(".main-content");

  document
    .querySelector(".collapse-btn")
    .addEventListener("click", function (e) {
      e.preventDefault();
      // Resize charts after sidebar toggle animation completes
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        charts.forEach((chart) => {
          chart.resize();
          chart.render();
        });
      }, 350);
    });
  // Handle window resize events
  window.addEventListener("resize", function () {
    // Resize charts on window resize
    charts.forEach((chart) => {
      chart.resize();
    });
  });
});
/* ------------------------------- END OF DASHBOARDNAV -------------------------------*/

/* ------------------------------- START OF ADMIN-DASHBOARD ACTIVE VESSEL SORT -------------------------------*/
const sortButtons = document.querySelectorAll(".sort-btn");

sortButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const columnIndex = parseInt(btn.dataset.column);
    const currentOrder = btn.dataset.order;
    const newOrder = currentOrder === "asc" ? "desc" : "asc";
    const icon = btn.querySelector("i");

    // Reset other buttons
    sortButtons.forEach((otherBtn) => {
      if (otherBtn !== btn) {
        otherBtn.dataset.order = "none";
        otherBtn.querySelector("i").className = "fas fa-sort";
      }
    });

    // Apply new order to current button
    btn.dataset.order = newOrder;
    icon.className = newOrder === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";

    // Sort rows
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

    // Re-append sorted rows
    rows.forEach((row) => tbody.appendChild(row));
  });
});
/* ------------------------------- END OF ADMIN-DASHBOARD ACTIVE VESSEL SORT -------------------------------*/

// OUTSIDE DOM LOADED:

const bgColors = ["#0a1f44", "#1e3a8a", "#4682b4"];
/* ------------------------------- CHARTS ------------------------------- */
// Initialize all charts
const initCharts = async () => {
  // ================================== BAR ==================================
  // Shipment Volume Bar Chart
  const ctx = document.getElementById("shipmentChart").getContext("2d");
  let shipmentChart;

  const updateShipmentChart = async (filter) => {
    try {
      const response = await fetch(
        `/api/chart/shipment-data/?filter=${filter}`
      );
      const data = await response.json();

      const { labels, data: values, comparison_stat } = data;

      if (shipmentChart) {
        shipmentChart.data.labels = labels;
        shipmentChart.data.datasets[0].data = values;
        shipmentChart.update();
      } else {
        shipmentChart = new Chart(ctx, {
          type: "bar",
          data: {
            labels: labels,
            datasets: [
              {
                label: "Cargo Quantity",
                data: values,
                backgroundColor: bgColors, // use --accent
              },
            ],
          },
          options: {
            plugins: {
              legend: {
                display: true,
                position: "bottom", // or 'top', 'left', 'right'
                labels: {
                  color: "#0a1f44", // match your theme
                  font: {
                    size: 12,
                  },
                },
              },
            },
          },
        });
      }

      // Update comparison stat
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
  };

  // Event listener
  document.getElementById("shipmentFilter").addEventListener("change", (e) => {
    updateShipmentChart(e.target.value);
  });

  // Initial load
  updateShipmentChart("this_month");

  // ================================== DOUGHNUT ==================================
  const vesselCtx = document.getElementById("vesselChart").getContext("2d");
  let vesselChart;

  const updateVesselChart = async () => {
    try {
      const response = await fetch("/api/vessel-status-chart/");
      const data = await response.json();

      const { labels, data: values, colors } = data;

      if (vesselChart) {
        vesselChart.data.labels = labels;
        vesselChart.data.datasets[0].data = values;
        vesselChart.data.datasets[0].backgroundColor = colors;
        vesselChart.update();
      } else {
        vesselChart = new Chart(vesselCtx, {
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
            animation: {
              duration: 300,
            },
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  boxWidth: 12,
                  padding: 20,
                  font: {
                    size: 12,
                    family: "'Montserrat', sans-serif",
                  },
                  color: "#1e3a8a",
                },
              },
            },
          },
        });
      }
      // Update the chart-stats-grid section dynamically
      const statsGrid = document.querySelector(".chart-stats-grid");
      statsGrid.innerHTML = "";

      labels.forEach((label, idx) => {
        const value = values[idx];
        const color = colors[idx];

        const statItem = document.createElement("div");
        statItem.className = "stat-item";

        const statValue = document.createElement("div");
        statValue.className = "stat-value";
        statValue.style.color = color;
        statValue.textContent = `${value}%`;

        const statLabel = document.createElement("div");
        statLabel.className = "stat-label";
        statLabel.textContent = label;

        statItem.appendChild(statValue);
        statItem.appendChild(statLabel);
        statsGrid.appendChild(statItem);
      });
    } catch (err) {
      console.error("Error fetching vessel chart data:", err);
    }
  };

  await updateVesselChart();

  // ================================== LINE ==================================
  // Incident Reports Line Chart
  const incidentCtx = document.getElementById("incidentChart").getContext("2d");
  const incidentChart = new Chart(incidentCtx, {
    type: "line",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [
        {
          label: "Incidents",
          data: [5, 3, 6, 2, 4, 7],
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
      animation: {
        duration: 300,
      },
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "#f0f0f0",
            drawBorder: false,
          },
        },
        x: {
          grid: { display: false },
        },
      },
    },
  });

  return [shipmentChart, vesselChart, incidentChart];
};
/* ------------------------------- END OF CHARTS -------------------------------*/

// UPDATE THE NOTIFICATION ICON BLUE
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
