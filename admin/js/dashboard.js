// Dashboard JavaScript - Functional Approach
import { db, auth, app } from '../../../public/js/firebase-config.js';
import { collection, getDocs, query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Global variables
let currentLevel = 1;
let slots = {};
let weeklyData = [45, 48, 15, 46, 42, 58, 60];
let currentBuildingSlots = [];

// Function to fetch and populate building dropdown only
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
        const buildingSelector = document.querySelector('.building-selector');
        
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

// Function to fetch slots for selected building and update stats
async function fetchAndUpdateStats(selectedBuilding = null) {
    try {
        console.log('Fetching slots for stats update...');
        
        const parkingSlotsRef = collection(db, 'ParkingSlots');
        
        // If building is selected, filter by building
        let q;
        if (selectedBuilding) {
            q = query(parkingSlotsRef, 
                where('building', '==', selectedBuilding)
            );
        } else {
            q = query(parkingSlotsRef);
        }
        
        const snapshot = await getDocs(q);
        
        // Store slots data
        currentBuildingSlots = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            currentBuildingSlots.push({
                ...data,
                docId: doc.id
            });
        });
        
        console.log(`Loaded ${currentBuildingSlots.length} slots for stats`);
        
        // Update the stats cards
        updateStatsCards();
        
    } catch (error) {
        console.error('Error fetching slots for stats:', error);
    }
}

// Function to update stats cards with real data
function updateStatsCards() {
    if (currentBuildingSlots.length === 0) {
        console.log('No slots data available for stats');
        return;
    }
    // Console log all slot details
    console.log('=== ALL SLOTS IN CURRENT BUILDING ===');
    console.log(`Total slots found: ${currentBuildingSlots.length}`);
    console.log('Detailed slot information:');
    
    currentBuildingSlots.forEach((slot, index) => {
        console.log(`Slot ${index + 1}:`, {
            slot_name: slot.slot_name,
            status: slot.status,
            building: slot.building,
            floor: slot.floor,
            block: slot.block,
            is_special: slot.is_special,
            notes: slot.notes,
            docId: slot.docId
        });
    });
    
    // Group by status for summary
    const statusGroups = currentBuildingSlots.reduce((groups, slot) => {
        const status = slot.status || 'undefined';
        if (!groups[status]) {
            groups[status] = [];
        }
        groups[status].push(slot.slot_name);
        return groups;
    }, {});
    
    console.log('=== SLOTS GROUPED BY STATUS ===');
    Object.keys(statusGroups).forEach(status => {
        console.log(`${status.toUpperCase()}: [${statusGroups[status].join(', ')}] (${statusGroups[status].length} slots)`);
    });
    // Calculate stats from current slots
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
    
    console.log('Calculated stats:', stats);
    
    // Get all stat cards
    const statCards = document.querySelectorAll('.stat-card');
    
    if (statCards.length >= 5) {
        // Update Total Slots (first card)
        const totalCard = statCards[0];
        const totalNumber = totalCard.querySelector('.stat-number');
        if (totalNumber) {
            totalNumber.textContent = stats.total;
        }
        
        // Update Available (second card)
        const availableCard = statCards[1];
        updateStatCard(availableCard, stats.available, stats.total, 'available');
        
        // Update Occupied (third card)
        const occupiedCard = statCards[2];
        updateStatCard(occupiedCard, stats.occupied, stats.total, 'occupied');
        
        // Update Reserved (fourth card)
        const reservedCard = statCards[3];
        updateStatCard(reservedCard, stats.reserved, stats.total, 'reserved');
        
        // Update Named (fifth card)
        const namedCard = statCards[4];
        updateStatCard(namedCard, stats.named, stats.total, 'named');
    }
    
    // Update alert counts
    updateAlertCounts(stats);
}

// Helper function to update individual stat card
function updateStatCard(cardElement, count, total, type) {
    if (!cardElement) return;
    
    const statNumber = cardElement.querySelector('.stat-number');
    const statPercentage = cardElement.querySelector('.stat-percentage');
    
    if (statNumber) {
        statNumber.innerHTML = `${count} <span class="stat-total">/ ${total}</span>`;
    }
    
    if (statPercentage) {
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        statPercentage.textContent = `${percentage}%`;
    }
    
    // Hide trend indicators since we don't have historical data yet
    const statChange = cardElement.querySelector('.stat-change');
    if (statChange) {
        statChange.style.display = 'none';
    }
}

