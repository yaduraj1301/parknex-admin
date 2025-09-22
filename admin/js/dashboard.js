// Dashboard JavaScript
import { db, auth, app } from '../../../public/js/firebase-config.js';
import { collection, getDocs, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Global variables
let currentLevel = 1;
let weeklyData = [45, 48, 15, 46, 42, 58, 60];
let currentBuildingSlots = [];
let availableLevels = [];

// ========================================
// LOADING OVERLAY FUNCTIONS
// ========================================

function showLoadingOverlay() {
    hideLoadingOverlay();
    
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading data...</div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        overlay.classList.add('visible');
    }, 10);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    }
}

// ========================================
// HEADER FUNCTIONS
// ========================================

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

async function populateBuildingDropdown() {
    try {
        showLoadingOverlay();
        
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
        
        const buildingSelector = document.querySelector('.building-selector');
        if (buildingSelector) {
            buildingSelector.innerHTML = '';
            
            buildingList.forEach(building => {
                const option = document.createElement('option');
                option.value = building;
                option.textContent = building;
                buildingSelector.appendChild(option);
            });
        }
        
        hideLoadingOverlay();
        return buildingList;
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Error fetching buildings:', error);
        
        const buildingSelector = document.querySelector('.building-selector');
        if (buildingSelector) {
            buildingSelector.innerHTML = '<option value="">Error loading buildings</option>';
        }
        
        return [];
    }
}

function handleBuildingChange(building) {
    if (!building) return;
    
    window.selectedBuilding = building;
    
    if (window.statsUnsubscribe) {
        window.statsUnsubscribe();
    }
    
    fetchAndUpdateStats(building).then(() => {
        populateLevelTabs(building).then(() => {
            renderParkingSlots();
        });
    });
    
    setupRealTimeStatsUpdates(building);
}

// ========================================
// STATS CARDS FUNCTIONS
// ========================================

async function fetchAndUpdateStats(selectedBuilding = null) {
    try {
        const parkingSlotsRef = collection(db, 'ParkingSlots');
        
        let q;
        if (selectedBuilding) {
            q = query(parkingSlotsRef, where('building', '==', selectedBuilding));
        } else {
            q = query(parkingSlotsRef);
        }
        
        const snapshot = await getDocs(q);
        
        currentBuildingSlots = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            currentBuildingSlots.push({
                ...data,
                docId: doc.id
            });
        });
        
        updateStatsCards();
        
        
    } catch (error) {
        console.error('Error fetching slots for stats:', error);
    }
}

function updateStatsCards() {
    if (currentBuildingSlots.length === 0) return;
    
    const stats = {
        total: currentBuildingSlots.length,
        available: currentBuildingSlots.filter(slot => 
            slot.status?.toLowerCase() === 'free'
        ).length,
        occupied: currentBuildingSlots.filter(slot => 
            slot.status?.toLowerCase() === 'booked' || slot.status?.toLowerCase() === 'unbooked'
        ).length,
        reserved: currentBuildingSlots.filter(slot => 
            slot.status?.toLowerCase() === 'reserved'
        ).length,
        named: currentBuildingSlots.filter(slot => 
            slot.status?.toLowerCase() === 'named'
        ).length,
        unbooked: currentBuildingSlots.filter(slot => 
            slot.status?.toLowerCase() === 'unbooked'
        ).length
    };
    
    const statCards = document.querySelectorAll('.stat-card');
    
    if (statCards.length >= 5) {
        const totalCard = statCards[0];
        const totalNumber = totalCard.querySelector('.stat-number');
        if (totalNumber) {
            totalNumber.textContent = stats.total;
        }
        
        updateStatCard(statCards[1], stats.available, stats.total);
        updateStatCard(statCards[2], stats.occupied, stats.total);
        updateStatCard(statCards[3], stats.reserved, stats.total);
        updateStatCard(statCards[4], stats.named, stats.total);
    }
    
    updateAlertCounts(stats);
}

