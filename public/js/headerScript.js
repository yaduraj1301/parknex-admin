function updateDateTime() {
    const now = new Date();
    const dateElement = document.getElementById('current-date');
    const timeElement = document.getElementById('current-time');

    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('en-GB');
    }

    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('en-GB');
    }
}


async function init() {   
    updateDateTime();
    // Get the initial selected building and render the char
    setInterval(updateDateTime, 1000);
}

document.addEventListener('DOMContentLoaded', init);