// Function to update alert counts
// Function to manage alert visibility based on real unbooked data
function updateAlertCounts(stats) {
    // Check if we have unbooked vehicles
    const hasUnbookedIssue = stats.unbooked > 0;
    console.log(`Unbooked vehicles count: ${stats.unbooked}`);
    
    // Get all alert elements
    const alertInsightsSecondary = document.querySelector('.alert-insights-secondary');
    const alertInsightsMain = document.querySelector('.alert-insights');
    
    // Individual alert cards in main insights
    const attentionCardMain = document.querySelector('.alert-insights .alert-card.attention');
    const noAlertsCard = document.querySelector('.alert-insights .alert-card.no-alerts');
    
    // Individual alert cards in secondary
    const attentionCardSecondary = document.querySelector('.alert-insights-secondary .alert-card.attention');
    
    // Always hide sensor alerts since we're not implementing them
    const sensorCardMain = document.querySelector('.alert-insights .alert-card.sensor');
    const sensorCardSecondary = document.querySelector('.alert-insights-secondary .alert-card.sensor');
    
    if (sensorCardMain) sensorCardMain.classList.add('hidden');
    if (sensorCardSecondary) sensorCardSecondary.style.display = 'none';
    
    // Case 1: No unbooked vehicles - show congratulations
    if (!hasUnbookedIssue) {
        // Hide secondary section
        if (alertInsightsSecondary) {
            alertInsightsSecondary.style.display = 'none';
        }
        
        // Show main insights
        if (alertInsightsMain) {
            alertInsightsMain.style.display = 'block';
        }
        
        // Hide attention card in main
        if (attentionCardMain) {
            attentionCardMain.classList.add('hidden');
        }
        
        // Show no-alerts card
        if (noAlertsCard) {
            noAlertsCard.classList.remove('hidden');
        }
    }
    
    // Case 2: Has unbooked vehicles - show attention alert
    else {
        // You can customize this threshold based on your needs
        const useSecondarySection = stats.unbooked > 10;
        
        if (useSecondarySection) {
            // High count - use secondary section for emphasis
            if (alertInsightsMain) {
                alertInsightsMain.style.display = 'none';
            }
            
            if (alertInsightsSecondary) {
                alertInsightsSecondary.style.display = 'block';
            }
            
            if (attentionCardSecondary) {
                const alertText = attentionCardSecondary.querySelector('p');
                if (alertText) {
                    alertText.textContent = `${stats.unbooked} vehicles are parked without booking.`;
                }
            }
        } else {
            // Normal count - use main section
            if (alertInsightsSecondary) {
                alertInsightsSecondary.style.display = 'none';
            }
            
            if (alertInsightsMain) {
                alertInsightsMain.style.display = 'block';
            }
            
            if (noAlertsCard) {
                noAlertsCard.classList.add('hidden');
            }
            
            if (attentionCardMain) {
                attentionCardMain.classList.remove('hidden');
                const alertText = attentionCardMain.querySelector('p');
                if (alertText) {
                    alertText.textContent = `${stats.unbooked} vehicles are parked without booking.`;
                }
            }
        }
    }
}

// Function to setup real-time stats updates
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
            console.log('Real-time update received for stats');
            
            currentBuildingSlots = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                currentBuildingSlots.push({
                    ...data,
                    docId: doc.id
                });
            });
            
            updateStatsCards();
        });
        
        // Store unsubscribe function globally so we can clean up later
        window.statsUnsubscribe = unsubscribe;
        
    } catch (error) {
        console.error('Error setting up real-time stats updates:', error);
    }
}

// Test Firebase connection
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

// Generate sample slots for testing (kept as fallback)
function generateSampleSlots() {
    const sampleSlots = {};
    const statuses = ['available', 'occupied', 'reserved', 'unbooked'];
    const blocks = ['A', 'B', 'C'];

    blocks.forEach(block => {
        // Create 12 slots per block for each level (1, 2, 3)
        for (let level = 1; level <= 3; level++) {
            for (let i = 1; i <= 12; i++) {
                const slotId = `${block}${i.toString().padStart(2, '0')}`;
                const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
                sampleSlots[`${slotId}_L${level}`] = {
                    id: slotId,
                    status: randomStatus,
                    level: level,
                    block: block,
                    vehicle: randomStatus !== 'available' ? generateVehicleInfo() : null
                };
            }
        }
    });
    
    console.log('Sample slots generated:', Object.keys(sampleSlots).length);
    return sampleSlots;
}

