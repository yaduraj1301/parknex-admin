// Dashboard JavaScript - Functional Approach
import { db, auth, app } from '../../public/js/firebase-config.js';
import { collection, getDocs, query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Global variables

let currentLevel = 1;
let slots = {};
let weeklyData = [45, 48, 15, 46, 42, 58, 60];
let currentBuildingSlots = [];
let availableLevels = [];


// Function to fetch and populate building dropdownf only
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

// Function to populate level tabs based on Firebase data
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
    const statProgressFill = cardElement.querySelector('.stat-progress-fill');
    
    // Calculate percentage
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    
    
    if (statNumber) {
        statNumber.innerHTML = `${count} <span class="stat-total">/ ${total}</span>`;
    }
    
    if (statPercentage) {
        statPercentage.textContent = `${percentage}%`;
    }
    if (statProgressFill) {
        // Use setTimeout to ensure the transition animation works
        setTimeout(() => {
            statProgressFill.style.width = `${percentage}%`;
        }, 50);
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
    const hasUnbookedIssue = stats.unbooked > 0;
    console.log(`Unbooked vehicles count: ${stats.unbooked}`);
    
    // Get alert elements
    const alertInsightsSecondary = document.querySelector('.alert-insights-secondary');
    const alertInsightsMain = document.querySelector('.insights .alert-insights');
    
    // Individual alert cards in main insights only
    const attentionCardMain = document.querySelector('.insights .alert-card.attention');
    const noAlertsCard = document.querySelector('.insights .alert-card.no-alerts');
    
    // Always hide sensor cards and secondary section completely
    const sensorCardMain = document.querySelector('.insights .alert-card.sensor');
    if (sensorCardMain) sensorCardMain.classList.add('hidden');
    
    // ALWAYS hide secondary section since we're not using sensors
    // if (alertInsightsSecondary) {
    //     alertInsightsSecondary.style.display = 'none';
    // }
    
    // Always show main insights
    if (alertInsightsMain) {
        alertInsightsMain.style.display = 'block';
    }
    
    // Case 1: No unbooked vehicles - show congratulations
    if (!hasUnbookedIssue) {
        if (attentionCardMain) attentionCardMain.classList.add('hidden');
        if (noAlertsCard) noAlertsCard.classList.remove('hidden');
    }
    
    // Case 2: Has unbooked vehicles - show attention alert in main section
    else {
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

// Function to setup real-time stats updates

// Update setupRealTimeStatsUpdates to also update slot layout
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
            updateStatsCards();
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
    const statuses = ['available', 'occupied', 'reserved', 'unbooked','named'];
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

    // handleNavigation(navLink) {
    //     // Remove active class from all nav items
    //     document.querySelectorAll('.nav-item').forEach(item => {
    //         item.classList.remove('active');
    //     });

    //     // Add active class to clicked nav item
    //     navLink.closest('.nav-item').classList.add('active');

    //     const section = navLink.dataset.section;
    //     console.log(`Navigating to: ${section}`);

    //     // Here you would typically load different content based on the section
    //     // For now, we'll just show an alert
    //     if (section !== 'bookings') {
    //         alert(`${section.replace('-', ' ').toUpperCase()} section coming soon!`);
    //     }
    // }

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
function updateSlotLayoutForBuilding() {
    // Re-render slots when building changes
    renderParkingSlots();
}
// Handle slot clicks

// Updated handleSlotClick to work with Firebase data
function handleSlotClick(slotElement) {
    const slotId = slotElement.dataset.slot;
    const docId = slotElement.dataset.docId;
    
    // Find the slot in currentBuildingSlots
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


// Handle alert action buttons
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

function highlightUnbookedSlots() {
    const unbookedSlots = document.querySelectorAll('.parking-slot.unbooked');
    
    unbookedSlots.forEach(slot => {
        slot.style.transform = 'scale(1.1)';
        slot.style.boxShadow = '0 0 10px rgba(220, 20, 60, 0.5)';
        
        // Remove highlight after 2 seconds
        setTimeout(() => {
            slot.style.transform = '';
            slot.style.boxShadow = '';
        }, 1000);
    });
}

// Updated handle building selector change with Firebase integration

// Update your handleBuildingChange function to include slot layout update
// Updated handleBuildingChange to populate levels and update layout
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
    fetchAndUpdateStats(building).then(() => {
        // After data is loaded, populate level tabs and render slots
        populateLevelTabs(building).then(() => {
            renderParkingSlots();
        });
    });
    
    // Setup real-time updates for this building
    setupRealTimeStatsUpdates(building);
}

// Render parking slots for current level (kept for backwards compatibility)
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
            if (slot.is_special) {
                addSpecialIcons(iconList, slot);
            }

            // Add car icon
            const carIcon = document.createElement('i');
            carIcon.className = 'slot-icon fas fa-car';
            iconList.appendChild(carIcon);

            slotDiv.appendChild(iconList);

            // Add tooltip with slot details
            addSlotTooltip(slotDiv, slot);

            slotsGrid.appendChild(slotDiv);
        });

        blockDiv.appendChild(slotsGrid);
        parkingGrid.appendChild(blockDiv);
    });

    console.log(`Rendered ${currentLevelSlots.length} slots for Level ${currentLevel}`);
}


// Helper function to map Firebase status to CSS classes
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

function addSlotTooltip(slotElement, slot) {
    let tooltipText = `Slot: ${slot.slot_name}\nStatus: ${slot.status}\nBuilding: ${slot.building}\nFloor: ${slot.floor}`;
    
    if (slot.notes) {
        tooltipText += `\nNotes: ${slot.notes}`;
    }
    
    slotElement.setAttribute('data-tooltip', tooltipText);
    slotElement.classList.add('tooltip');
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
// Update init function to populate levels for default building
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
        
        // Populate level tabs and render slots
        await populateLevelTabs(defaultBuilding);
        renderParkingSlots();
        
        // Setup real-time stats updates for default building
        setupRealTimeStatsUpdates(defaultBuilding);
    } else {
        console.warn('No buildings found, loading all slots');
        // Fallback: load all slots if no buildings found
        await fetchAndUpdateStats();
        await populateLevelTabs();
        renderParkingSlots();
        setupRealTimeStatsUpdates();
    }
    
    // Setup the dashboard
    updateDateTime();
    setupEventListeners();
    renderChart();

    // Start intervals
    setInterval(updateDateTime, 1000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Export functions for external use
// Export updated functions
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
    updateStats: fetchAndUpdateStats,
    getCurrentSlots: () => currentBuildingSlots,
    setupRealTimeStats: setupRealTimeStatsUpdates,
    populateLevels: populateLevelTabs,
    getAvailableLevels: () => availableLevels
};