function updateStatCard(cardElement, count, total) {
    if (!cardElement) return;
    
    const statNumber = cardElement.querySelector('.stat-number');
    const statPercentage = cardElement.querySelector('.stat-percentage');
    const statProgressFill = cardElement.querySelector('.stat-progress-fill');
    
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    
    if (statNumber) {
        statNumber.innerHTML = `${count} <span class="stat-total">/ ${total}</span>`;
    }
    
    if (statPercentage) {
        statPercentage.textContent = `${percentage}%`;
    }
    
    if (statProgressFill) {
        setTimeout(() => {
            statProgressFill.style.width = `${percentage}%`;
        }, 50);
    }
    
    const statChange = cardElement.querySelector('.stat-change');
    if (statChange) {
        statChange.style.display = 'none';
    }
}

// ========================================
// ALERTS FUNCTIONS
// ========================================

function updateAlertCounts(stats) {
    const hasUnbookedIssue = stats.unbooked > 0;
    
    const alertInsightsMain = document.querySelector('.insights .alert-insights');
    const attentionCardMain = document.querySelector('.insights .alert-card.attention');
    const noAlertsCard = document.querySelector('.insights .alert-card.no-alerts');
    const sensorCardMain = document.querySelector('.insights .alert-card.sensor');
    
    if (sensorCardMain) sensorCardMain.classList.add('hidden');
    
    if (alertInsightsMain) {
        alertInsightsMain.style.display = 'block';
    }
    
    if (!hasUnbookedIssue) {
        if (attentionCardMain) attentionCardMain.classList.add('hidden');
        if (noAlertsCard) noAlertsCard.classList.remove('hidden');
    } else {
        if (noAlertsCard) noAlertsCard.classList.add('hidden');
        if (attentionCardMain) {
            attentionCardMain.classList.remove('hidden');
            const alertText = attentionCardMain.querySelector('p');
            if (alertText) {
                alertText.textContent = `${stats.unbooked} vehicles are parked without booking.`;
            }
        }
    }
}

function handleAlertAction(button) {
    const alertType = button.closest('.alert-card').classList.contains('attention') ? 'attention' : 'sensor';

    if (alertType === 'attention') {
        scrollToParkingOverview();
        setTimeout(() => {
            highlightUnbookedSlots();
        }, 500);
    }
}