// Generate random vehicle info
function generateVehicleInfo() {
    const vehicles = [
        { plate: 'KL-01-AB-1234', owner: 'John Doe' },
        { plate: 'KL-02-CD-5678', owner: 'Jane Smith' },
        { plate: 'KL-03-EF-9012', owner: 'Mike Johnson' },
        { plate: 'KL-04-GH-3456', owner: 'Sarah Wilson' }
    ];
    return vehicles[Math.floor(Math.random() * vehicles.length)];
}

// Update date and time display
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

// Setup all event listeners
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

    // Alert action buttons
    document.querySelectorAll('.alert-action').forEach(button => {
        button.addEventListener('click', (e) => {
            handleAlertAction(e.target);
        });
    });

    // Building selector - Updated to use new handler
    const buildingSelector = document.querySelector('.building-selector');
    if (buildingSelector) {
        buildingSelector.addEventListener('change', (e) => {
            handleBuildingChange(e.target.value);
        });
    }
}

    handleNavigation(navLink) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to clicked nav item
        navLink.closest('.nav-item').classList.add('active');

        const section = navLink.dataset.section;
        console.log(`Navigating to: ${section}`);

        // Here you would typically load different content based on the section
        // For now, we'll just show an alert
        if (section !== 'bookings') {
            alert(`${section.replace('-', ' ').toUpperCase()} section coming soon!`);
        }
    }

// Switch between parking levels
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

// Handle slot clicks
function handleSlotClick(slotElement) {
    const slotId = slotElement.dataset.slot;
    const slotKey = `${slotId}_L${currentLevel}`;
    const slot = slots[slotKey];

    if (!slot) return;

    let message = `Slot: ${slotId}\nStatus: ${slot.status.toUpperCase()}\nLevel: ${slot.level}`;

    if (slot.vehicle) {
        message += `\nVehicle: ${slot.vehicle.plate}\nOwner: ${slot.vehicle.owner}`;
    }

    alert(message);
}

// Handle alert action buttons
function handleAlertAction(button) {
    const alertType = button.closest('.alert-card').classList.contains('attention') ? 'attention' : 'sensor';

    if (alertType === 'attention') {
        alert('Redirecting to unbooked vehicles management...');
    } else {
        alert('Redirecting to sensor diagnostics...');
    }
}

// Updated handle building selector change with Firebase integration
function handleBuildingChange(building) {
    if (!building) return;
    
    console.log(`Building selected for stats: ${building}`);
    
    // Store selected building globally
    window.selectedBuilding = building;
    
    // Clean up previous listener
    if (window.statsUnsubscribe) {
        window.statsUnsubscribe();
    }
    
    // Fetch and update stats for selected building
    fetchAndUpdateStats(building);
    
    // Setup real-time updates for this building
    setupRealTimeStatsUpdates(building);
}

// Render parking slots for current level (kept for backwards compatibility)
function renderParkingSlots() {
    const blocks = ['A', 'B', 'C'];
    const parkingGrid = document.getElementById('parking-grid');

    if (!parkingGrid) return;

    // Clear existing content
    parkingGrid.innerHTML = '';

    blocks.forEach(blockName => {
        const blockDiv = document.createElement('div');
        blockDiv.className = 'parking-block';

        const blockHeader = document.createElement('h4');
        blockHeader.textContent = `${blockName}-Block`;
        blockDiv.appendChild(blockHeader);

        const slotsGrid = document.createElement('div');
        slotsGrid.className = 'slots-grid';

        // Get slots for this block and current level
        const blockSlots = Object.values(slots).filter(slot =>
            slot.block === blockName && slot.level === currentLevel
        );

        blockSlots.forEach(slot => {
            const slotDiv = document.createElement('div');
            slotDiv.className = `parking-slot ${slot.status}`;
            slotDiv.dataset.slot = slot.id;

            if (slot.vehicle) {
                slotDiv.setAttribute('data-tooltip', `${slot.vehicle.plate} - ${slot.vehicle.owner}`);
                slotDiv.classList.add('tooltip');
            }

            slotDiv.innerHTML = `
                <span class="slot-id">${slot.id}</span>
                <i class="slot-icon fas fa-car"></i>
            `;

            slotsGrid.appendChild(slotDiv);
        });

        blockDiv.appendChild(slotsGrid);
        parkingGrid.appendChild(blockDiv);
    });

    // Note: Stats are now updated via updateStatsCards() function
}

