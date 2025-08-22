// Shipment Volume Chart
let shipmentChart;

function loadShipmentChart(period = "thismonth") {
  // Show loading state
  const canvas = document.getElementById("shipmentChart");
  const ctx = canvas.getContext("2d");

  // Destroy existing chart if it exists
  if (shipmentChart) {
    shipmentChart.destroy();
  }

  // Fetch data from API
  fetch(`/api/shipment-volume-chart/?period=${period}`)
    .then((response) => response.json())
    .then((data) => {
      // Update the percentage change display
      const statValue = document.querySelector(".chart-stat .stat-value");
      if (statValue) {
        const change = data.stats.percentage_change;
        statValue.textContent = `${change >= 0 ? "+" : ""}${change}%`;
        statValue.style.color = change >= 0 ? "#10b981" : "#ef4444";
      }

      // Create the chart
      shipmentChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: data.labels,
          datasets: data.datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              mode: "index",
              intersect: false,
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              titleColor: "#fff",
              bodyColor: "#fff",
              borderColor: "#1e3a8a",
              borderWidth: 1,
              callbacks: {
                label: function (context) {
                  return `Cargo Volume: ${context.parsed.y}`;
                },
              },
            },
          },
          scales: {
            x: {
              display: true,
              grid: {
                display: false,
              },
              ticks: {
                font: {
                  size: 12,
                },
                color: "#6b7280",
              },
            },
            y: {
              display: true,
              beginAtZero: true,
              grid: {
                color: "rgba(0, 0, 0, 0.1)",
              },
              ticks: {
                font: {
                  size: 12,
                },
                color: "#6b7280",
              },
            },
          },
          elements: {
            point: {
              radius: 4,
              hoverRadius: 6,
            },
            line: {
              tension: 0.4,
            },
          },
        },
      });
    })
    .catch((error) => {
      console.error("Error loading chart data:", error);
      // You can show an error message in the chart container
    });
}

// Initialize chart when page loads
document.addEventListener("DOMContentLoaded", function () {
  loadShipmentChart();

  // Handle filter dropdown changes
  const filterSelect = document.querySelector(
    "#analyticsSection .chart-filter"
  );
  if (filterSelect) {
    filterSelect.addEventListener("change", function () {
      const selectedValue = this.value;
      let period;

      switch (selectedValue) {
        case "This Month":
          period = "thismonth";
          break;
        case "Last 3 Months":
          period = "3months";
          break;
        case "Last 6 Months":
          period = "6months";
          break;
        case "Year to Date":
          period = "ytd";
          break;
        case "Last Year":
          period = "lastyear";
          break;
        default:
          period = "thismonth";
      }

      loadShipmentChart(period);
    });
  }
});

// Optional: Refresh chart data periodically (every 5 minutes)
setInterval(() => {
  const currentFilter = document.querySelector(
    "#analyticsSection .chart-filter"
  ).value;
  let period;

  switch (currentFilter) {
    case "This Month":
      period = "thismonth";
      break;
    case "Last 3 Months":
      period = "3months";
      break;
    case "Last 6 Months":
      period = "6months";
      break;
    case "Year to Date":
      period = "ytd";
      break;
    case "Last Year":
      period = "lastyear";
      break;
    default:
      period = "thismonth";
  }

  loadShipmentChart(period);
}, 300000); // 5 minutes
