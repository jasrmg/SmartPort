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
});
