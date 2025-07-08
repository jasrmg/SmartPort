/* -------------- VESSEL FILTER LOGIC -------------- */
const vesselTypeFilter = document.getElementById("vesselTypeFilter");
const vesselStatusFilter = document.getElementById("vesselStatusFilter");
const vesselGrid = document.querySelector(".vessels-grid");
const loader = document.getElementById("vesselLoader");

document.addEventListener("DOMContentLoaded", function () {
  vesselTypeFilter.addEventListener("change", fetchFilteredVessels);
  vesselStatusFilter.addEventListener("change", fetchFilteredVessels);
  fetchFilteredVessels();
});

const fetchFilteredVessels = async () => {
  const type = vesselTypeFilter.value;
  const status = vesselStatusFilter.value;

  try {
    loader.style.display = "block";
    vesselGrid
      .querySelectorAll(".vessel-card")
      .forEach((card) => card.remove());

    const start = performance.now();
    const res = await fetch(`/filter-vessels/?type=${type}&status=${status}`);
    const data = await res.json();
    const elapsed = performance.now() - start;

    if (1000 - elapsed > 0)
      await new Promise((res) => setTimeout(res, 1000 - elapsed));

    if (data.vessels) {
      data.vessels.forEach((v) => {
        const card = document.createElement("div");
        card.className = "vessel-card";
        card.setAttribute("data-vessel-id", v.vessel_id);
        card.innerHTML = `
          <div class="vessel-card-icon">
            <i class="fas fa-ship"></i>
          </div>
          <div class="vessel-card-details">
            <h3 class="vessel-card-name">${v.name}</h3>
            <p class="vessel-card-info">${v.imo} · ${v.vessel_type}</p>
            <p class="vessel-card-status">
              <span class="status-indicator ${v.status}"></span>
              ${v.status_display}
            </p>
          </div>
        `;
        vesselGrid.appendChild(card);
      });

      attachVesselCardClickHandlers();
    }
  } catch (err) {
    console.error("Failed to fetch vessels:", err);
    vesselGrid.innerHTML = `<p>Error loading vessels.</p>`;
  } finally {
    loader.style.display = "none";
  }
};
