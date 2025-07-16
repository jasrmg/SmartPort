document.addEventListener("DOMContentLoaded", () => {
  // ---------------- DOWNLOAD PDF FILE ----------------
  document.getElementById("downloadPDF").addEventListener("click", () => {
    html2pdf()
      .set({
        margin: 0.5,
        filename: "master-manifest.pdf",
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      })
      .from(document.getElementById("masterManifest"))
      .save();
  });
});
