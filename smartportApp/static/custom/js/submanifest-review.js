document.addEventListener("DOMContentLoaded", function () {
  const table = document.querySelector(".custom-table");
  const sortButtons = document.querySelectorAll(".sort-btn");

  // Store the original order (latest first) when page loads
  const tbody = table.querySelector("tbody");
  const originalOrder = Array.from(tbody.querySelectorAll("tr")).filter(
    (row) => !row.querySelector("td[colspan]") // Exclude "no data" rows
  );

  sortButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const column = parseInt(this.dataset.column);
      const currentOrder = this.dataset.order;
      let newOrder = "asc";

      // Determine new sort order
      if (currentOrder === "asc") {
        newOrder = "desc";
      } else if (currentOrder === "desc") {
        newOrder = "none";
      } else {
        newOrder = "asc";
      }

      // Reset all other sort buttons
      sortButtons.forEach((btn) => {
        if (btn !== this) {
          btn.dataset.order = "none";
          btn.querySelector("i").className = "fas fa-sort";
        }
      });

      // Update current button
      this.dataset.order = newOrder;
      updateSortIcon(this, newOrder);

      // Sort the table
      if (newOrder === "none") {
        // Reset to original order (latest first, matches -created_at)
        restoreOriginalOrder();
      } else {
        sortTable(column, newOrder);
      }
    });
  });

  const updateSortIcon = (button, order) => {
    const icon = button.querySelector("i");
    switch (order) {
      case "asc":
        icon.className = "fas fa-sort-up";
        break;
      case "desc":
        icon.className = "fas fa-sort-down";
        break;
      case "none":
      default:
        icon.className = "fas fa-sort";
        break;
    }
  };

  const restoreOriginalOrder = () => {
    // Clear tbody
    tbody.innerHTML = "";

    // Re-append rows in original order (latest first)
    originalOrder.forEach((row) => tbody.appendChild(row));

    // Add the "no data" row back if it exists and there are no data rows
    if (originalOrder.length === 0) {
      const noDataRow = document.createElement("tr");
      noDataRow.innerHTML =
        '<td colspan="5" class="no-pending-submanifest">No pending submanifests found.</td>';
      tbody.appendChild(noDataRow);
    }
  };

  const sortTable = (columnIndex, order) => {
    const rows = Array.from(tbody.querySelectorAll("tr")).filter(
      (row) => !row.querySelector("td[colspan]") // Exclude "no data" rows
    );

    rows.sort((a, b) => {
      const cellA = a.cells[columnIndex];
      const cellB = b.cells[columnIndex];

      if (!cellA || !cellB) return 0;

      let valueA = cellA.textContent.trim();
      let valueB = cellB.textContent.trim();

      // Handle different data types
      let comparison = 0;

      switch (columnIndex) {
        case 0: // Submanifest No. - alphanumeric (this also sorts by date since format is SUBM-YYYYMMDD-ID)
          comparison = valueA.localeCompare(valueB, undefined, {
            numeric: true,
          });
          break;
        case 1: // Consignee Name - text
          comparison = valueA.localeCompare(valueB);
          break;
        case 2: // Submitted By - text
          comparison = valueA.localeCompare(valueB);
          break;
        case 3: // Date Submitted - date
          const dateA = parseDate(valueA);
          const dateB = parseDate(valueB);
          comparison = dateA - dateB;
          break;
        default:
          comparison = valueA.localeCompare(valueB);
      }

      return order === "desc" ? -comparison : comparison;
    });

    // Clear tbody and re-append rows in sorted order
    tbody.innerHTML = "";
    rows.forEach((row) => tbody.appendChild(row));

    // Add the "no data" row back at the end if no data rows exist
    if (rows.length === 0) {
      const noDataRow = document.createElement("tr");
      noDataRow.innerHTML =
        '<td colspan="5" class="no-pending-submanifest">No pending submanifests found.</td>';
      tbody.appendChild(noDataRow);
    }
  };

  const parseDate = (dateString) => {
    // Parse date in format "MMM dd, yyyy" (e.g., "May 15, 2023")
    const months = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };

    const parts = dateString.split(" ");
    if (parts.length === 3) {
      const month = months[parts[0]];
      const day = parseInt(parts[1].replace(",", ""));
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }

    // Fallback to regular date parsing
    return new Date(dateString);
  };
});

// Optional: CSS for better visual feedback
const style = document.createElement("style");
style.textContent = `
    .sort-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-weight: bold;
        width: 100%;
        text-align: left;
        padding: 8px;
        transition: background-color 0.2s;
    }
    
    .sort-btn:hover {
        background-color: rgba(0, 0, 0, 0.1);
    }
    
    .sort-btn i {
        margin-left: 5px;
        color: #666;
    }
    
    .sort-btn[data-order="asc"] i,
    .sort-btn[data-order="desc"] i {
        color: #007bff;
    }
    
    .custom-table th {
        padding: 0;
        position: relative;
    }
`;
document.head.appendChild(style);
