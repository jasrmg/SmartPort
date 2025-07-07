document.addEventListener("DOMContentLoaded", function () {
  const sidebar = document.querySelector(".sidebar");
  const mainContent = document.querySelector(".main-content");
  const collapseBtn = document.querySelector(".collapse-btn");

  collapseBtn.addEventListener("click", function (e) {
    e.preventDefault();
    sidebar.classList.toggle("sidebar-collapsed");
    mainContent.classList.toggle("sidebar-collapsed-content");
    // Adjust submenu visibility if needed when collapsing
    if (sidebar.classList.contains("sidebar-collapsed")) {
      document
        .querySelectorAll(".nav-item.expanded .nav-sub-menu")
        .forEach((subMenu) => {
          // If you want to collapse submenus when main sidebar collapses
          // subMenu.style.height = '0';
        });
    }
  });

  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((item) => {
    const link = item.querySelector("a.nav-link"); // Ensure it's the main link
    const hasSubmenu = item.querySelector(".nav-sub-menu");

    if (hasSubmenu) {
      // Check for submenu
      link.addEventListener("click", function (e) {
        // Prevent default only if it's a dropdown toggle
        if (link.getAttribute("href") === "#") {
          e.preventDefault();
        }

        if (sidebar.classList.contains("sidebar-collapsed")) return;

        const isExpanded = item.classList.contains("expanded");

        // Close all other expanded items
        navItems.forEach((otherItem) => {
          if (otherItem !== item && otherItem.classList.contains("expanded")) {
            otherItem.classList.remove("expanded");
            const otherSubmenu = otherItem.querySelector(".nav-sub-menu");
            if (otherSubmenu) {
              otherSubmenu.style.height = "0px";
            }
          }
        });

        // Toggle current item
        if (!isExpanded) {
          item.classList.add("expanded");
          hasSubmenu.style.height = "auto";
        } else {
          item.classList.remove("expanded");
          hasSubmenu.style.height = "0px";
        }
      });
    }
  });

  // ------------------------ VOYAGE REPORT TOGGLE : LIST = DEFAULT, DETAIL = TOGGLE ------------------------
  const reportsListSection = document.getElementById(
    "voyage-reports-list-section"
  );
  const reportDetailSection = document.getElementById("voyageReportContent");
  const reportCards = document.querySelectorAll(".voyage-report-card");
  const backToListBtn = document.getElementById("back-to-voyage-list");

  reportCards.forEach((card) => {
    card.addEventListener("click", () => {
      reportDetailSection.style.display = "block";
      reportsListSection.style.display = "none";
    });
  });
  if (backToListBtn) {
    backToListBtn.addEventListener("click", function () {
      reportDetailSection.style.display = "none";
      reportsListSection.style.display = "block";
    });
  }
  // HIDE BUTTONS
  const hideButtons = (state) => {
    if (state === "hide") {
      document
        .querySelectorAll(".print-hidden")
        .forEach((el) => (el.style.display = "none"));
    } else {
      document
        .querySelectorAll(".print-hidden")
        .forEach((el) => (el.style.display = ""));
    }
  };

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
