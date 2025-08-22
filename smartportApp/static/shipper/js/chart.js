// Shipment Volume Chart
let shipmentChart = null;

// Convert dropdown text to API parameters
const convertToPeriodParam = (displayValue) => {
  switch (displayValue) {
    case "This Month":
      return "thismonth";
    case "Last 3 Months":
      return "3months";
    case "Last 6 Months":
      return "6months";
    case "Year to Date":
      return "ytd";
    case "Last Year":
      return "lastyear";
    default:
      return "thismonth";
  }
};

// Safely destroy existing chart
const destroyExistingChart = () => {
  if (shipmentChart && typeof shipmentChart.destroy === "function") {
    try {
      shipmentChart.destroy();
    } catch (e) {
      console.warn("Error destroying chart:", e);
    }
    shipmentChart = null;
  }

  // Clear canvas as backup
  const canvas = document.getElementById("shipmentChart");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
};

// Update statistics display
const updateChartStats = (stats) => {
  const statValue = document.querySelector(".chart-stat .stat-value");
  if (statValue && stats) {
    const change = stats.percentage_change;
    statValue.textContent = `${change >= 0 ? "+" : ""}${change}%`;
    statValue.style.color = change >= 0 ? "#10b981" : "#ef4444";
  }
};

// Create the chart
const createChart = (ctx, data) => {
  try {
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
              label: (context) => `Cargo Volume: ${context.parsed.y}`,
            },
          },
        },
        scales: {
          x: {
            display: true,
            grid: { display: false },
            ticks: {
              font: { size: 12 },
              color: "#6b7280",
            },
          },
          y: {
            display: true,
            beginAtZero: true,
            grid: { color: "rgba(0, 0, 0, 0.1)" },
            ticks: {
              font: { size: 12 },
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

    console.log("Chart created successfully");
  } catch (error) {
    console.error("Error creating chart:", error);
    showChartError();
  }
};

// Loading states
const showChartLoading = () => {
  const container = document.querySelector(".chart-container");
  if (container) {
    container.style.opacity = "0.6";
  }
};

const hideChartLoading = () => {
  const container = document.querySelector(".chart-container");
  if (container) {
    container.style.opacity = "1";
  }
};

const showChartError = () => {
  const container = document.querySelector(".chart-container");
  if (container) {
    container.innerHTML =
      '<p style="text-align: center; color: #ef4444; padding: 2rem;">Error loading chart data. Please try again.</p>';
  }
};

// Main function to load chart data
const loadShipmentChart = (period = "thismonth") => {
  console.log("Loading chart for period:", period);

  const canvas = document.getElementById("shipmentChart");
  if (!canvas) {
    console.error("Canvas element not found");
    return;
  }

  const ctx = canvas.getContext("2d");

  // Destroy existing chart
  destroyExistingChart();

  // Show loading state
  showChartLoading();

  // Fetch data from API
  fetch(`/api/shipment-volume-chart/?period=${period}`)
    .then((response) => {
      console.log("API response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Received chart data:", data);

      // Update UI elements with new data
      updateChartStats(data.stats);

      // Create new chart
      createChart(ctx, data);

      // Hide loading state
      hideChartLoading();
    })
    .catch((error) => {
      console.error("Error loading chart data:", error);
      showChartError();
    });
};

// Initialize everything when page loads
document.addEventListener("DOMContentLoaded", () => {
  // Load initial chart
  loadShipmentChart("thismonth");

  // Handle filter dropdown changes
  const filterSelect = document.querySelector(
    "#analyticsSection .chart-filter"
  );
  if (filterSelect) {
    filterSelect.addEventListener("change", () => {
      console.log("Filter changed to:", filterSelect.value);

      const period = convertToPeriodParam(filterSelect.value);
      console.log("Loading chart with period:", period);

      loadShipmentChart(period);
    });
  }
});

// Optional: Refresh chart data periodically (every 5 minutes)
setInterval(() => {
  const filterSelect = document.querySelector(
    "#analyticsSection .chart-filter"
  );
  if (filterSelect) {
    const period = convertToPeriodParam(filterSelect.value);
    loadShipmentChart(period);
  }
}, 300000);