function scrollToParkingOverview() {
    const parkingSection = document.querySelector('.parking-overview');
    if (parkingSection) {
        parkingSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

function highlightUnbookedSlots() {
    const unbookedSlots = document.querySelectorAll('.parking-slot.unbooked');
    
    unbookedSlots.forEach(slot => {
        slot.style.transform = 'scale(1.1)';
        slot.style.boxShadow = '0 0 10px rgba(220, 20, 60, 0.5)';
        
        setTimeout(() => {
            slot.style.transform = '';
            slot.style.boxShadow = '';
        }, 1000);
    });
}

// ========================================
// CHART FUNCTIONS
// ========================================



// ========================================
// PARKING OVERVIEW FUNCTIONS
// ========================================


function switchLevel(level) {
    currentLevel = level;

    document.querySelectorAll('.level-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-level="${level}"]`).classList.add('active');

    renderParkingSlots();
}

function renderParkingSlots() {
    const parkingGrid = document.getElementById('parking-grid');
    if (!parkingGrid) return;

    parkingGrid.innerHTML = '';

    if (currentBuildingSlots.length === 0) {
        parkingGrid.innerHTML = '<div class="loading">Loading...</div>';
        return;
    }

    const currentLevelSlots = currentBuildingSlots.filter(slot => {
        if (!slot.floor) return false;
        const levelMatch = slot.floor.match(/level\s*(\d+)/i);
        if (levelMatch) {
            return parseInt(levelMatch[1]) === currentLevel;
        }
        return false;
    });

    const slotsByBlock = currentLevelSlots.reduce((blocks, slot) => {
        const blockName = slot.block || 'Unknown';
        if (!blocks[blockName]) blocks[blockName] = [];
        blocks[blockName].push(slot);
        return blocks;
    }, {});

    const blockNames = Object.keys(slotsByBlock).sort();

    if (blockNames.length === 0) {
        parkingGrid.innerHTML = `<div class="no-slots">No slots for Level ${currentLevel}</div>`;
        return;
    }

    blockNames.forEach(blockName => {
        const blockDiv = document.createElement('div');
        blockDiv.className = 'parking-block';

        const blockHeader = document.createElement('h4');
        blockHeader.textContent = `${blockName}-Block`;
        blockDiv.appendChild(blockHeader);

        const slotsGrid = document.createElement('div');
        slotsGrid.className = 'slots-grid';

        const blockSlots = slotsByBlock[blockName].sort((a, b) => 
            a.slot_name?.localeCompare(b.slot_name) || 0
        );

        blockSlots.forEach(slot => {
            const slotDiv = document.createElement('div');
            const status = mapFirebaseStatusToCss(slot.status);
            slotDiv.className = `parking-slot ${status}`;
            slotDiv.dataset.slot = slot.slot_name;
            slotDiv.dataset.docId = slot.docId;

            const slotId = document.createElement('span');
            slotId.className = 'slot-id';
            slotId.textContent = slot.slot_name;
            slotDiv.appendChild(slotId);

            const iconList = document.createElement('div');
            iconList.className = 'icon-list';

            if (slot.is_special) {
                addSpecialIcons(iconList, slot);
            }

            const carIcon = document.createElement('i');
            carIcon.className = 'slot-icon fas fa-car';
            iconList.appendChild(carIcon);

            slotDiv.appendChild(iconList);

            addSlotPopup(slotDiv, slot);

            slotsGrid.appendChild(slotDiv);
        });

        blockDiv.appendChild(slotsGrid);
        parkingGrid.appendChild(blockDiv);
    });
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
    
    if (notes.includes('pillar')) {
        const pillarIcon = document.createElement('img');
        pillarIcon.src = '../public/assets/icons/pillar.png';
        pillarIcon.className = 'slot-icon pillar';
        pillarIcon.title = 'Pillar nearby';
        pillarIcon.alt = 'Pillar';
        iconContainer.appendChild(pillarIcon);
    }
    
    if (notes.includes('corner')) {
        const cornerIcon = document.createElement('i');
        cornerIcon.className = 'slot-icon fas fa-turn-down corner';
        cornerIcon.title = 'Corner slot';
        iconContainer.appendChild(cornerIcon);
    }
    
    if (notes.includes('ev') || notes.includes('electric')) {
        const evIcon = document.createElement('i');
        evIcon.className = 'slot-icon fas fa-bolt';
        evIcon.title = 'EV Charging';
        iconContainer.appendChild(evIcon);
    }
}

function addSlotPopup(slotElement, slot) {
    const popup = document.createElement('div');
    popup.className = 'slot-popup';
    popup.innerHTML = `
        <strong>${slot.slot_name}</strong><br>
        Status: ${slot.status}<br>
        ${slot.notes ? `Notes: ${slot.notes}` : ''}
    `;
    
    slotElement.addEventListener('mouseenter', (e) => {
        document.body.appendChild(popup);
        
        const rect = slotElement.getBoundingClientRect();
        popup.style.left = `${rect.left + rect.width/2}px`;
        popup.style.top = `${rect.top - 10}px`;
        popup.classList.add('visible');
    });
    
    slotElement.addEventListener('mouseleave', () => {
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    });
}

function handleSlotClick(slotElement) {
    const docId = slotElement.dataset.docId;
    const slot = currentBuildingSlots.find(s => s.docId === docId);
    
    if (!slot) {
        alert('Slot data not found');
        return;
    }

    let message = `Slot: ${slot.slot_name}\nStatus: ${slot.status}\nBuilding: ${slot.building}\nFloor: ${slot.floor}`;
    
    if (slot.block) {
        message += `\nBlock: ${slot.block}`;
    }
    
    if (slot.notes) {
        message += `\nNotes: ${slot.notes}`;
    }
    
    if (slot.is_special) {
        message += `\nSpecial Slot: Yes`;
    }

    alert(message);
}

// ========================================
// FIREBASE & INITIALIZATION
// ========================================

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
            currentBuildingSlots = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                currentBuildingSlots.push({
                    ...data,
                    docId: doc.id
                });
            });
            
            updateStatsCards();
            populateLevelTabs(selectedBuilding).then(() => {
                renderParkingSlots();
            });
        });
        
        window.statsUnsubscribe = unsubscribe;
        
    } catch (error) {
        console.error('Error setting up real-time stats updates:', error);
    }
}

