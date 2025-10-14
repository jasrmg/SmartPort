/*
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
});*/

document.addEventListener("DOMContentLoaded", () => {
  const downloadBtn = document.getElementById("downloadPDF");
  const content = document.getElementById("masterManifest");

  downloadBtn.addEventListener("click", async () => {
    // Options for html2pdf/html2canvas
    /*const baseOpt = {
      margin: 10,
      filename: "master-manifest.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollY: 0,
        logging: false,
      },
    };*/
    const baseOpt = {
      margin: [0, 6.6, 10, 10], // top, right, bottom, left — top is 0
      filename: "master-manifest.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollY: 0,
        logging: false,
      },
    };


    try {
      // Clone the content and remove actual buttons (so page stays intact)
      const clone = content.cloneNode(true);
      clone.querySelector(".actions")?.remove();

      // Put clone in a temporary container but not visible so it can layout
      const tempContainer = document.createElement("div");
      // place off-screen so browsers still compute layout but user doesn't see it
      tempContainer.style.position = "fixed";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "0";
      tempContainer.appendChild(clone);
      document.body.appendChild(tempContainer);

      // Allow the browser to render layout for the clone
      await new Promise((res) => requestAnimationFrame(res));

      // Measure clone size in CSS pixels
      const rect = clone.getBoundingClientRect();
      const pxWidth = rect.width || clone.offsetWidth;
      const pxHeight = rect.height || clone.offsetHeight;

      // Convert px -> mm. CSS px = 96ppi by spec (approx). 1 inch = 25.4 mm
      const DPI = 96; // reasonable default
      const pxToMm = (px) => (px * 25.4) / DPI;
      const widthMm = Math.ceil(pxToMm(pxWidth));
      const heightMm = Math.ceil(pxToMm(pxHeight));

      // Determine orientation
      const orientation = widthMm > heightMm ? "landscape" : "portrait";

      // Build final options with concrete format array so jsPDF gets numeric args
      const finalOpt = Object.assign({}, baseOpt, {
        jsPDF: {
          unit: "mm",
          // pass explicit numeric format [width, height]
          format: [widthMm, heightMm],
          orientation: orientation,
        },
      });

      // Generate PDF from the clone
      await html2pdf()
        .set(finalOpt)
        .from(clone)
        .save();

      // cleanup
      document.body.removeChild(tempContainer);
    } catch (err) {
      console.error("PDF generation error:", err);

      // Cleanup if fallback container still exists
      const leftover = document.querySelector("body > div[style*='-9999px']");
      if (leftover) {
        try { document.body.removeChild(leftover); } catch (e) {}
      }

      // Fallback: try again with A4 (safer default) so user still gets a PDF
      try {
        await html2pdf()
          .set({
            margin: 10,
            filename: "master-manifest.pdf",
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          })
          .from(content)
          .save();
      } catch (err2) {
        console.error("Fallback PDF failed:", err2);
        alert("Failed to generate PDF. Check console for details.");
      }
    }
  });
});



