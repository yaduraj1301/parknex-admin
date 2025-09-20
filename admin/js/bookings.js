import { db } from "../../public/js/firebase-config.js";
import { collection, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const bookSlotButton = document.querySelector('.btn-primary');

    bookSlotButton.addEventListener('click', () => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '1000';

        // Create card
        const card = document.createElement('div');
        card.style.width = '400px';
        card.style.backgroundColor = '#fff';
        card.style.borderRadius = '8px';
        card.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        card.style.padding = '20px';
        card.style.position = 'relative';

        // Add heading
        const heading = document.createElement('h3');
        heading.textContent = 'Book Parking Slot';
        heading.style.marginBottom = '20px';
        card.appendChild(heading);

        // Add form fields
        const fields = [
            { label: 'Vehicle Number', type: 'text' },
            { label: 'Employee Name', type: 'text' },
            { label: 'Slot Number', type: 'text', button: 'Select Slot' },
            { label: 'Contact Number', type: 'text' },
            { label: 'Booking Date', type: 'date' }
        ];

        fields.forEach(field => {
            const fieldContainer = document.createElement('div');
            fieldContainer.style.marginBottom = '15px';

            const label = document.createElement('label');
            label.textContent = field.label;
            label.style.display = 'block';
            label.style.marginBottom = '5px';

            const input = document.createElement('input');
            input.type = field.type;
            input.style.width = '100%';
            input.style.padding = '8px';
            input.style.border = '1px solid #ccc';
            input.style.borderRadius = '4px';

            fieldContainer.appendChild(label);
            fieldContainer.appendChild(input);

            if (field.button) {
                const button = document.createElement('button');
                button.textContent = field.button;
                button.style.marginLeft = '0px';
                button.style.marginTop = '10px';
                button.style.padding = '8px';
                button.style.border = 'none';
                button.style.backgroundColor = '#007bff';
                button.style.color = '#fff';
                button.style.borderRadius = '4px';
                button.style.cursor = 'pointer';

                fieldContainer.appendChild(button);
            }

            card.appendChild(fieldContainer);
        });

        // Add buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.marginTop = '20px';

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.marginRight = '10px';
        cancelButton.style.padding = '10px 20px';
        cancelButton.style.border = 'none';
        cancelButton.style.backgroundColor = '#6c757d';
        cancelButton.style.color = '#fff';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.cursor = 'pointer';

        const bookButton = document.createElement('button');
        bookButton.textContent = 'Book Slot';
        bookButton.style.padding = '10px 20px';
        bookButton.style.border = 'none';
        bookButton.style.backgroundColor = '#007bff';
        bookButton.style.color = '#fff';
        bookButton.style.borderRadius = '4px';
        bookButton.style.cursor = 'pointer';

        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(bookButton);
        card.appendChild(buttonContainer);

        // Append card to overlay
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        // Close overlay on cancel
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });

        // Close overlay on book
        bookButton.addEventListener('click', () => {
            alert('Slot booked successfully!');
            document.body.removeChild(overlay);
        });

        // Add event listener for 'Select Slot' buttons
        document.querySelectorAll('button').forEach(button => {
            if (button.textContent === 'Select Slot') {
                button.addEventListener('click', () => {
                    // Create slot selection overlay
                    const slotOverlay = document.createElement('div');
                    slotOverlay.style.position = 'fixed';
                    slotOverlay.style.top = '0';
                    slotOverlay.style.left = '0';
                    slotOverlay.style.width = '100%';
                    slotOverlay.style.height = '100%';
                    slotOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                    slotOverlay.style.display = 'flex';
                    slotOverlay.style.justifyContent = 'center';
                    slotOverlay.style.alignItems = 'center';
                    slotOverlay.style.zIndex = '1000';

                    // Create parking overview container
                    const parkingOverview = document.createElement('div');
                    parkingOverview.classList.add('parking-overview');

                    // Add parking header
                    const parkingHeader = document.createElement('div');
                    parkingHeader.classList.add('parking-header');
                    parkingHeader.innerHTML = '<h3>Select a Parking Slot</h3>';
                    parkingOverview.appendChild(parkingHeader);

                    // Add legend
                    const legend = document.createElement('div');
                    legend.classList.add('parking-legend');
                    legend.innerHTML = `
                        <div class="legend-item">
                            <span class="legend-color available"></span> Free
                        </div>
                        <div class="legend-item">
                            <span class="legend-color occupied"></span> Named
                        </div>
                        <div class="legend-item">
                            <span class="legend-color reserved"></span> Reserved
                        </div>
                        <div class="legend-item">
                            <span class="legend-color unbooked"></span> Unbooked
                        </div>
                    `;
                    parkingOverview.appendChild(legend);

                    // Add level tabs (will be populated dynamically)
                    const levelTabs = document.createElement('div');
                    levelTabs.classList.add('level-tabs');
                    parkingOverview.appendChild(levelTabs);

                    // Add building dropdown
                    const buildingDropdownContainer = document.createElement('div');
                    buildingDropdownContainer.style.marginBottom = '15px';

                    const buildingLabel = document.createElement('label');
                    buildingLabel.textContent = 'Select Building';
                    buildingLabel.style.display = 'block';
                    buildingLabel.style.marginBottom = '5px';

                    const buildingDropdown = document.createElement('select');
                    buildingDropdown.style.width = '100%';
                    buildingDropdown.style.padding = '8px';
                    buildingDropdown.style.border = '1px solid #ccc';
                    buildingDropdown.style.borderRadius = '4px';

                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = 'Select a building';
                    buildingDropdown.appendChild(defaultOption);

                    buildingDropdownContainer.appendChild(buildingLabel);
                    buildingDropdownContainer.appendChild(buildingDropdown);
                    parkingOverview.insertBefore(buildingDropdownContainer, levelTabs);

                    // Add parking grid
                    const parkingGrid = document.createElement('div');
                    parkingGrid.classList.add('parking-grid');
                    parkingOverview.appendChild(parkingGrid);

                    // Initially hide parking grid and level tabs
                    levelTabs.style.display = 'none';
                    parkingGrid.style.display = 'none';

                    // Store all slots data
                    let allSlotsData = [];
                    let availableFloors = [];

                    // Function to populate floor tabs dynamically
                    const populateFloorTabs = (floors) => {
                        console.log('Populating floor tabs with:', floors);
                        levelTabs.innerHTML = '';
                        
                        if (floors.length === 0) {
                            levelTabs.innerHTML = '<div style="text-align: center; padding: 10px;">No floors available</div>';
                            return;
                        }
                        
                        floors.forEach((floor, index) => {
                            const tab = document.createElement('button');
                            tab.classList.add('level-tab');
                            if (index === 0) tab.classList.add('active');
                            tab.dataset.level = floor;
                            tab.textContent = floor;
                            tab.addEventListener('click', () => {
                                document.querySelectorAll('.level-tab').forEach(t => t.classList.remove('active'));
                                tab.classList.add('active');
                                renderParkingGrid(floor);
                            });
                            levelTabs.appendChild(tab);
                        });
                    };

                    // Function to render parking grid for a level
                    const renderParkingGrid = (floor, slots = allSlotsData) => {
                        try {
                            console.log(`Rendering parking grid for floor: ${floor}`);
                            parkingGrid.innerHTML = '';
                            
                            // Filter slots by floor
                            const floorSlots = slots.filter(slot => slot.floor === floor);
                            console.log(`Slots for floor ${floor}:`, floorSlots);
                            
                            if (floorSlots.length === 0) {
                                parkingGrid.innerHTML = '<div style="text-align: center; padding: 20px;">No slots available for this floor</div>';
                                return;
                            }

                            // Group slots by block
                            const slotsByBlock = floorSlots.reduce((blocks, slot) => {
                                const block = slot.block || 'Default';
                                if (!blocks[block]) blocks[block] = [];
                                blocks[block].push(slot);
                                return blocks;
                            }, {});

                            // Create blocks
                            Object.keys(slotsByBlock).forEach(blockName => {
                                const blockDiv = document.createElement('div');
                                blockDiv.classList.add('parking-block');
                                
                                const blockTitle = document.createElement('h4');
                                blockTitle.textContent = `Block ${blockName}`;
                                blockDiv.appendChild(blockTitle);

                                const slotsGrid = document.createElement('div');
                                slotsGrid.classList.add('slots-grid');

                                slotsByBlock[blockName].forEach(slot => {
                                    const slotElement = document.createElement('div');
                                    slotElement.classList.add('parking-slot');
                                    slotElement.textContent = slot.slot_name || slot.slotNumber || slot.id;
                                    
                                    // Apply status-based styling
                                    if (slot.status === 'available') {
                                        slotElement.classList.add('available');
                                    } else if (slot.status === 'occupied') {
                                        slotElement.classList.add('occupied');
                                    } else if (slot.status === 'reserved') {
                                        slotElement.classList.add('reserved');
                                    } else {
                                        slotElement.classList.add('unbooked');
                                    }

                                    // Add click event for slot selection
                                    slotElement.addEventListener('click', () => {
                                        if (slot.status === 'available' || slot.status === 'unbooked') {
                                            // Select the slot
                                            console.log('Slot selected:', slot);
                                            // You can add logic here to handle slot selection
                                            // For now, we'll just close the overlay
                                            document.body.removeChild(slotOverlay);
                                        }
                                    });

                                    slotsGrid.appendChild(slotElement);
                                });

                                blockDiv.appendChild(slotsGrid);
                                parkingGrid.appendChild(blockDiv);
                            });
                        } catch (error) {
                            console.error('Error rendering parking grid:', error);
                        }
                    };

                    // Function to fetch buildings and populate dropdown
                    const fetchBuildings = async () => {
                        try {
                            console.log('Fetching buildings from database...');
                            
                            // First, let's try to fetch from 'Buildings' collection
                            let buildingsSnapshot;
                            try {
                                buildingsSnapshot = await getDocs(collection(db, 'Buildings'));
                                console.log('Buildings collection exists, documents found:', buildingsSnapshot.size);
                            } catch (error) {
                                console.log('Buildings collection not found, trying ParkingSlots...');
                                // If Buildings collection doesn't exist, get unique buildings from ParkingSlots
                                const slotsSnapshot = await getDocs(collection(db, 'ParkingSlots'));
                                const buildingsSet = new Set();
                                
                                slotsSnapshot.forEach((doc) => {
                                    const slotData = doc.data();
                                    if (slotData.building) {
                                        buildingsSet.add(slotData.building);
                                    }
                                });
                                
                                const buildings = Array.from(buildingsSet).sort();
                                console.log('Buildings found from ParkingSlots:', buildings);
                                
                                buildings.forEach((building) => {
                                    const option = document.createElement('option');
                                    option.value = building;
                                    option.textContent = building;
                                    buildingDropdown.appendChild(option);
                                });
                                return;
                            }

                            const buildings = [];
                            if (buildingsSnapshot.size === 0) {
                                console.log('No buildings found in Buildings collection, trying ParkingSlots...');
                                // Fallback: get buildings from ParkingSlots collection
                                const slotsSnapshot = await getDocs(collection(db, 'ParkingSlots'));
                                const buildingsSet = new Set();
                                
                                slotsSnapshot.forEach((doc) => {
                                    const slotData = doc.data();
                                    if (slotData.building) {
                                        buildingsSet.add(slotData.building);
                                    }
                                });
                                
                                const uniqueBuildings = Array.from(buildingsSet).sort();
                                console.log('Buildings found from ParkingSlots:', uniqueBuildings);
                                
                                uniqueBuildings.forEach((building) => {
                                    const option = document.createElement('option');
                                    option.value = building;
                                    option.textContent = building;
                                    buildingDropdown.appendChild(option);
                                });
                            } else {
                                buildingsSnapshot.forEach((doc) => {
                                    const buildingData = doc.data();
                                    console.log('Building document:', buildingData);
                                    if (buildingData.name) {
                                        buildings.push(buildingData.name);
                                    } else if (buildingData.buildingName) {
                                        buildings.push(buildingData.buildingName);
                                    } else {
                                        // Use document ID as building name if no name field
                                        buildings.push(doc.id);
                                    }
                                });

                                buildings.sort();
                                console.log('Buildings from Buildings collection:', buildings);
                                buildings.forEach((building) => {
                                    const option = document.createElement('option');
                                    option.value = building;
                                    option.textContent = building;
                                    buildingDropdown.appendChild(option);
                                });
                            }
                        } catch (error) {
                            console.error('Error fetching buildings:', error);
                        }
                    };

                    // Fetch buildings on overlay creation
                    console.log('Starting to fetch buildings...');
                    fetchBuildings();

                    // Event listener for building selection
                    buildingDropdown.addEventListener('change', async () => {
                        const selectedBuilding = buildingDropdown.value;

                        if (selectedBuilding) {
                            console.log(`Building selected: ${selectedBuilding}`);
                            levelTabs.style.display = 'flex';
                            parkingGrid.style.display = 'flex';

                            // Fetch slots and floors for the selected building
                            await fetchSlotsAndFloors(selectedBuilding);
                            if (availableFloors.length > 0) {
                                populateFloorTabs(availableFloors);
                                renderParkingGrid(availableFloors[0]);
                            }
                        } else {
                            levelTabs.style.display = 'none';
                            parkingGrid.style.display = 'none';
                        }
                    });

                    // Function to fetch slots and floors for a specific building
                    const fetchSlotsAndFloors = async (building) => {
                        try {
                            console.log(`Fetching slots for building: ${building}`);
                            const slotsSnapshot = await getDocs(collection(db, 'ParkingSlots'));
                            allSlotsData = [];
                            const floorsSet = new Set();

                            slotsSnapshot.forEach((doc) => {
                                const slotData = { id: doc.id, ...doc.data() };

                                if (slotData.building === building) {
                                    allSlotsData.push(slotData);
                                    if (slotData.floor) {
                                        floorsSet.add(slotData.floor);
                                    }
                                }
                            });

                            availableFloors = Array.from(floorsSet).sort();
                            console.log('Available floors:', availableFloors);
                            console.log('Total slots found:', allSlotsData.length);
                        } catch (error) {
                            console.error('Error fetching parking slots:', error);
                        }
                    };

                    // Append slot overlay to body
                    slotOverlay.appendChild(parkingOverview);
                    document.body.appendChild(slotOverlay);

                    // Close overlay when clicking outside
                    slotOverlay.addEventListener('click', (e) => {
                        if (e.target === slotOverlay) {
                            document.body.removeChild(slotOverlay);
                        }
                    });
                });
            }
        });
    });
});