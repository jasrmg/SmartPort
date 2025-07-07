const paginationWindow = document.getElementById("pagination-window");
const prevBtn = document.getElementById("prev-page-btn");
const nextBtn = document.getElementById("next-page-btn");
const spinner = document.getElementById("voyageLoader");
const voyageCardsContainer = document.querySelector(".voyage-cards-container");

let currentPage = parseInt(
  document.getElementById("pagination-container").dataset.currentPage
);
let totalPages = parseInt(
  document.getElementById("pagination-container").dataset.totalPages
);

const windowSize = 2;

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("click", (e) => {
    if (e.target.matches(".pagination-btn")) {
      const page = parseInt(e.target.dataset.page);
      if (!isNaN(page) && page !== currentPage) {
        fetchPage(page);
      } else if (e.target.id === "prev-page-btn" && currentPage > 1) {
        fetchPage(currentPage - 1);
      } else if (e.target.id === "next-page-btn" && currentPage < totalPages) {
        fetchPage(currentPage + 1);
      }
    }
  });

  updatePaginationWindow();
});

const showSpinner = () => {
  spinner.style.display = "flex";
};

const hideSpinner = () => {
  spinner.style.display = "none";
};

const updatePaginationWindow = () => {
  paginationWindow.innerHTML = "";

  let windowStart = Math.floor((currentPage - 1) / windowSize) * windowSize + 1;
  let windowEnd = Math.min(windowStart + windowSize - 1, totalPages);

  for (let i = windowStart; i <= windowEnd; i++) {
    const btn = document.createElement("button");
    btn.className = `pagination-btn${i === currentPage ? " active" : ""}`;
    btn.dataset.page = i;
    btn.textContent = i;
    paginationWindow.appendChild(btn);
  }

  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
};

const fetchPage = async (pageNum) => {
  showSpinner();
  const delay = new Promise((resolve) => setTimeout(resolve, 200));

  try {
    const res = await fetch(`/voyage-report/?page=${pageNum}`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRFToken": csrftoken,
      },
    });

    const html = await res.text();
    await delay;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const newContainer = doc.querySelector(".voyage-cards-container");

    if (newContainer) {
      voyageCardsContainer.innerHTML = newContainer.innerHTML;
    }

    currentPage = pageNum;
    updatePaginationWindow();
  } catch (err) {
    console.error("❌ Pagination Fetch Error:", err);
  } finally {
    hideSpinner();
  }
};
