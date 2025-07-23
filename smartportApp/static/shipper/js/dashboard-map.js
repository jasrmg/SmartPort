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

// Fetch real vessel data from backend
async function fetchAndRenderVessels() {
  try {
    const res = await fetch("/api/vessels-on-map/");
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
}

// Animate vessel from departure to arrival
function animateVessel(vessel) {
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
}
