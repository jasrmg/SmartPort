// Initialize Leaflet map
const map = L.map("vessel-map").setView([12.8797, 121.774], 6);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {}).addTo(
  map
);

// Icons
const portIcon = L.icon({
  iconUrl: "/static/port2.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const vesselIcon = L.icon({
  iconUrl: "/static/vessel.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Load all ports
const fetchPorts = async () => {
  try {
    const response = await fetch("/get-ports/");
    const data = await response.json();

    data.ports.forEach((port) => {
      const marker = L.marker([port.latitude, port.longitude], {
        icon: portIcon,
      }).addTo(map);

      marker.bindPopup(`
        <strong>${port.name} (${port.code})</strong><br />
        ${port.description || "No description"}
      `);
    });
  } catch (err) {
    console.error("Port loading failed", err);
  }
};

// Fetch real vessel data from backend
const fetchAndRenderVessels = async () => {
  try {
    const res = await fetch("/api/shipper-vessels-on-map/");
    const vessels = await res.json();

    vessels.forEach((vessel) => {
      if (vessel.status === "assigned") {
        // Static vessel at departure
        L.marker([vessel.departure.lat, vessel.departure.lng], {
          icon: vesselIcon,
        })
          .addTo(map)
          .bindPopup(
            `<strong>${vessel.vessel_name}</strong><br>Status: Assigned`
          );
      } else if (vessel.status === "in_transit") {
        animateVessel(vessel);
      }
    });
  } catch (err) {
    console.error("Vessel loading failed", err);
  }
};

fetchPorts();
fetchAndRenderVessels();

// Draw simplified territorial waters polygon
L.polygon(
  [
    [21.1, 119.0],
    [21.1, 127.0],
    [4.2, 127.0],
    [4.2, 114.0],
    [21.1, 119.0],
  ],
  {
    color: "#1E3A8A",
    fillColor: "#1E3A8A",
    fillOpacity: 0.1,
    weight: 1,
    dashArray: "5,5",
  }
)
  .addTo(map)
  .bindPopup("Philippine Territorial Waters");

// Animate vessel from departure to arrival
const animateVessel = (vessel) => {
  const steps = 200;
  const delay = 1000; // ms
  let step = 0;

  const latStep = (vessel.arrival.lat - vessel.departure.lat) / steps;
  const lngStep = (vessel.arrival.lng - vessel.departure.lng) / steps;

  let lat = vessel.departure.lat;
  let lng = vessel.departure.lng;

  const marker = L.marker([lat, lng], { icon: vesselIcon })
    .addTo(map)
    .bindPopup(`<strong>${vessel.vessel_name}</strong><br>Status: In Transit`);

  const interval = setInterval(() => {
    if (step >= steps) {
      clearInterval(interval);
      return;
    }

    lat += latStep;
    lng += lngStep;
    marker.setLatLng([lat, lng]);
    step++;
  }, delay);
};
// sorting the table
// ASC = OLDEST TO NEWEST(OLD BABAW NEW UBOS)
// DESC == NEWEST TO OLDEST(NEW BABAW OLD UBOS)
document.addEventListener("DOMContentLoaded", function () {
  const table = document.querySelector(".vessels-table");
  const sortButtons = document.querySelectorAll(".sort-btn");

  // Initialize all sort buttons
  sortButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const column = parseInt(this.getAttribute("data-column"));
      const currentOrder = this.getAttribute("data-order");

      // Determine new sort order
      let newOrder;
      if (currentOrder === "none" || currentOrder === "desc") {
        newOrder = "asc";
      } else {
        newOrder = "desc";
      }

      // Reset all other buttons to 'none' and update their icons
      sortButtons.forEach((btn) => {
        if (btn !== this) {
          btn.setAttribute("data-order", "none");
          btn.querySelector("i").className = "fas fa-sort";
        }
      });

      // Update current button
      this.setAttribute("data-order", newOrder);
      updateIcon(this, newOrder);

      // Sort the table
      sortTable(column, newOrder);
    });
  });

  const updateIcon = (button, order) => {
    const icon = button.querySelector("i");
    switch (order) {
      case "asc":
        icon.className = "fas fa-sort-up";
        break;
      case "desc":
        icon.className = "fas fa-sort-down";
        break;
      default:
        icon.className = "fas fa-sort";
    }
  };

  const sortTable = (columnIndex, order) => {
    const tbody = table.querySelector("tbody");
    const rows = Array.from(tbody.querySelectorAll("tr"));

    rows.sort((a, b) => {
      const aCell = a.cells[columnIndex];
      const bCell = b.cells[columnIndex];

      let aValue = aCell.textContent.trim();
      let bValue = bCell.textContent.trim();

      // Handle different data types
      let comparison;

      // Check if it's SubManifest No. column (chronological sorting)
      if (columnIndex === 0) {
        // Parse SUBM-YYYYMMDD-ID format
        const parseSubManifest = (value) => {
          const parts = value.split("-");
          if (parts.length === 3) {
            const dateStr = parts[1]; // YYYYMMDD
            const id = parseInt(parts[2]) || 0;
            const year = parseInt(dateStr.substring(0, 4));
            const month = parseInt(dateStr.substring(4, 6));
            const day = parseInt(dateStr.substring(6, 8));
            const date = new Date(year, month - 1, day); // month is 0-indexed
            return { date, id };
          }
          return { date: new Date(0), id: 0 };
        };

        const aParsed = parseSubManifest(aValue);
        const bParsed = parseSubManifest(bValue);

        // First compare by date
        comparison = aParsed.date - bParsed.date;

        // If dates are equal, compare by ID
        if (comparison === 0) {
          comparison = aParsed.id - bParsed.id;
        }
      }
      // Check if it's a number (for Cargo Count column)
      else if (columnIndex === 3) {
        aValue = parseInt(aValue) || 0;
        bValue = parseInt(bValue) || 0;
        comparison = aValue - bValue;
      }
      // Check if it's a date (for ETA column)
      else if (columnIndex === 5) {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
        comparison = aValue - bValue;
      }
      // Handle route column (Origin → Destination)
      else if (columnIndex === 2) {
        // Extract origin port for sorting (text before →)
        const aOrigin = aValue.split("→")[0].trim();
        const bOrigin = bValue.split("→")[0].trim();
        comparison = aOrigin.localeCompare(bOrigin);
      }
      // Default string comparison
      else {
        comparison = aValue.localeCompare(bValue);
      }

      return order === "asc" ? comparison : -comparison;
    });

    // Clear tbody and append sorted rows
    tbody.innerHTML = "";
    rows.forEach((row) => tbody.appendChild(row));
  };
});
