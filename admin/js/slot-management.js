import { db, auth, app } from "../../public/js/firebase-config.js";

import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy, 
    where, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";


let currentLevel = 1;
let slots = {};
let weeklyData = [45, 48, 15, 46, 42, 58, 60];
let currentBuildingSlots = [];
let availableLevels = [];


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


// -------------------------------------------

async function populateBuildingDropdown() {
    try {
        console.log('Fetching buildings from Firebase...');
        
        // Reference to ParkingSlots collection
        const parkingSlotsRef = collection(db, 'ParkingSlots');
        const snapshot = await getDocs(parkingSlotsRef);
        
        // Extract unique buildings
        const buildings = new Set();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.building) {
                buildings.add(data.building);
            }
        });
        
        // Convert Set to Array and sort
        const buildingList = Array.from(buildings).sort();
        
        console.log('Found buildings:', buildingList);
        
        // Get the building selector dropdown
        const buildingSelector = document.querySelector('.filter-select');
        
        if (buildingSelector) {
            // Clear existing options
            buildingSelector.innerHTML = '';
            
            // Add buildings as options
            buildingList.forEach(building => {
                const option = document.createElement('option');
                option.value = building;
                option.textContent = building;
                buildingSelector.appendChild(option);
            });
            
            console.log(`Building dropdown populated with ${buildingList.length} buildings`);
        } else {
            console.error('Building selector not found in DOM');
        }
        
        return buildingList;
        
    } catch (error) {
        console.error('Error fetching buildings:', error);
        
        // Fallback: show error in dropdown
        const buildingSelector = document.querySelector('.building-selector');
        if (buildingSelector) {
            buildingSelector.innerHTML = '<option value="">Error loading buildings</option>';
        }
        
        return [];
    }
}

async function populateLevelTabs(selectedBuilding = null) {
    try {
        console.log('Fetching levels for building:', selectedBuilding);
        
        // Use currentBuildingSlots if already loaded, otherwise fetch
        let slotsToCheck = currentBuildingSlots;
        
        if (slotsToCheck.length === 0 && selectedBuilding) {
            // Fetch data if not already loaded
            const parkingSlotsRef = collection(db, 'ParkingSlots');
            const q = query(parkingSlotsRef, where('building', '==', selectedBuilding));
            const snapshot = await getDocs(q);
            
            slotsToCheck = [];
            snapshot.forEach(doc => {
                slotsToCheck.push(doc.data());
            });
        }
        
        // Extract unique levels from floor field
        const levels = new Set();
        slotsToCheck.forEach(slot => {
            if (slot.floor) {
                // Extract number from "Level 0", "Level 1", etc.
                const levelMatch = slot.floor.match(/level\s*(\d+)/i);
                if (levelMatch) {
                    levels.add(parseInt(levelMatch[1]));
                }
            }
        });
        
        // Convert to sorted array
        availableLevels = Array.from(levels).sort((a, b) => a - b);
        
        console.log('Available levels:', availableLevels);
        
        // Update level tabs in DOM
        const levelTabsContainer = document.querySelector('.level-tabs');
        if (levelTabsContainer && availableLevels.length > 0) {
            levelTabsContainer.innerHTML = '';
            
            availableLevels.forEach((level, index) => {
                const button = document.createElement('button');
                button.className = `level-tab ${index === 0 ? 'active' : ''}`;
                button.dataset.level = level;
                button.textContent = `Level ${level}`;
                
                button.addEventListener('click', (e) => {
                    switchLevel(parseInt(e.target.dataset.level));
                });
                
                levelTabsContainer.appendChild(button);
            });
            
            // Set current level to first available level
            if (availableLevels.length > 0) {
                currentLevel = availableLevels[0];
            }
        }
        
        return availableLevels;
        
    } catch (error) {
        console.error('Error fetching levels:', error);
        return [];
    }
}


function setupRealTimeStatsUpdates(selectedBuilding = null) {
    try {
        const parkingSlotsRef = collection(db, 'ParkingSlots');
        
        let q;
        if (selectedBuilding) {
            q = query(parkingSlotsRef, 
                where('building', '==', selectedBuilding)
            );
        } else {
            q = query(parkingSlotsRef);
        }
        
        // Listen for real-time updates
        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log('Real-time update received for stats and slots');
            
            currentBuildingSlots = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                currentBuildingSlots.push({
                    ...data,
                    docId: doc.id
                });
            });
            
            // Update both stats and slot layout
            populateLevelTabs(selectedBuilding).then(() => {
                renderParkingSlots();
            });
        });
        
        // Store unsubscribe function globally so we can clean up later
        window.statsUnsubscribe = unsubscribe;
        
    } catch (error) {
        console.error('Error setting up real-time stats updates:', error);
    }
}

