document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("vesselDetailsModal");
  const closeBtn = document.getElementById("closeVesselModal");
  const modalBody = document.getElementById("vesselDetailsBody");

  document.querySelectorAll(".view-details-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const vesselId = this.getAttribute("data-vessel-id");

      fetch(`/shipper/vessel/${vesselId}/details/`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            modalBody.innerHTML = `<p class="error">${data.error}</p>`;
          } else {
            modalBody.innerHTML = `
              <div class="modal-section">
                <h2 class="modal-title">${data.name}</h2>
                <p class="modal-subtitle">${data.imo}</p>
              </div>
              <div class="modal-details-grid">
                <div class="modal-detail">
                  <span class="modal-label">Type:</span>
                  <span class="modal-value">${data.type}</span>
                </div>
                <div class="modal-detail">
                  <span class="modal-label">Status:</span>
                  <span class="modal-value">${data.status}</span>
                </div>
                <div class="modal-detail">
                  <span class="modal-label">Capacity:</span>
                  <span class="modal-value">${data.capacity}</span>
                </div>
                <div class="modal-detail">
                  <span class="modal-label">Created By:</span>
                  <span class="modal-value">${data.created_by}</span>
                </div>
                ${
                  data.departure_port
                    ? `
                <div class="modal-detail">
                  <span class="modal-label">Departure Port:</span>
                  <span class="modal-value">${data.departure_port}</span>
                </div>`
                    : ""
                }
                ${
                  data.arrival_port
                    ? `
                <div class="modal-detail">
                  <span class="modal-label">Arrival Port:</span>
                  <span class="modal-value">${data.arrival_port}</span>
                </div>`
                    : ""
                }
                ${
                  data.departure_date
                    ? `
                <div class="modal-detail">
                  <span class="modal-label">Departure Date:</span>
                  <span class="modal-value">${data.departure_date}</span>
                </div>`
                    : ""
                }
                ${
                  data.eta
                    ? `
                <div class="modal-detail">
                  <span class="modal-label">ETA:</span>
                  <span class="modal-value">${data.eta}</span>
                </div>`
                    : ""
                }
              </div>
            `;
          }
          modal.style.display = "flex";
        });
    });
  });

  closeBtn.addEventListener("click", () => {
    modal.classList.add("fade-out");
    setTimeout(() => {
      modal.style.display = "none";
      modal.classList.remove("fade-out");
    }, 300);
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) closeBtn.click();
  });
});