async function testFirebaseConnection() {
    try {
        if (db) {
            console.log('✅ Firebase Firestore connection successful');
        } else {
            console.error('❌ Firebase Firestore not initialized');
        }
        
        if (auth) {
            console.log('✅ Firebase Auth connection successful');
        } else {
            console.error('❌ Firebase Auth not initialized');
        }
        
    } catch (error) {
        console.error('❌ Firebase connection failed:', error);
    }
}

function setupEventListeners() {
    document.querySelectorAll('.level-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            switchLevel(parseInt(e.target.dataset.level));
        });
    });

    document.addEventListener('click', (e) => {
        if (e.target.closest('.parking-slot')) {
            handleSlotClick(e.target.closest('.parking-slot'));
        }
    });

    document.querySelectorAll('.alert-action').forEach(button => {
        button.addEventListener('click', (e) => {
            handleAlertAction(e.target);
        });
    });

    const buildingSelector = document.querySelector('.building-selector');
    if (buildingSelector) {
        buildingSelector.addEventListener('change', (e) => {
            handleBuildingChange(e.target.value);
        });
    }
}

async function init() {
    showLoadingOverlay();
    await testFirebaseConnection();
    
    const buildingList = await populateBuildingDropdown();
    
    if (buildingList && buildingList.length > 0) {
        const defaultBuilding = buildingList[0];
        
        const buildingSelector = document.querySelector('.building-selector');
        if (buildingSelector) {
            buildingSelector.value = defaultBuilding;
        }
        
        window.selectedBuilding = defaultBuilding;
        
        await fetchAndUpdateStats(defaultBuilding);
        await populateLevelTabs(defaultBuilding);
        renderParkingSlots();
        setupRealTimeStatsUpdates(defaultBuilding);
    } else {
        await fetchAndUpdateStats();
        await populateLevelTabs();
        renderParkingSlots();
        setupRealTimeStatsUpdates();
    }
    
    updateDateTime();
    setupEventListeners();
    renderChart();

    setInterval(updateDateTime, 1000);
    hideLoadingOverlay();
}

document.addEventListener('DOMContentLoaded', init);

window.ParkingAPI = {
    updateSlot: (slotId, status, vehicleInfo) => {
        const slot = currentBuildingSlots.find(s => s.slot_name === slotId);
        if (slot) {
            slot.status = status;
            renderParkingSlots();
        }
    },
    
    getSlot: (slotId) => {
        return currentBuildingSlots.find(s => s.slot_name === slotId) || null;
    },
    
    getAllSlots: () => currentBuildingSlots,
    refresh: () => renderParkingSlots(),
    updateStats: fetchAndUpdateStats,
    getCurrentSlots: () => currentBuildingSlots,
    setupRealTimeStats: setupRealTimeStatsUpdates,
    populateLevels: populateLevelTabs,
    getAvailableLevels: () => availableLevels
};