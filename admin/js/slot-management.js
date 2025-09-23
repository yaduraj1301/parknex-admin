import { db, auth, app } from "../../public/js/firebase-config.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    where,
    onSnapshot,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

let currentLevel = 1;
let currentBuildingSlots = [];
let availableLevels = [];
let filteredSlots = []; // Store filtered slots
let activeFilters = {
    search: '',
    status: '',
    quickFilter: ''
};

// ===== Modal Utility Functions =====

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "flex";
        modal.style.flexDirection = "column";
        // Add scrollable class to modal content
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.add('scrollable-modal');
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "none";
        // Remove scrollable class
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.remove('scrollable-modal');
        }

        // Reset form if it's the add slot modal
        if (modalId === "addSlotModal") {
            document.getElementById("addSlotForm").reset();
            document.getElementById("notesSection").style.display = "none";
        }

        // Reset configure modal form
        if (modalId === "configureSlotModal") {
            document.getElementById("configureSlotForm").reset();
        }
    }
}

// ===== Search and Filter Functions =====

function searchSlots(searchTerm) {
    activeFilters.search = searchTerm.toLowerCase();
    applyFilters();
}

function filterByStatus(status) {
    activeFilters.status = status;
    applyFilters();
}

function setQuickFilter(filterType) {
    activeFilters.quickFilter = filterType;

    // Update button states
    document.querySelectorAll('.quick-filters .btn').forEach(btn => {
        btn.classList.remove('active');
    });

    if (filterType) {
        const activeBtn = document.getElementById(`btn-${filterType}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    applyFilters();
}

function clearFilters() {
    // Reset all filters
    activeFilters = {
        search: '',
        status: '',
        quickFilter: ''
    };

    // Reset UI elements
    const searchInput = document.querySelector('.search-input');
    if (searchInput) searchInput.value = '';

    const statusSelect = document.querySelector('.filter-select[onchange*="filterByStatus"]');
    if (statusSelect) statusSelect.value = '';

    // Remove active states from quick filter buttons
    document.querySelectorAll('.quick-filters .btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Re-render slots
    applyFilters();
}

function applyFilters() {
    let slotsToFilter = currentBuildingSlots.filter(slot => {
        if (!slot.floor) return false;

        // Filter by current level
        const levelMatch = slot.floor.match(/level\s*(\d+)/i);
        if (levelMatch) {
            const slotLevel = parseInt(levelMatch[1]);
            return slotLevel === currentLevel;
        }
        return false;
    });

    // Apply search filter
    if (activeFilters.search) {
        slotsToFilter = slotsToFilter.filter(slot =>
            slot.slot_name?.toLowerCase().includes(activeFilters.search) ||
            slot.block?.toLowerCase().includes(activeFilters.search) ||
            slot.building?.toLowerCase().includes(activeFilters.search)
        );
    }

    // Apply status filter
    if (activeFilters.status) {
        slotsToFilter = slotsToFilter.filter(slot => {
            const mappedStatus = mapFirebaseStatusToCss(slot.status);
            return mappedStatus === activeFilters.status ||
                (activeFilters.status === 'unauthorized' && mappedStatus === 'unbooked');
        });
    }

    // Apply quick filters
    if (activeFilters.quickFilter) {
        switch (activeFilters.quickFilter) {
            case 'unbooked':
                slotsToFilter = slotsToFilter.filter(slot =>
                    mapFirebaseStatusToCss(slot.status) === 'unbooked' ||
                    mapFirebaseStatusToCss(slot.status) === 'available'
                );
                break;
            case 'ev':
                slotsToFilter = slotsToFilter.filter(slot =>
                    slot.type?.toLowerCase() === 'ev' ||
                    slot.notes?.toLowerCase().includes('ev slot')
                );
                break;
            case 'handicapped':
                slotsToFilter = slotsToFilter.filter(slot =>
                    slot.type?.toLowerCase() === 'handicap' ||
                    slot.type?.toLowerCase() === 'handicapped' ||
                    slot.notes?.toLowerCase().includes('handicapped slot')
                );
                break;
        }
    }

    filteredSlots = slotsToFilter;
    renderFilteredParkingSlots();
}

// ===== Slot Configuration Functions =====

function handleSlotEdit(slotId) {
    populateBuildingDropdown(); // Refresh building list
    const slot = currentBuildingSlots.find(s => s.slot_name === slotId);
    if (!slot) return;
    console.log("slot: ",slot);
    // Populate configure modal with slot data
    document.getElementById('configSlotNumber').value = slot.slot_name || '';
    document.getElementById('configSlotBuilding').value = slot.building || '';
    document.getElementById('configSlotLevel').value = slot.floor || '';
    document.getElementById('configSlotBlock').value = slot.block || '';
    document.getElementById('configSlotStatus').value = slot.status || 'available';

    // Handle is_special field
    const isSpecialValue = slot.is_special ? 'yes' : 'no';
    const configIsSpecialDropdown = document.getElementById('configSlotIsSpecial');
    if (configIsSpecialDropdown) {
        configIsSpecialDropdown.value = isSpecialValue;

        // Show/hide notes section based on is_special value
        const configNotesSection = document.getElementById('configNotesSection');
        const configNotesRadio = document.getElementById('configNotesRadio');

        if (isSpecialValue === 'yes') {
            if (configNotesSection) configNotesSection.style.display = 'block';
            if (configNotesRadio) {
                configNotesRadio.style.display = 'block';

                // Set radio button based on notes content
                const notes = slot.notes || '';
                const radioOptions = document.querySelectorAll('input[name="configSlotNotesRadio"]');
                radioOptions.forEach(radio => {
                    if (notes.toLowerCase().includes(radio.value.toLowerCase())) {
                        radio.checked = true;
                    } else {
                        radio.checked = false;
                    }
                });
            }
        } else {
            if (configNotesSection) configNotesSection.style.display = 'none';
            if (configNotesRadio) configNotesRadio.style.display = 'none';
        }
    }

    // Store slot data for form submission
    window.currentEditingSlot = slot;

    openModal('configureSlotModal');
}



// ===== Add Slot Function =====

async function handleAddSlotSubmit(e) {
    e.preventDefault();

    // Show loading state
    populateBuildingDropdown(); // Refresh building list
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    submitBtn.disabled = true;

    try {
        // Get form data
        const slotNumber = document.getElementById('slotNumber').value.trim();
        const building = document.getElementById('slotBuilding').value.trim();
        const level = document.getElementById('slotLevel').value.trim();
        const block = document.getElementById('slotBlock').value;
        const status = document.getElementById('slotInitialStatus').value;
        const isSpecial = document.getElementById('slotIsSpecial').value === 'yes';
        let notes = '';

        if (isSpecial) {
            // Get notes from radio buttons only
            const checkedRadio = document.querySelector('input[name="slotNotesRadio"]:checked');
            notes = checkedRadio ? checkedRadio.value : '';
        }

        // Validation
        if (!slotNumber) {
            throw new Error('Slot number is required');
        }

        // Check if slot already exists
        const existingSlot = currentBuildingSlots.find(slot =>
            slot.slot_name?.toLowerCase() === slotNumber.toLowerCase()
        );

        if (existingSlot) {
            throw new Error('A slot with this number already exists');
        }

        // Prepare data for Firebase
        const slotData = {
            slot_name: slotNumber,
            building: `${building}` || window.selectedBuilding || 'building1',
            block: block,
            floor: `Level ${level}`,
            status: status,
            is_special: isSpecial,
            notes: notes,
        };

        console.log('Adding new slot to Firebase:', slotData);

        // Add to Firebase
        const docRef = await addDoc(collection(db, 'ParkingSlots'), slotData);
        console.log('Slot added successfully with ID:', docRef.id);

        // Close modal and reset form
        closeModal('addSlotModal');

        // Show success message
        showNotification('Slot added successfully!', 'success');
        renderParkingSlots();

    } catch (error) {
        console.error('Error adding slot:', error);
        showNotification(`Failed to add slot: ${error.message}`, 'error');
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}




async function handleConfigureSlotSubmit(e) {
    e.preventDefault();

    if (!window.currentEditingSlot) {
        showNotification('No slot selected for editing', 'error');
        return;
    }

    // Show loading state
    const submitBtn = e.target.querySelector('#configSubmit');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    submitBtn.disabled = true;

    try {
        // Get form data
        const building = document.getElementById('configSlotBuilding').value.trim();
        const status = document.getElementById('configSlotStatus').value;
        const isSpecial = document.getElementById('configSlotIsSpecial').value === 'yes';

        // Get notes from radio buttons if special
        let notes = '';
        if (isSpecial) {
            const checkedRadio = document.querySelector('input[name="configSlotNotesRadio"]:checked');
            if (!checkedRadio) {
                throw new Error('Please select a special slot type');
            }
            notes = checkedRadio.value;
        }

        // Extract block from current slot name
        const currentSlotName = window.currentEditingSlot.slot_name;
        const block = currentSlotName ? currentSlotName.charAt(0).toUpperCase() : 'A';

        // Prepare updated data with exact Firestore structure
        const updatedData = {
            block: block,
            building: building || window.selectedBuilding || 'building1',
            floor: `Level ${currentLevel}`,
            is_special: isSpecial,
            notes: notes,
            slot_name: currentSlotName, // Keep original slot name
            status: status
        };

        console.log('Updating slot in Firestore:', {
            docId: window.currentEditingSlot.docId,
            updates: updatedData
        });

        // Update in Firestore
        const slotRef = doc(db, 'ParkingSlots', window.currentEditingSlot.docId);
        await updateDoc(slotRef, updatedData);

        console.log('Slot updated successfully');

        // Close modal
        closeModal('configureSlotModal');

        // Clear editing reference
        window.currentEditingSlot = null;

        // Show success message
        showNotification('Slot updated successfully!', 'success');

        // The real-time listener will automatically update the grid

    } catch (error) {
        console.error('Error updating slot:', error);
        showNotification(`Failed to update slot: ${error.message}`, 'error');
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ===== Debug Function to Print All Slots =====

// Make function available globally for console access

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification-toast');
    existingNotifications.forEach(notification => notification.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="notification-icon fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span class="notification-message">${message}</span>
        </div>
    `;

    // Add to body
    document.body.appendChild(notification);

    // Show with animation
    setTimeout(() => notification.classList.add('show'), 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// ===== Event Listeners Setup =====
document.addEventListener("DOMContentLoaded", () => {
    // Modal event listeners
    const addSlotBtn = document.getElementById("add-slot-btn");
    if (addSlotBtn) {
        addSlotBtn.addEventListener("click", (e) => {
            e.preventDefault();
            openModal("addSlotModal");
        });
    }

    const closeAddSlotModal = document.getElementById("closeAddSlotModal");
    if (closeAddSlotModal) {
        closeAddSlotModal.addEventListener("click", () => {
            closeModal("addSlotModal");
        });
    }

    const cancelAddSlot = document.getElementById("cancelAddSlot");
    if (cancelAddSlot) {
        cancelAddSlot.addEventListener("click", () => {
            closeModal("addSlotModal");
        });
    }

    // Form submissions
    const addSlotForm = document.getElementById("addSlotForm");
    if (addSlotForm) {
        addSlotForm.addEventListener("submit", handleAddSlotSubmit);
    }

    const configureSlotForm = document.getElementById("configureSlotForm");
    if (configureSlotForm) {
        configureSlotForm.addEventListener("submit", handleConfigureSlotSubmit);
    }

    // Special field toggle for Add Modal
    const isSpecialDropdown = document.getElementById("slotIsSpecial");
    if (isSpecialDropdown) {
        isSpecialDropdown.addEventListener("change", function () {
            const notesSection = document.getElementById("notesSection");
            const notesRadio = document.getElementById("notesRadio");

            if (this.value === "yes") {
                if (notesSection) notesSection.style.display = "block";
                if (notesRadio) notesRadio.style.display = "block";
            } else {
                if (notesSection) notesSection.style.display = "none";
                if (notesRadio) notesRadio.style.display = "none";
                // Clear any selected radio buttons
                const radioButtons = document.querySelectorAll('input[name="slotNotesRadio"]');
                radioButtons.forEach(radio => radio.checked = false);
            }
        });
    }

    // Special field toggle for Configure Modal
    const configIsSpecialDropdown = document.getElementById("configSlotIsSpecial");
    if (configIsSpecialDropdown) {
        configIsSpecialDropdown.addEventListener("change", function () {
            const configNotesSection = document.getElementById("configNotesSection");
            const configNotesRadio = document.getElementById("configNotesRadio");

            if (this.value === "yes") {
                if (configNotesSection) configNotesSection.style.display = "block";
                if (configNotesRadio) configNotesRadio.style.display = "block";
            } else {
                if (configNotesSection) configNotesSection.style.display = "none";
                if (configNotesRadio) configNotesRadio.style.display = "none";
                // Clear any selected radio buttons
                const radioButtons = document.querySelectorAll('input[name="configSlotNotesRadio"]');
                radioButtons.forEach(radio => radio.checked = false);
            }
        });
    }

    // Quick filter buttons
    const btnUnbooked = document.getElementById("btn-unbooked");
    if (btnUnbooked) {
        btnUnbooked.addEventListener("click", () => setQuickFilter('unbooked'));
    }

    const btnEV = document.getElementById("btn-ev");
    if (btnEV) {
        btnEV.addEventListener("click", () => setQuickFilter('ev'));
    }

    const btnHandicapped = document.getElementById("btn-handicapped");
    if (btnHandicapped) {
        btnHandicapped.addEventListener("click", () => setQuickFilter('handicapped'));
    }

    const clearFiltersBtn = document.getElementById("clear-filters");
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener("click", clearFilters);
    }

    // Refresh button
    const refreshBtn = document.getElementById("refresh-btn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            clearFilters();
            renderParkingSlots();
        });
    }

    // Close modal when clicking outside
    window.addEventListener("click", (e) => {
        const addModal = document.getElementById("addSlotModal");
        const configModal = document.getElementById("configureSlotModal");

        if (e.target === addModal) {
            closeModal("addSlotModal");
        }
        if (e.target === configModal) {
            closeModal("configureSlotModal");
        }
    });
});

// Make search function available globally for onkeyup attribute
window.searchSlots = searchSlots;
window.filterByStatus = filterByStatus;
window.closeModal = closeModal;

// ===== Building and Level Functions (existing) =====

async function populateBuildingDropdown() {
    try {
        console.log('Fetching buildings from Firebase...');

        const parkingSlotsRef = collection(db, 'ParkingSlots');
        const snapshot = await getDocs(parkingSlotsRef);

        const buildings = new Set();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.building) {
                buildings.add(data.building);
            }
        });

        const buildingList = Array.from(buildings).sort();
        console.log('Found buildings:', buildingList);

        // Populate ALL building dropdowns
        const buildingDropdownIds = ['slotBuilding', 'configSlotBuilding', 'filter-select'];
        buildingDropdownIds.forEach(dropdownId => {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) {
                dropdown.innerHTML = '';
                buildingList.forEach(building => {
                    const option = document.createElement('option');
                    option.value = building;
                    option.textContent = building;
                    dropdown.appendChild(option);
                });
            }
        });

        return buildingList;

    } catch (error) {
        console.error('Error fetching buildings:', error);

        const buildingSelector = document.querySelector('.filter-select');
        if (buildingSelector) {
            buildingSelector.innerHTML = '<option value="">Error loading buildings</option>';
        }

        return [];
    }
}

