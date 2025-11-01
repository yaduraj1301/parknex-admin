
import { db, auth, app } from '../../public/js/firebase-config.js';
import { collection, getDocs, query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Global variables

let currentLevel = 1;
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
        // console.log('Found buildings:', buildingList);

        const buildingSelector = document.querySelector('.building-selector');

        if (buildingSelector) {
            buildingSelector.innerHTML = '';
            buildingList.forEach(building => {
                const option = document.createElement('option');
                option.value = building;
                option.textContent = building;
                buildingSelector.appendChild(option);
            });

            // console.log(`Building dropdown populated with ${buildingList.length} buildings`);
        } else {
            console.error('Building selector not found in DOM');
        }

        hideLoadingOverlay();
        return buildingList;

    } catch (error) {
        hideLoadingOverlay();
        // console.error('Error fetching buildings:', error);

        const buildingSelector = document.querySelector('.building-selector');
        if (buildingSelector) {
            buildingSelector.innerHTML = '<option value="">Error loading buildings</option>';
        }

        return [];
    }
}

async function populateLevelTabs(selectedBuilding = null) {
    try {
        // console.log('Fetching levels for building:', selectedBuilding);

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
        // console.log('Available levels:', availableLevels);

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

async function fetchAndUpdateStats(selectedBuilding = null) {
    try {
        // console.log('Fetching slots for stats update...');

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

        // console.log(`Loaded ${currentBuildingSlots.length} slots for stats`);
        updateStatsCards();

    } catch (error) {
        console.error('Error fetching slots for stats:', error);
    }
}

function updateStatsCards() {
    if (currentBuildingSlots.length === 0) {
        // console.log('No slots data available for stats');
        return;
    }

    // console.log('=== ALL SLOTS IN CURRENT BUILDING ===');
    // console.log(`Total slots found: ${currentBuildingSlots.length}`);
    // console.log('Detailed slot information:');

    // currentBuildingSlots.forEach((slot, index) => {
    //     console.log(`Slot ${index + 1}:`, {
    //         slot_name: slot.slot_name,
    //         status: slot.status,
    //         building: slot.building,
    //         floor: slot.floor,
    //         block: slot.block,
    //         is_special: slot.is_special,
    //         notes: slot.notes,
    //         docId: slot.docId
    //     });
    // });

    const statusGroups = currentBuildingSlots.reduce((groups, slot) => {
        const status = slot.status || 'undefined';
        if (!groups[status]) {
            groups[status] = [];
        }
        groups[status].push(slot.slot_name);
        return groups;
    }, {});

    // console.log('=== SLOTS GROUPED BY STATUS ===');
    // Object.keys(statusGroups).forEach(status => {
    //     console.log(`${status.toUpperCase()}: [${statusGroups[status].join(', ')}] (${statusGroups[status].length} slots)`);
    // });

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

    // console.log('Calculated stats:', stats);

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

function updateAlertCounts(stats) {
    const hasUnbookedIssue = stats.unbooked > 0;

    const alertInsightsMain = document.querySelector('.insights .alert-insights');
    const attentionCardMain = document.querySelector('.insights .alert-card.attention');
    const noAlertsCard = document.querySelector('.insights .alert-card.no-alerts');
    const sensorCardMain = document.querySelector('.insights .alert-card.sensor');

    if (sensorCardMain) sensorCardMain.classList.add('hidden');
    if (alertInsightsMain) alertInsightsMain.style.display = 'block';

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
        popup.style.left = `${rect.left + rect.width / 2}px`;
        popup.style.top = `${rect.top - 10}px`;
        popup.classList.add('visible');
    });

    slotElement.addEventListener('mouseleave', () => {
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    });
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
            // console.log('Real-time update received for stats and slots');

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

// function updateSlotLayoutForBuilding() {
//     renderParkingSlots();
// }

function handleSlotClick(slotElement) {
    const slotId = slotElement.dataset.slot;
    const docId = slotElement.dataset.docId;

    const slot = currentBuildingSlots.find(s => s.slot_name === slotId);

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

function scrollToParkingOverview() {
    const parkingSection = document.querySelector('.parking-overview');
    if (parkingSection) {
        parkingSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

function handleAlertAction(button) {
    const alertType = button.closest('.alert-card').classList.contains('attention') ? 'attention' : 'sensor';

    if (alertType === 'attention') {
        scrollToParkingOverview();
        setTimeout(() => {
            highlightUnbookedSlots();
        }, 500);
    } else {
        alert('Redirecting to sensor diagnostics...');
    }
}

async function updateDashboardData(building) {
    try {
        window.selectedBuilding = building;
        localStorage.setItem('selectedBuilding', selectedBuilding);
        document.getElementById('building-card').innerHTML = `<h3>${selectedBuilding || 'N/A'}</h3>`;

        const updatePromises = [
            getWeeklyBookingData(building),
            fetchAndUpdateStats(building),
            populateLevelTabs(building)
        ];

        const [weeklyData] = await Promise.all(updatePromises);

        if (window.bookingChart) {
            window.bookingChart.destroy();
        }
        await renderChart(building, weeklyData);

        hideLoadingOverlay();
    } catch (error) {
        console.error('Error updating dashboard:', error);
        hideLoadingOverlay();
    }
}

function handleBuildingChange(building) {
    if (!building) return;

    console.log(`Building selected: ${building}`);

    if (window.statsUnsubscribe) {
        window.statsUnsubscribe();
    }

    showLoadingOverlay();

    updateDashboardData(building);
    fetchAndUpdateStats(building).then(() => {
        populateLevelTabs(building).then(() => {
            renderParkingSlots();
        });
    });

    setupRealTimeStatsUpdates(building);
}

function renderParkingSlots() {
    const parkingGrid = document.getElementById('parking-grid');
    if (!parkingGrid) return;

    parkingGrid.innerHTML = '';

    if (currentBuildingSlots.length === 0) {
        parkingGrid.innerHTML = '<div class="loading">Loading parking slots...</div>';
        return;
    }

    const currentLevelSlots = currentBuildingSlots.filter(slot => {
        if (!slot.floor) return false;
        const levelMatch = slot.floor.match(/level\s*(\d+)/i);
        if (levelMatch) {
            const slotLevel = parseInt(levelMatch[1]);
            return slotLevel === currentLevel;
        }
        return false;
    });

    const slotsByBlock = currentLevelSlots.reduce((blocks, slot) => {
        const blockName = slot.block || 'Unknown';
        if (!blocks[blockName]) {
            blocks[blockName] = [];
        }
        blocks[blockName].push(slot);
        return blocks;
    }, {});

    const blockNames = Object.keys(slotsByBlock).sort();

    if (blockNames.length === 0) {
        parkingGrid.innerHTML = `<div class="no-slots">No parking slots found for Level ${currentLevel}</div>`;
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

        const blockSlots = slotsByBlock[blockName].sort((a, b) => {
            return a.slot_name?.localeCompare(b.slot_name) || 0;
        });

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

    // console.log(`Rendered ${currentLevelSlots.length} slots for Level ${currentLevel}`);
}

function mapFirebaseStatusToCss(firebaseStatus) {
    if (!firebaseStatus) return 'available';

    const status = firebaseStatus.toLowerCase();
    switch (status) {
        case 'free': return 'available';
        case 'booked': return 'occupied';
        case 'reserved': return 'reserved';
        case 'named': return 'named';
        case 'unbooked': return 'unbooked';
        default: return 'available';
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


async function getWeeklyBookingData(building) {
    try {
        const today = new Date();
        const currentDay = today.getDay();

        const lastMonday = new Date();
        lastMonday.setDate(today.getDate() - currentDay - 7 + 1);
        lastMonday.setHours(0, 0, 0, 0);

        const lastSaturday = new Date(lastMonday);
        lastSaturday.setDate(lastMonday.getDate() + 5);
        lastSaturday.setHours(23, 59, 59, 999);

        // console.log('Fetching bookings from:', lastMonday, 'to:', lastSaturday);

        const parkingSlotsRef = collection(db, 'ParkingSlots');
        const slotsQuery = query(parkingSlotsRef, where('building', '==', building));
        const slotsSnapshot = await getDocs(slotsQuery);

        const buildingSlotIds = new Set();
        slotsSnapshot.forEach(doc => {
            buildingSlotIds.add(doc.id);
        });

        const bookingsRef = collection(db, 'bookings');
        const bookingsQuery = query(
            bookingsRef,
            where('booking_time', '>=', lastMonday),
            where('booking_time', '<=', lastSaturday),
            orderBy('booking_time', 'asc')
        );

        const snapshot = await getDocs(bookingsQuery);
        const dayCounts = [0, 0, 0, 0, 0, 0];

        snapshot.forEach(doc => {
            const data = doc.data();
            let bookingSlotId;

            if (data.slot_id) {
                if (typeof data.slot_id === 'string') {
                    bookingSlotId = data.slot_id.includes('/') ? data.slot_id.split('/').pop() : data.slot_id;
                } else if (data.slot_id.id) {
                    bookingSlotId = data.slot_id.id;
                } else if (data.slot_id.path) {
                    bookingSlotId = data.slot_id.path.split('/').pop();
                }
            }

            if (bookingSlotId && buildingSlotIds.has(bookingSlotId)) {
                const bookingDate = data.booking_time.toDate();
                const dayIndex = bookingDate.getDay() - 1;
                if (dayIndex >= 0 && dayIndex <= 5) {
                    dayCounts[dayIndex]++;
                }
            }
        });

        return Object.values(dayCounts).map(count => Math.round(count));
    } catch (error) {
        console.error('Error fetching booking data:', error);
        return [0, 0, 0, 0, 0, 0];
    }
}

async function renderChart(building, preloadedData = null) {
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) return;

    const weeklyData = preloadedData || await getWeeklyBookingData(building);

    if (window.bookingChart) {
        window.bookingChart.destroy();
    }

    window.bookingChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
            datasets: [{
                label: 'Daily Bookings',
                data: weeklyData,
                backgroundColor: 'rgba(100, 162, 245, 0.8)',
                borderColor: '#4A90E2',
                borderWidth: 1,
                borderRadius: 8,
                maxBarThickness: 35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            layout: { padding: { top: 10, right: 15, bottom: 5, left: 10 } },
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: "Last Week's Daily Bookings",
                    color: '#333',
                    font: { size: 14, weight: '600', family: "'Poppins', sans-serif" },
                    padding: { top: 0, bottom: 20 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: '#666',
                        font: { size: 11, family: "'Poppins', sans-serif" },
                        padding: 8
                    },
                    grid: { color: 'rgba(229, 229, 229, 0.5)', drawBorder: false },
                    border: { display: false }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#666' }
                }
            }
        }
    });

    updateUsageInsights(weeklyData);
}

function updateUsageInsights(weeklyData) {
    try {
        if (!Array.isArray(weeklyData) || weeklyData.length === 0) {
            return;
        }

        const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        let peakIndex = 0, lowIndex = 0;
        let peakValue = weeklyData[0] || 0, lowValue = weeklyData[0] || 0;

        for (let i = 1; i < weeklyData.length; i++) {
            const value = weeklyData[i] || 0;
            if (value > peakValue) {
                peakValue = value;
                peakIndex = i;
            }
            if (value < lowValue) {
                lowValue = value;
                lowIndex = i;
            }
        }

        const sum = weeklyData.reduce((acc, v) => acc + (v || 0), 0);
        const avg = weeklyData.length > 0 ? sum / weeklyData.length : 0;

        const peakEl = document.getElementById('peak-day-value');
        const lowEl = document.getElementById('low-day-value');
        const avgEl = document.getElementById('weekly-avg-value');

        if (peakEl) peakEl.textContent = `${dayLabels[peakIndex]}`;
        if (lowEl) lowEl.textContent = `${dayLabels[lowIndex]}`;
        if (avgEl) avgEl.textContent = `${Math.round(avg)}`;

    } catch (e) {
        console.error('Failed to update usage insights', e);
    }
}


// Update init function to populate levels for default building
async function init() {
    showLoadingOverlay();
    await testFirebaseConnection();

    const buildingList = await populateBuildingDropdown();
    document.getElementById('building-card').innerHTML = `<h3>${buildingList[0] || 'N/A'}</h3>`;

    if (buildingList && buildingList.length > 0) {
        const defaultBuilding = buildingList[0];

        const buildingSelector = document.querySelector('.building-selector');
        if (buildingSelector) {
            buildingSelector.value = defaultBuilding;
        }

        window.selectedBuilding = defaultBuilding;
        localStorage.setItem('selectedBuilding', selectedBuilding);

        await fetchAndUpdateStats(defaultBuilding);

        // Populate level tabs and render slots
        await populateLevelTabs(defaultBuilding);
        renderParkingSlots();

        // Setup real-time stats updates for default building
        setupRealTimeStatsUpdates(defaultBuilding);
    } else {
        await fetchAndUpdateStats();
        await populateLevelTabs();
        renderParkingSlots();
        await populateLevelTabs();
        renderParkingSlots();
        setupRealTimeStatsUpdates();
    }

    updateDateTime();
    setupEventListeners();

    // Initialize dashboard with the selected building
    const buildingSelector = document.querySelector('.building-selector');
    if (buildingSelector && buildingSelector.value) {
        updateDashboardData(buildingSelector.value);
    }

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
    getAvailableLevels: () => availableLevels,
    populateLevels: populateLevelTabs,
    getAvailableLevels: () => availableLevels
};