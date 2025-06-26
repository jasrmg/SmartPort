// Initialize map centered on Philippines
const map = L.map("vessel-map").setView([12.8797, 121.774], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Define Philippine territorial waters boundary (simplified polygon)
// This is an approximate boundary for demonstration purposes
const philTerritorialWaters = [
  // Northern bounds
  [21.1, 119.0],
  [21.1, 127.0],
  // Eastern bounds
  [21.1, 127.0],
  [4.2, 127.0],
  // Southern bounds
  [4.2, 127.0],
  [4.2, 114.0],
  // Western bounds
  [4.2, 114.0],
  [21.1, 119.0],
];

// Philippine major ports with coordinates
const philippinePorts = {
  Manila: [14.5995, 120.9842],
  Cebu: [10.3157, 123.9054],
  Davao: [7.0727, 125.6127],
  Iloilo: [10.7202, 122.5621],
  Subic: [14.7824, 120.2817],
  Zamboanga: [6.9214, 122.079],
  "Cagayan de Oro": [8.4542, 124.6319],
  Batangas: [13.7565, 121.0583],
};

// Add vessel markers for Philippine locations
const vesselMarkers = [
  {
    name: "Manila Bay Express",
    position: [14.5995, 120.9842], // Manila
    status: "arrived",
    icon: L.divIcon({
      html: '<i class="fas fa-ship" style="color: #2D9C5A; font-size: 24px;"></i>',
      className: "vessel-marker",
      iconSize: [24, 24],
    }),
  },
  {
    name: "Cebu Pearl",
    position: [10.3157, 123.9054], // Cebu
    status: "docked",
    icon: L.divIcon({
      html: '<i class="fas fa-ship" style="color: #4682B4; font-size: 24px;"></i>',
      className: "vessel-marker",
      iconSize: [24, 24],
    }),
  },
  {
    name: "Mindanao Explorer",
    position: [12.5, 123.0], // Off Samar coast
    status: "in-transit",
    icon: L.divIcon({
      html: '<i class="fas fa-ship" style="color: #D4AF37; font-size: 24px;"></i>',
      className: "vessel-marker",
      iconSize: [24, 24],
    }),
  },
  {
    name: "Visayas Navigator",
    position: [11.2, 123.7], // Between Panay and Negros
    status: "in-transit",
    icon: L.divIcon({
      html: '<i class="fas fa-ship" style="color: #D4AF37; font-size: 24px;"></i>',
      className: "vessel-marker",
      iconSize: [24, 24],
    }),
  },
];

// Add vessel markers to the map
vesselMarkers.forEach((vessel) => {
  const marker = L.marker(vessel.position, {
    icon: vessel.icon,
    title: vessel.name,
  }).addTo(map);

  // Add popup with vessel info
  marker.bindPopup(
    `<div style="font-family: 'Montserrat', sans-serif;">
                    <h4 style="margin: 0 0 5px 0; font-family: 'Montserrat', sans-serif;">${
                      vessel.name
                    }</h4>
                    <p style="margin: 0 0 3px 0; font-size: 0.9em;">
                        <strong>Status:</strong> 
                        <span style="color: ${
                          vessel.status === "arrived"
                            ? "#2D9C5A"
                            : vessel.status === "docked"
                            ? "#4682B4"
                            : "#D4AF37"
                        }">
                            ${
                              vessel.status === "arrived"
                                ? "Arrived"
                                : vessel.status === "docked"
                                ? "Docked"
                                : "In Transit"
                            }
                        </span>
                    </p>
                    <p style="margin: 0; font-size: 0.9em;">
                        <strong>Location:</strong> 
                        ${vessel.position[0].toFixed(
                          4
                        )}°N, ${vessel.position[1].toFixed(4)}°E
                    </p>
                </div>`
  );
});

// Add port markers
Object.entries(philippinePorts).forEach(([portName, coords]) => {
  L.marker(coords, {
    icon: L.divIcon({
      html: '<i class="fas fa-anchor" style="color: #1E3A8A; font-size: 20px;"></i>',
      className: "port-marker",
      iconSize: [20, 20],
    }),
  })
    .addTo(map)
    .bindPopup(`<b>${portName} Port</b>`);
});

// Add territorial waters polygon
L.polygon(philTerritorialWaters, {
  color: "#1E3A8A",
  fillColor: "#1E3A8A",
  fillOpacity: 0.1,
  weight: 1,
  dashArray: "5, 5",
})
  .addTo(map)
  .bindPopup("<b>Philippine Territorial Waters</b>");

// Simulate vessel movement for demo purposes
function simulateVesselMovement() {
  // Move Mindanao Explorer eastward
  const mindanaoExplorer = vesselMarkers.find(
    (v) => v.name === "Mindanao Explorer"
  );
  if (mindanaoExplorer) {
    mindanaoExplorer.position[1] += 0.05;
    if (mindanaoExplorer.position[1] > 125.0) {
      mindanaoExplorer.position[1] = 123.0;
    }
  }

  // Move Visayas Navigator northward
  const visayasNavigator = vesselMarkers.find(
    (v) => v.name === "Visayas Navigator"
  );
  if (visayasNavigator) {
    visayasNavigator.position[0] += 0.03;
    if (visayasNavigator.position[0] > 11.8) {
      visayasNavigator.position[0] = 11.2;
    }
  }

  // Update map markers
  map.eachLayer((layer) => {
    if (layer instanceof L.Marker && layer.options.title) {
      const vessel = vesselMarkers.find((v) => v.name === layer.options.title);
      if (vessel) {
        layer.setLatLng(vessel.position);
      }
    }
  });
}

// Update vessel positions every 5 seconds
setInterval(simulateVesselMovement, 5000);