async function testFirebaseConnection() {
    try {
        console.log('Testing Firebase connection...');
        console.log('Firebase App:', app);
        console.log('Firebase Auth:', auth);
        console.log('Firebase Firestore:', db);
        
        // Test basic Firestore connection by getting app info
        console.log('Firebase App Name:', app.name);
        console.log('Firebase Project ID:', app.options.projectId);
        
        // Test if we can access Firestore
        if (db) {
            console.log('✅ Firebase Firestore connection successful');
            console.log('Firestore instance:', db.app.name);
        } else {
            console.error('❌ Firebase Firestore not initialized');
        }
        
        // Test if we can access Auth
        if (auth) {
            console.log('✅ Firebase Auth connection successful');
            console.log('Auth instance:', auth.app.name);
        } else {
            console.error('❌ Firebase Auth not initialized');
        }
        
    } catch (error) {
        console.error('❌ Firebase connection failed:', error);
    }
}

function setupEventListeners() {
    // Navigation menu
    // document.querySelectorAll('.nav-link').forEach(link => {
    //     link.addEventListener('click', (e) => {
    //         e.preventDefault();
    //         handleNavigation(e.target.closest('.nav-link'));
    //     });
    // });

    // Level tabs
    document.querySelectorAll('.level-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            switchLevel(parseInt(e.target.dataset.level));
        });
    });

    // Parking slots
    document.addEventListener('click', (e) => {
        if (e.target.closest('.parking-slot')) {
            handleSlotClick(e.target.closest('.parking-slot'));
        }
    });

    // Building selector - Updated to use new handler
    const buildingSelector = document.querySelector('.building-selector');
    if (buildingSelector) {
        buildingSelector.addEventListener('change', (e) => {
            handleBuildingChange(e.target.value);
        });
    }
}

