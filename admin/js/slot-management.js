import { db, auth } from "../../public/js/firebase-config.js";

import { collection, addDoc, getDocs, query, orderBy }
    from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ===== Modal Utility Functions =====

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "block";
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "none";
        // Reset form if it's the add slot modal

        if (modalId === "addSlotModal") {
            document.getElementById("addSlotForm").reset();
            document.getElementById("notesSection").style.display = "none";
        }
    }
}

// ===== Attach Event Listeners =====
document.addEventListener("DOMContentLoaded", () => {
    // Open "Add Slot" modal
    const addSlotBtn = document.getElementById("add-slot-btn");
    if (addSlotBtn) {
        addSlotBtn.addEventListener("click", (e) => {
            e.preventDefault();
            openModal("addSlotModal");
        });
    }
    // Close modal (X button)

    const closeAddSlotModal = document.getElementById("closeAddSlotModal");
    if (closeAddSlotModal) {
        closeAddSlotModal.addEventListener("click", () => {
            closeModal("addSlotModal");
        });
    }
    // Cancel button inside modal
    const cancelAddSlot = document.getElementById("cancelAddSlot");
    if (cancelAddSlot) {
        cancelAddSlot.addEventListener("click", () => {
            closeModal("addSlotModal");
        });
    }
    // Toggle Notes section based on "Is Special"
    const isSpecialDropdown = document.getElementById("slotIsSpecial");
    if (isSpecialDropdown) {
        isSpecialDropdown.addEventListener("change", function () {
            const notesSection = document.getElementById("notesSection");
            if (this.value === "yes") {
                notesSection.style.display = "block";
            } else {
                notesSection.style.display = "none";
                document.getElementById("slotNotes").value = "";
            }
        });
    }
    // Close modal when clicking outside modal content
    window.addEventListener("click", (e) => {
        const modal = document.getElementById("addSlotModal");
        if (e.target === modal) {
            closeModal("addSlotModal");
        }
    });
});
let allSlots = []; 
let currentLevel = 1; 

async function loadDataOnce() {
    const querySnapshot = await getDocs(collection(db, "ParkingSlots"));
    allSlots = [];

    querySnapshot.forEach((doc) => {
        allSlots.push({
            id: doc.id,
            ...doc.data()
        });
    });

    renderDetails(currentLevel);
}



function renderDetails(level) {
    const container = document.getElementById("parkingGrid");
    container.innerHTML = "";

    const filteredSlots = allSlots.filter(
        (slot) => slot.floor === `Level ${level}`
    );

    if (filteredSlots.length === 0) {
        container.innerHTML = `<p>No slots available for Level ${level}</p>`;
        return;
    }

    // Group slots by block
    const groupedByBlock = {};
    filteredSlots.forEach((slot) => {
        if (!groupedByBlock[slot.block]) {
            groupedByBlock[slot.block] = [];
        }
        groupedByBlock[slot.block].push(slot);
    });

    // Loop through blocks and add directly to parkingGrid
    Object.keys(groupedByBlock).forEach((blockName) => {
        const blockSection = document.createElement("div");
        blockSection.classList.add("block-section");

        blockSection.innerHTML = `
            <h4 class="block-title">${blockName}-Block</h4>
            <div class="block-grid"></div>
        `;

        const blockGrid = blockSection.querySelector(".block-grid");

        groupedByBlock[blockName].forEach((slot) => {
            const div = document.createElement("div");
            div.classList.add("slot-card");

            // Status → class
            let statusClass = "";
            if (slot.status === "Free") statusClass = "available";
            else if (slot.status === "Booked") statusClass = "occupied";
            else if (slot.status === "Reserved") statusClass = "reserved";
            else if (slot.status === "Named") statusClass = "named";
            else statusClass = "unbooked";

            div.innerHTML = `
                <div class="slot-box ${statusClass}">
                    <span class="slot-name">${slot.slot_name}</span>
                </div>
            `;

            blockGrid.appendChild(div);
        });

        container.appendChild(blockSection); // append each block directly
    });
}




function switchLevel(level) {
    currentLevel = level;

    // Update tab styling
    document.querySelectorAll(".level-tab").forEach((btn) => {
        btn.classList.remove("active");
    });
    document
        .querySelector(`.level-tab:nth-child(${level})`)
        .classList.add("active");

    renderDetails(level);
}

// Load data on page start
document.addEventListener("DOMContentLoaded", loadDataOnce);

window.switchLevel = switchLevel; // make available for inline onclick
