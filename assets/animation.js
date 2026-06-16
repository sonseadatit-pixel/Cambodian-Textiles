document.addEventListener("DOMContentLoaded", function() {
    AOS.init({
        duration: 700,
        once: false
    });
});

window.addEventListener('load', () => {
    AOS.refresh();
});