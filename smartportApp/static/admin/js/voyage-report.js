document.addEventListener("DOMContentLoaded", function () {
  // ------------- PRINT BUTTON -------------
  const printBtn = document.getElementById("printReport");
  printBtn.addEventListener("click", () => {
    window.print();
  });

  // ------------- PDF BUTTON -------------
  const PDFBtn = document.getElementById("exportPdf");
  PDFBtn.addEventListener("click", () => {
    const reportElement = document.getElementById("voyageReportContent");
    const voyageNumber =
      document.querySelector('[data-field="voyageNumber"]')?.innerText ||
      "voyage-report";
    // hide the buttons:
    hideButtons("hide");
    const opt = {
      margin: [1, 0, 0, 0],
      filename: `${voyageNumber.trim().replace(/\s+/g, "-")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        scrollY: 0,
        windowWidth: document.body.scrollWidth,
        windowHeight: document.body.scrollHeight,
      },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    html2pdf()
      .set(opt)
      .from(reportElement)
      .save()
      .then(() => {
        // return the button
        hideButtons("show");
      });
  });
});

// OUTSIDE DOM
