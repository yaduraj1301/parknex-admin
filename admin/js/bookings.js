import { db } from "../../public/js/firebase-config.js";
import { collection, getDocs, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // Function to fetch and display bookings data
    const fetchAndDisplayBookings = async () => {
        try {
            let counter = 0;
            console.log('Fetching bookings data...');
            const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
            const bookingsTableBody = document.querySelector('.table tbody');

            if (!bookingsTableBody) {
                console.error('Bookings table body not found');
                return;
            }

            // Clear existing rows
            bookingsTableBody.innerHTML = '';

            if (bookingsSnapshot.empty) {
                console.log('No bookings found');
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = '<td colspan="7" style="text-align: center; padding: 20px;">No bookings found</td>';
                bookingsTableBody.appendChild(emptyRow);
                return;
            }

            console.log(`Found ${bookingsSnapshot.size} bookings`);

            // Process each booking
            for (const bookingDoc of bookingsSnapshot.docs) {
                const bookingData = bookingDoc.data();
                // console.log('Processing booking:', bookingData);

                // Fetch related data
                const relatedData = await fetchRelatedBookingData(bookingData);

                // Create table row
                const row = document.createElement('tr');

                // Format date
                const bookingDate = bookingData.booking_time ? new Date(bookingData.booking_time.seconds * 1000).toLocaleDateString() : 'N/A';

                // Resolve vehicle snap -> data safely (supports id string, full path string, or DocumentReference)
                // let vehicleSnap;
                // const vehicleRefOrId = bookingData.vehicle_id;

                // if (!vehicleRefOrId) {
                //     vehicleSnap = null;
                // } else if (typeof vehicleRefOrId === 'object' && vehicleRefOrId.id) {
                //     // DocumentReference
                //     vehicleSnap = await getDoc(vehicleRefOrId);
                // } else if (typeof vehicleRefOrId === 'string' && vehicleRefOrId.includes('/')) {
                //     // Full path like 'Vehicles/abc123'
                //     vehicleSnap = await getDoc(doc(db, vehicleRefOrId));
                // } else if (typeof vehicleRefOrId === 'string') {
                //     // Plain ID; adjust collection name if yours is different (Vehicles vs vehicles)
                //     vehicleSnap = await getDoc(doc(db, 'Vehicles', vehicleRefOrId));
                // }
                // const vehicle = vehicleSnap && vehicleSnap.exists() ? vehicleSnap.data() : null;

                // Use vehicle fields when rendering <td>${bookingData.booking_id || bookingDoc.id}</td>
                row.innerHTML = `
                    <td>BK#${counter}</td>
                    <td>${(relatedData.vehicleNumber || 'N/A')}</td>
                    <td>${relatedData.employeeName || 'N/A'}</td>
                    <td>${relatedData.slotName || 'N/A'}</td>
                    <td><span class="status-${bookingData.status || 'unknown'}">${bookingData.status || 'Unknown'}</span></td>
                    <td>${bookingDate}</td>
                    <td><button class="btn-action">View</button></td>
                `;
                counter++;
                bookingsTableBody.appendChild(row);
            }

            console.log('Bookings table populated successfully');

        } catch (error) {
            console.error('Error fetching bookings:', error);
            const bookingsTableBody = document.querySelector('.table tbody');
            if (bookingsTableBody) {
                bookingsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error loading bookings data</td></tr>';
            }
        }
    };

    // Function to fetch related data for a booking
    const fetchRelatedBookingData = async (bookingData) => {
        // console.log('Fetching related data for booking:', bookingData.vehicle_id);
        let parts = bookingData.vehicle_id.split('/');
        const employeePath = parts.slice(0, 2).join('/')
        const employeeSnap = await getDoc(doc(db, employeePath));
        const employeeData = employeeSnap && employeeSnap.exists() ? employeeSnap.data() : null;
        const slotSnap = await getDoc(bookingData.slot_id);
        const relatedData = {
            vehicleNumber: 'N/A',
            employeeName: employeeData ? employeeData.full_name : 'N/A',
            slotName: slotSnap && slotSnap.exists() ? slotSnap.data().slot_name : 'N/A'
        };

        try {
            // Fetch vehicle data if vehicleId exists
            if (bookingData.vehicle_id) {
                try {
                    const vehicleDoc = await getDoc(doc(db, bookingData.vehicle_id));
                    if (vehicleDoc.exists()) {
                        const vehicleData = vehicleDoc.data();
                        console.log(vehicleData);
                        relatedData.vehicleNumber = vehicleData.registration_no || vehicleData.vehicleNumber || vehicleData.number || vehicleData.plateNumber || 'N/A';
                    }
                } catch (error) {
                    console.warn('Error fetching vehicle data:', error);
                }
            }

            // Fetch employee data if employeeId exists
            if (bookingData.employeeId) {
                try {
                    const employeeDoc = await getDoc(doc(db, 'Employees', bookingData.employeeId));
                    if (employeeDoc.exists()) {
                        const employeeData = employeeDoc.data();
                        relatedData.employeeName = employeeData.name || employeeData.fullName || `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim() || 'N/A';
                    }
                } catch (error) {
                    console.warn('Error fetching employee data:', error);
                }
            }

            // Fetch slot data if slotId exists
            if (bookingData.slot_id) {
                try {
                    const slotDoc = await getDoc(bookingData.slot_id);
                    if (slotDoc.exists()) {
                        const slotData = slotDoc.data();
                        relatedData.slotName = slotData.slot_name || slotData.slotNumber || slotDoc.id;
                    }
                } catch (error) {
                    console.warn('Error fetching slot data:', error);
                }
            }

        } catch (error) {
            console.error('Error fetching related booking data:', error);
        }

        return relatedData;
    };

    // Load bookings data when page loads
    fetchAndDisplayBookings();
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
                                    slotElement.textContent = slot.slot_name;
                                    console.log("Slot id:", slot.slot_name, "\nSlot status:", slot.status);

                                    // Apply status-based styling based on database status
                                    if (slot.status === 'Free') {
                                        console.log('Slot available:', slot);
                                        slotElement.classList.add('available');
                                    } else if (slot.status === 'Booked') {
                                        slotElement.classList.add('occupied');
                                    } else if (slot.status === 'Reserved') {
                                        slotElement.classList.add('reserved');
                                    } else {
                                        slotElement.classList.add('unbooked');
                                    }

                                    // Add click event for slot selection
                                    slotElement.addEventListener('click', () => {
                                        if (slot.status === 'Free') {
                                            // Find the slot number input field in the booking form
                                            const allInputs = document.querySelectorAll('input[type="text"]');

                                            // The slot number input should be the 3rd input (index 2)
                                            // Order: Vehicle Number (0), Employee Name (1), Slot Number (2), Contact Number (3)
                                            if (allInputs.length >= 3) {
                                                allInputs[2].value = slot.slot_name || slot.slotNumber || slot.id;
                                            }

                                            console.log('Slot selected:', slot);
                                            // Close the slot selection overlay
                                            document.body.removeChild(slotOverlay);
                                        } else {
                                            // Show message for unavailable slots
                                            alert('This slot is not available for booking.');
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