async function populateLevelTabs(selectedBuilding = null) {
    try {
        console.log('Fetching levels for building:', selectedBuilding);

        let slotsToCheck = currentBuildingSlots;

        if (slotsToCheck.length === 0 && selectedBuilding) {
            const parkingSlotsRef = collection(db, 'ParkingSlots');
            const q = query(parkingSlotsRef, where('building', '==', selectedBuilding));
            const snapshot = await getDocs(q);

            slotsToCheck = [];
            snapshot.forEach(doc => {
                slotsToCheck.push(doc.data());
            });
        }

        const levels = new Set();
        slotsToCheck.forEach(slot => {
            if (slot.floor) {
                const levelMatch = slot.floor.match(/level\s*(\d+)/i);
                if (levelMatch) {
                    levels.add(parseInt(levelMatch[1]));
                }
            }
        });

        availableLevels = Array.from(levels).sort((a, b) => a - b);
        console.log('Available levels:', availableLevels);

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
            q = query(parkingSlotsRef, where('building', '==', selectedBuilding));
        } else {
            q = query(parkingSlotsRef);
        }

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

            populateLevelTabs(selectedBuilding).then(() => {
                applyFilters(); // Use filtered rendering instead
            });
        });

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

        console.log('Firebase App Name:', app.name);
        console.log('Firebase Project ID:', app.options.projectId);

        if (db) {
            console.log('✅ Firebase Firestore connection successful');
            console.log('Firestore instance:', db.app.name);
        } else {
            console.error('❌ Firebase Firestore not initialized');
        }

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
    // Level tabs
    document.querySelectorAll('.level-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            switchLevel(parseInt(e.target.dataset.level));
        });
    });

    // Building selector
    const buildingSelector = document.querySelector('.filter-select');
    if (buildingSelector) {
        buildingSelector.addEventListener('change', (e) => {
            console.log("Event listener for the buildingSelector");
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
    const activeTab = document.querySelector(`[data-level="${level}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    // Re-render with current filters
    applyFilters();
}

function handleBuildingChange(building) {
    if (!building) return;

    console.log(`Building selected: ${building}`);

    window.selectedBuilding = building;

    if (window.statsUnsubscribe) {
        window.statsUnsubscribe();
    }

    console.log("In handleBuildingChange");

    populateLevelTabs(building).then(() => {
        console.log("In handleBuildingChange - then statement");
        applyFilters(); // Use filtered rendering
    });

    setupRealTimeStatsUpdates(building);
}

function renderFilteredParkingSlots() {
    const parkingGrid = document.getElementById('parking-grid');
    if (!parkingGrid) return;

    // Clear existing content
    parkingGrid.innerHTML = '';

    // Use filtered slots or show loading
    const slotsToRender = filteredSlots.length > 0 ? filteredSlots :
        (activeFilters.search || activeFilters.status || activeFilters.quickFilter ? [] :
            currentBuildingSlots.filter(slot => {
                if (!slot.floor) return false;
                const levelMatch = slot.floor.match(/level\s*(\d+)/i);
                if (levelMatch) {
                    const slotLevel = parseInt(levelMatch[1]);
                    return slotLevel === currentLevel;
                }
                return false;
            }));

    if (slotsToRender.length === 0) {
        const message = currentBuildingSlots.length === 0 ? 'Loading parking slots...' :
            (activeFilters.search || activeFilters.status || activeFilters.quickFilter ?
                'No slots match the current filters' :
                `No parking slots found for Level ${currentLevel}`);
        parkingGrid.innerHTML = `<div class="no-slots">${message}</div>`;
        return;
    }

    // Group slots by block
    const slotsByBlock = slotsToRender.reduce((blocks, slot) => {
        const blockName = slot.block || 'Unknown';
        if (!blocks[blockName]) {
            blocks[blockName] = [];
        }
        blocks[blockName].push(slot);
        return blocks;
    }, {});

    const blockNames = Object.keys(slotsByBlock).sort();

    // Special handling for single slot search results
    const isFilteredSearch = activeFilters.search || activeFilters.status || activeFilters.quickFilter;
    const totalSlots = slotsToRender.length;

    if (isFilteredSearch && totalSlots === 1) {
        // For single slot results, create a compact single-block layout
        const slot = slotsToRender[0];
        const blockDiv = document.createElement('div');
        blockDiv.className = 'parking-block single-result';

        const blockHeader = document.createElement('h4');
        blockHeader.textContent = `Found: ${slot.block || 'Unknown'}-Block`;
        blockDiv.appendChild(blockHeader);

        const slotsGrid = document.createElement('div');
        slotsGrid.className = 'slots-grid single-slot';

        const slotDiv = createSlotElement(slot);
        slotsGrid.appendChild(slotDiv);

        blockDiv.appendChild(slotsGrid);
        parkingGrid.appendChild(blockDiv);
    } else {
        // Regular multi-block layout
        blockNames.forEach(blockName => {
            const blockDiv = document.createElement('div');
            blockDiv.className = 'parking-block';

            const blockHeader = document.createElement('h4');
            blockHeader.textContent = `${blockName}-Block`;
            blockDiv.appendChild(blockHeader);

            const slotsGrid = document.createElement('div');
            slotsGrid.className = 'slots-grid';

            const blockSlots = slotsByBlock[blockName].sort((a, b) => {
                return a.slot_name?.localeCompare(b.slot_name) || 0;
            });

            blockSlots.forEach(slot => {
                const slotDiv = createSlotElement(slot);
                slotsGrid.appendChild(slotDiv);
            });

            blockDiv.appendChild(slotsGrid);
            parkingGrid.appendChild(blockDiv);
        });
    }

    console.log(`Rendered ${slotsToRender.length} slots for Level ${currentLevel}`);
}

// Helper function to create slot elements (to avoid code duplication)
function createSlotElement(slot) {
    const slotDiv = document.createElement('div');

    const status = mapFirebaseStatusToCss(slot.status);
    slotDiv.className = `parking-slot ${status}`;
    slotDiv.dataset.slot = slot.slot_name;
    slotDiv.dataset.docId = slot.docId;

    // Add slot ID
    const slotId = document.createElement('span');
    slotId.className = 'slot-id';
    slotId.textContent = slot.slot_name;
    slotDiv.appendChild(slotId);

    // Create icon container
    // Create icon container
    const iconList = document.createElement('div');
    iconList.className = 'icon-list';

    // Add special icons (pillar, corner, EV from notes)
    if (slot.is_special) {
        addSpecialIcons(iconList, slot);
    }

    // Add car icon
    const carIcon = document.createElement('i');
    carIcon.className = 'slot-icon fas fa-car';
    iconList.appendChild(carIcon);

    // Keep EV icon if slot.type is EV (extra check, optional)
    if (slot.type?.toLowerCase() === 'ev') {
        const evIcon = document.createElement('i');
        evIcon.className = 'fa fa-bolt available';
        evIcon.title = 'EV Charging Slot';
        iconList.appendChild(evIcon);
    }

    slotDiv.appendChild(iconList);


    // Add edit button (shows on hover)
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-slot-btn';
    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
    editBtn.title = 'Edit Slot';
    slotDiv.appendChild(editBtn);

    // Make entire slot clickable
    slotDiv.addEventListener('click', () => {
        handleSlotEdit(slot.slot_name);
    });

    slotDiv.style.cursor = 'pointer';

    return slotDiv;
}

// Update the original render function to use the filtered version
// function renderParkingSlots() {
//     // Clear filters and render all slots for current level
//     filteredSlots = currentBuildingSlots.filter(slot => {
//         if (!slot.floor) return false;
//         const levelMatch = slot.floor.match(/level\s*(\d+)/i);
//         if (levelMatch) {
//             const slotLevel = parseInt(levelMatch[1]);
//             return slotLevel === currentLevel;
//         }
//         return false;
//     });
//     renderFilteredParkingSlots();
// }

function renderParkingSlots() {
    const parkingGrid = document.getElementById('parking-grid');
    console.log("Rendering parking slots");
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
            if (slot.is_special) {
                addSpecialIcons(iconList, slot);
            }

            // Add car icon
            const carIcon = document.createElement('i');
            carIcon.className = 'slot-icon fas fa-car';
            iconList.appendChild(carIcon);

            slotDiv.appendChild(iconList);

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

function addSpecialIcons(iconContainer, slot) {
    const notes = slot.notes?.toLowerCase() || '';

    // Add pillar icon
    if (notes.includes('pillar')) {
        const pillarIcon = document.createElement('img');
        pillarIcon.src = '../public/assets/icons/pillar.png';
        pillarIcon.className = 'slot-icon pillar';
        pillarIcon.title = 'Pillar nearby';
        pillarIcon.alt = 'Pillar';
        iconContainer.appendChild(pillarIcon);
    }

    // Add corner icon
    if (notes.includes('corner')) {
        const cornerIcon = document.createElement('i');
        cornerIcon.className = 'slot-icon fas fa-turn-down corner';
        cornerIcon.title = 'Corner slot';
        iconContainer.appendChild(cornerIcon);
    }

    // Add EV icon
    if (notes.includes('ev') || notes.includes('electric')) {
        const evIcon = document.createElement('i');
        evIcon.className = 'slot-icon fas fa-bolt';
        evIcon.title = 'EV Charging';
        iconContainer.appendChild(evIcon);
    }
}

async function init() {
    await testFirebaseConnection();

    const buildingList = await populateBuildingDropdown();

    if (buildingList && buildingList.length > 0) {
        const defaultBuilding = buildingList[0];

        const buildingSelector = document.querySelector('.filter-select');
        console.log("default building : ", defaultBuilding);
        if (buildingSelector) {
            buildingSelector.value = defaultBuilding;
        }

        window.selectedBuilding = defaultBuilding;

        await populateLevelTabs(defaultBuilding);
        renderParkingSlots();

        setupRealTimeStatsUpdates(defaultBuilding);
    } else {
        console.warn('No buildings found, loading all slots');
        await populateLevelTabs();
        renderParkingSlots();
        setupRealTimeStatsUpdates();
    }

    setupEventListeners();
}

document.addEventListener('DOMContentLoaded', init);

// Global API
window.ParkingAPI = {
    updateSlot: (slotId, status, vehicleInfo) => {
        const slot = currentBuildingSlots.find(s => s.slot_name === slotId);
        if (slot) {
            slot.status = status;
            applyFilters(); // Use filtered rendering
        }
    },

    getSlot: (slotId) => {
        return currentBuildingSlots.find(s => s.slot_name === slotId) || null;
    },

    getAllSlots: () => currentBuildingSlots,

    refresh: () => {
        clearFilters();
        renderParkingSlots();
    },

    getCurrentSlots: () => currentBuildingSlots,
    setupRealTimeStats: setupRealTimeStatsUpdates,
    populateLevels: populateLevelTabs,
    getAvailableLevels: () => availableLevels,

    // New filter API
    searchSlots,
    filterByStatus,
    setQuickFilter,
    clearFilters,
    getFilteredSlots: () => filteredSlots
};