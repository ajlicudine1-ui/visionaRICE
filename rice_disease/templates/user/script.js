// Get the menu button and dropdown menu
const menuBtn = document.querySelector(".menu-btn");
const dropdownMenu = document.querySelector(".dropdown-menu");

// Toggle dropdown menu visibility when the button is clicked
menuBtn.addEventListener("click", () => {
    dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
});

// Close the dropdown menu when clicking outside of it
window.addEventListener("click", (event) => {
    if (!menuBtn.contains(event.target) && !dropdownMenu.contains(event.target)) {
        dropdownMenu.style.display = "none";
    }
});