// Render weekly usage chart
function renderChart() {
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const data = weeklyData;
    const labels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 240;

    const padding = 30;
    const chartWidth = canvas.width - (padding * 2);
    const chartHeight = canvas.height - (padding * 2);
    const maxValue = Math.max(...data);
    const barWidth = chartWidth / data.length;

    // Draw bars
    data.forEach((value, index) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + (index * barWidth) + (barWidth * 0.2);
        const y = canvas.height - padding - barHeight;
        const width = barWidth * 0.6;

        // Draw bar
        ctx.fillStyle = '#64A2F5';
        ctx.fillRect(x, y, width, barHeight);

        // Draw label
        ctx.fillStyle = '#666';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(labels[index], x + width / 2, canvas.height - 8);

        // Draw value
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.fillText(value.toString(), x + width / 2, y - 4);
    });

    // Draw Y-axis labels
    ctx.fillStyle = '#666';
    ctx.font = '9px Arial';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const value = Math.round((maxValue / 4) * i);
        const y = canvas.height - padding - (chartHeight / 4) * i;
        ctx.fillText(value.toString(), padding - 8, y + 2);
    }
}

// Simulate real-time slot updates (kept as fallback for sample data)
function simulateRealTimeUpdates() {
    const slotIds = Object.keys(slots);
    const statuses = ['available', 'occupied', 'reserved'];

    // Update 2-3 random slots
    for (let i = 0; i < Math.floor(Math.random() * 2) + 2; i++) {
        const randomSlotId = slotIds[Math.floor(Math.random() * slotIds.length)];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        if (slots[randomSlotId]) {
            slots[randomSlotId].status = randomStatus;

            if (randomStatus !== 'available') {
                slots[randomSlotId].vehicle = generateVehicleInfo();
            } else {
                slots[randomSlotId].vehicle = null;
            }
        }
    }

    // Re-render the current level
    renderParkingSlots();
    console.log('Real-time update completed');
}

// Updated main initialization function
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
        if (buildingSelector) {
            buildingSelector.value = defaultBuilding;
        }
        
        // Store as selected building
        window.selectedBuilding = defaultBuilding;
        
        // Fetch stats for default building
        await fetchAndUpdateStats(defaultBuilding);
        
        // Setup real-time stats updates for default building
        setupRealTimeStatsUpdates(defaultBuilding);
    } else {
        console.warn('No buildings found, loading all slots');
        // Fallback: load all slots if no buildings found
        await fetchAndUpdateStats();
        setupRealTimeStatsUpdates();
    }
    
    // Generate sample data as fallback for parking grid
    slots = generateSampleSlots();
    
    // Setup the dashboard
    updateDateTime();
    setupEventListeners();
    renderChart();
    renderParkingSlots();

    // Start intervals
    setInterval(updateDateTime, 1000);
    // Keep simulation for parking grid until we integrate that with Firebase too
    setInterval(simulateRealTimeUpdates, 30000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Export functions for external use
window.ParkingAPI = {
    updateSlot: (slotId, status, vehicleInfo) => {
        const slotKey = `${slotId}_L${currentLevel}`;
        if (slots[slotKey]) {
            slots[slotKey].status = status;
            slots[slotKey].vehicle = vehicleInfo;
            renderParkingSlots();
        }
    },
    
    getSlot: (slotId) => {
        const slotKey = `${slotId}_L${currentLevel}`;
        return slots[slotKey] || null;
    },
    
    getAllSlots: () => slots,
    
    refresh: () => simulateRealTimeUpdates(),
    
    // New Firebase-based functions
    updateStats: fetchAndUpdateStats,
    getCurrentSlots: () => currentBuildingSlots,
    setupRealTimeStats: setupRealTimeStatsUpdates
};