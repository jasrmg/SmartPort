document.addEventListener("DOMContentLoaded", () => {
  const voyageCards = document.querySelectorAll(".voyage-card");
  const voyageListSection = document.getElementById("voyage-list-section");
  const voyageSubmanifest = document.querySelector(".voyage-submanifest");
  const voyageNumberDisplay = document.getElementById("voyage-number-display");

  voyageCards.forEach((card) => {
    card.addEventListener("click", () => {
      const voyageNumber =
        card.querySelector(".voyage-card-title h3")?.textContent || "N/A";
      voyageNumberDisplay.textContent = voyageNumber;

      voyageListSection.style.display = "none";
      voyageSubmanifest.style.display = "block";
    });
  });

  document.querySelector(".back-to-list-btn").addEventListener("click", () => {
    voyageSubmanifest.style.display = "none";
    voyageListSection.style.display = "block";
  });

  // ----------- FLATPICKR -----------
  flatpickr("#dateFilter", {
    clickOpens: true,
    dateFormat: "Y-m-d",
    allowInput: false,
    onChange: function (selectedDates, dateStr) {
      document.getElementById("dateFilter").textContent =
        dateStr || "Select Date";
      document.getElementById("selectedDate").value = dateStr;
    },
  });

  // PREFILL THE TABLE VIEW WHEN CLICKED:
  const voyageSubmanifestSection = document.querySelector(
    ".voyage-submanifest"
  );
  const submanifestTableBody = document.getElementById("submanifest-tbody");

  voyageCards.forEach((card) => {
    card.addEventListener("click", async () => {
      const voyageId = card.dataset.voyageId;
      const voyageNumber = card.querySelector("h3").innerText;

      try {
        const response = await fetch(`/api/submanifests/${voyageId}/`);
        const data = await response.json();

        voyageListSection.style.display = "none";
        voyageSubmanifestSection.style.display = "block";
        voyageNumberDisplay.textContent = voyageNumber;
        submanifestTableBody.innerHTML = "";

        if (data.submanifests.length === 0) {
          submanifestTableBody.innerHTML =
            "<tr><td colspan='4'>No submanifests found.</td></tr>";
        } else {
          data.submanifests.forEach((sm) => {
            const row = `
            <tr>
              <td>${sm.submanifest_number}</td>
              <td>${sm.item_count}</td>
              <td><span class="status-badge">${sm.status.replaceAll(
                "_",
                " "
              )}</span></td>
              <td>
                <button class="btn-icon view"><i class="fas fa-eye"></i></button>
                <button class="btn-icon approve"><i class="fas fa-check"></i></button>
                <button class="btn-icon reject"><i class="fas fa-times"></i></button>
              </td>
            </tr>`;
            submanifestTableBody.insertAdjacentHTML("beforeend", row);
          });
        }
      } catch (error) {
        console.error("Failed to fetch submanifests:", error);
      }
    });
  });

  document
    .getElementById("back-to-voyage-list")
    .addEventListener("click", () => {
      voyageSubmanifestSection.style.display = "none";
      voyageListSection.style.display = "block";
    });
});