function switchLevel(level) {
    currentLevel = level;

    // Update active tab
    document.querySelectorAll('.level-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-level="${level}"]`).classList.add('active');

    // Re-render parking slots for the selected level
    renderParkingSlots();
}

function handleBuildingChange(building) {
    if (!building) return;
    
    console.log(`Building selected: ${building}`);
    
    // Store selected building globally
    window.selectedBuilding = building;
    
    // Clean up previous listener
    if (window.statsUnsubscribe) {
        window.statsUnsubscribe();
    }
    
    // Fetch and update stats for selected building
    // fetchAndUpdateStats(building).then(() => {
    //     // After data is loaded, populate level tabs and render slots
    //     populateLevelTabs(building).then(() => {
    //         renderParkingSlots();
    //     });
    // });
    
    populateLevelTabs(building).then(() => {
             renderParkingSlots();
    });

    // Setup real-time updates for this building
    setupRealTimeStatsUpdates(building);
}

function renderParkingSlots() {
    const parkingGrid = document.getElementById('parking-grid');
    if (!parkingGrid) return;

    // Clear existing content
    parkingGrid.innerHTML = '';

    // Check if we have Firebase data
    if (currentBuildingSlots.length === 0) {
        parkingGrid.innerHTML = '<div class="loading">Loading parking slots...</div>';
        return;
    }

    // Filter slots by current level (handle "Level 0", "Level 1", etc.)
    const currentLevelSlots = currentBuildingSlots.filter(slot => {
        if (!slot.floor) return false;
        
        // Extract level number from floor field
        const levelMatch = slot.floor.match(/level\s*(\d+)/i);
        if (levelMatch) {
            const slotLevel = parseInt(levelMatch[1]);
            return slotLevel === currentLevel;
        }
        return false;
    });

    // Group slots by block
    const slotsByBlock = currentLevelSlots.reduce((blocks, slot) => {
        const blockName = slot.block || 'Unknown';
        if (!blocks[blockName]) {
            blocks[blockName] = [];
        }
        blocks[blockName].push(slot);
        return blocks;
    }, {});

    // Get unique blocks and sort them
    const blockNames = Object.keys(slotsByBlock).sort();

    // If no slots for current level
    if (blockNames.length === 0) {
        parkingGrid.innerHTML = `<div class="no-slots">No parking slots found for Level ${currentLevel}</div>`;
        return;
    }

    // Render each block
    blockNames.forEach(blockName => {
        const blockDiv = document.createElement('div');
        blockDiv.className = 'parking-block';

        const blockHeader = document.createElement('h4');
        blockHeader.textContent = `${blockName}-Block`;
        blockDiv.appendChild(blockHeader);

        const slotsGrid = document.createElement('div');
        slotsGrid.className = 'slots-grid';

        // Sort slots within block by slot_name
        const blockSlots = slotsByBlock[blockName].sort((a, b) => {
            return a.slot_name?.localeCompare(b.slot_name) || 0;
        });

        // Render each slot
        blockSlots.forEach(slot => {
            const slotDiv = document.createElement('div');
            
            // Map Firebase status to CSS classes
            const status = mapFirebaseStatusToCss(slot.status);
            slotDiv.className = `parking-slot ${status}`;
            slotDiv.dataset.slot = slot.slot_name;
            slotDiv.dataset.docId = slot.docId; // Store document ID for potential updates

            // Add slot ID
            const slotId = document.createElement('span');
            slotId.className = 'slot-id';
            slotId.textContent = slot.slot_name;
            slotDiv.appendChild(slotId);

            // Create icon container
            const iconList = document.createElement('div');
            iconList.className = 'icon-list';

            // Add special indicators based on is_special and notes
            // if (slot.is_special) {
            //     addSpecialIcons(iconList, slot);
            // }

            // Add car icon
            const carIcon = document.createElement('i');
            carIcon.className = 'slot-icon fas fa-car';
            iconList.appendChild(carIcon);

            slotDiv.appendChild(iconList);

            // Add tooltip with slot details
            // addSlotTooltip(slotDiv, slot);

            slotsGrid.appendChild(slotDiv);
        });

        blockDiv.appendChild(slotsGrid);
        parkingGrid.appendChild(blockDiv);
    });

    console.log(`Rendered ${currentLevelSlots.length} slots for Level ${currentLevel}`);
}

function mapFirebaseStatusToCss(firebaseStatus) {
    if (!firebaseStatus) return 'available';
    
    const status = firebaseStatus.toLowerCase();
    switch (status) {
        case 'free':
            return 'available';
        case 'booked':
            return 'occupied';
        case 'reserved':
            return 'reserved';
        case 'named':
            return 'named';
        case 'unbooked':
            return 'unbooked';
        default:
            return 'available';
    }
}

async function init() {
    // Test Firebase connection first
    await testFirebaseConnection();
    
    // Populate building dropdown
    const buildingList = await populateBuildingDropdown();
    
    // Set default building (first one in the list) and fetch its stats
    if (buildingList && buildingList.length > 0) {
        const defaultBuilding = buildingList[0];
        
        // Set the dropdown to show the default building
        const buildingSelector = document.querySelector('.building-selector');
        console.log("default building : ", defaultBuilding);
        if (buildingSelector) {
            buildingSelector.value = defaultBuilding;
        }
        
        // Store as selected building
        window.selectedBuilding = defaultBuilding;
        
        // Fetch stats for default building
        // await fetchAndUpdateStats(defaultBuilding);
        
        // Populate level tabs and render slots
        await populateLevelTabs(defaultBuilding);
        renderParkingSlots();
        
        // Setup real-time stats updates for default building
        setupRealTimeStatsUpdates(defaultBuilding);
    } else {
        console.warn('No buildings found, loading all slots');
        // Fallback: load all slots if no buildings found
        // await fetchAndUpdateStats();
        await populateLevelTabs();
        renderParkingSlots();
        setupRealTimeStatsUpdates();
    }
    
    // Setup the dashboard

    setupEventListeners();

}

document.addEventListener('DOMContentLoaded', init);

window.ParkingAPI = {
    updateSlot: (slotId, status, vehicleInfo) => {
        // Updated to work with Firebase data structure
        const slot = currentBuildingSlots.find(s => s.slot_name === slotId);
        if (slot) {
            slot.status = status;
            // In real implementation, you'd update Firebase here
            renderParkingSlots();
        }
    },
    
    getSlot: (slotId) => {
        return currentBuildingSlots.find(s => s.slot_name === slotId) || null;
    },
    
    getAllSlots: () => currentBuildingSlots,
    
    refresh: () => renderParkingSlots(),
    
    // Firebase-based functions
    // updateStats: fetchAndUpdateStats,
    getCurrentSlots: () => currentBuildingSlots,
    setupRealTimeStats: setupRealTimeStatsUpdates,
    populateLevels: populateLevelTabs,
    getAvailableLevels: () => availableLevels
};