const createLogoElement = () => {
  const logoDiv = document.createElement("div");
  logoDiv.className = "header-logo";
  logoDiv.id = "header-logo-dynamic";
  logoDiv.innerHTML = `
      <span class="logo-text">SmartPort</span>
    `;
  return logoDiv;
};

const toggleHeaderDisplay = (showSearch) => {
  const searchBar = document.querySelector(".search-bar");
  const existingLogo = document.getElementById("header-logo-dynamic");

  if (showSearch) {
    // Show search bar
    if (searchBar) {
      searchBar.style.display = "flex";
    }
    // Remove logo if it exists
    if (existingLogo) {
      existingLogo.remove();
    }
  } else {
    if (searchBar) {
      searchBar.style.display = "none";

      // Create and insert logo if it doesn't exist
      if (!existingLogo) {
        const logo = createLogoElement();
        searchBar.parentElement.insertBefore(logo, searchBar.nextSibling);
      }
    }
  }
};

// make it global
window.createLogoElement = createLogoElement;
window.toggleHeaderDisplay = toggleHeaderDisplay;
