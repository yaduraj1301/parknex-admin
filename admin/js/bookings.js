import { db } from "../../public/js/firebase-config.js";
import { 
    collection, 
    getDocs, 
    onSnapshot, 
    doc, 
    getDoc, 
    collectionGroup, 
    query, 
    where, 
    addDoc, 
    updateDoc, 
    Timestamp 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {

    // Initialize table filters
    function initTableFilters() {
        const searchInput = document.querySelector(".search-bar");
        const statusFilter = document.querySelector("#statusFilter");
        const dateFilter = document.querySelector("#dateFilter");

        function normalize(s) {
            return (s || "").toString().trim().toLowerCase();
        }

        function applyFilters() {
            const searchTerm = normalize(searchInput.value);
            const statusVal = normalize(statusFilter.value);
            const selectedDate = dateFilter.value; // Already in YYYY-MM-DD format

            document.querySelectorAll(".table tbody tr").forEach((row) => {
                let show = true;

                // Skip empty rows
                if (row.cells.length === 0 || row.cells[0]?.innerText.includes('No bookings found') || row.cells[0]?.innerText.includes('Error loading')) {
                    return;
                }

                const bookingId = normalize(row.cells[0]?.innerText);
                const vehicleNumber = normalize(row.cells[1]?.innerText);
                const employeeName = normalize(row.cells[2]?.innerText);
                const buildingName = normalize(row.cells[3]?.innerText);
                const slotNumber = normalize(row.cells[4]?.innerText);
                const status = normalize(row.cells[5]?.innerText);
                const dateTime = row.cells[6]?.innerText.trim();

                // Search filter (searches in booking ID, vehicle number, employee name, building, slot)
                if (searchTerm) {
                    if (!(bookingId.includes(searchTerm) ||
                        vehicleNumber.includes(searchTerm) ||
                        employeeName.includes(searchTerm) ||
                        buildingName.includes(searchTerm) ||
                        slotNumber.includes(searchTerm))) {
                        show = false;
                    }
                }

                // Status filter
                if (statusVal && statusVal !== "" && statusVal !== "all status") {
                    if (status !== statusVal) {
                        show = false;
                    }
                }

                // Date filter
                if (selectedDate) {
                    // Extract date from the row's date cell (should be in YYYY-MM-DD format)
                    const rowDateText = dateTime.trim();
                    if (rowDateText !== 'N/A' && rowDateText !== selectedDate) {
                        show = false;
                    }
                }

                row.style.display = show ? "" : "none";
            });
        }

        // Expose for calling after rows are rendered
        window.applyFilters = applyFilters;

        // Event listeners
        if (searchInput) {
            searchInput.addEventListener("input", applyFilters);
        }
        if (statusFilter) {
            statusFilter.addEventListener("change", applyFilters);
        }
        if (dateFilter) {
            dateFilter.addEventListener("change", applyFilters);
        }
    }

    // Function to fetch and display bookings data
    const fetchAndDisplayBookings = async () => {
        try {
            let counter = 1;
            console.log('Fetching bookings data...');
            const bookingsTableBody = document.querySelector('.table tbody');

            if (!bookingsTableBody) {
                console.error('Bookings table body not found');
                return;
            }

            // Clear existing rows
            bookingsTableBody.innerHTML = '';

            const bookingsSnapshot = await getDocs(collection(db, 'bookings'));

            if (bookingsSnapshot.empty) {
                console.log('No bookings found');
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = '<td colspan="7" style="text-align: center; padding: 20px;">No bookings found</td>';
                bookingsTableBody.appendChild(emptyRow);
                return;
            }

            console.log(`Found ${bookingsSnapshot.size} bookings`);

            for (const bookingDoc of bookingsSnapshot.docs) {
                const bookingData = bookingDoc.data();
                const relatedData = await fetchRelatedBookingData(bookingData);

                // Format date to YYYY-MM-DD for consistent filtering
                const bookingDate = bookingData.booking_time
                    ? new Date(bookingData.booking_time.seconds * 1000).toISOString().split('T')[0]
                    : 'N/A';

                // Create table row
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>BK#${counter++}</td>
                    <td>${relatedData.vehicleNumber}</td>
                    <td>${relatedData.employeeName}</td>
                    <td>${relatedData.buildingName}</td>
                    <td>${relatedData.level}\n${relatedData.slotName}</td>
                    <td>${bookingData.status || 'N/A'}</td>
                    <td>${bookingDate}</td>
                    <td><button class="btn-action">View</button></td>
                `;

                // Append row immediately
                bookingsTableBody.appendChild(row);
            }

            console.log('Bookings table populated successfully');

            // Apply filters after data is loaded
            if (window.applyFilters) {
                window.applyFilters();
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            const bookingsTableBody = document.querySelector('.table tbody');
            if (bookingsTableBody) {
                bookingsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Error loading bookings</td></tr>';
            }
        }
    };

    // Function to fetch related data for a booking
    const fetchRelatedBookingData = async (bookingData) => {
        console.log('Fetching related data for booking:', bookingData);
        
        // Initialize with default values
        const relatedData = {
            vehicleNumber: 'N/A',
            buildingName: 'N/A',
            level: 'N/A',
            employeeName: 'N/A',
            slotName: 'N/A'
        };

        try {
            // Check if booking has direct fields (new simplified structure)
            if (bookingData.vehicle_number) {
                relatedData.vehicleNumber = bookingData.vehicle_number;
            }
            if (bookingData.employee_name) {
                relatedData.employeeName = bookingData.employee_name;
            }
            if (bookingData.slot_name) {
                relatedData.slotName = bookingData.slot_name;
            }
            if (bookingData.building) {
                relatedData.buildingName = bookingData.building;
            }
            if (bookingData.floor) {
                relatedData.level = bookingData.floor;
            }

            // Fallback: try to fetch from references if direct fields don't exist (old structure)
            if (bookingData.vehicle_id && typeof bookingData.vehicle_id === 'string') {
                try {
                    let parts = bookingData.vehicle_id.split('/');
                    const employeePath = parts.slice(0, 2).join('/');
                    const employeeSnap = await getDoc(doc(db, employeePath));
                    const employeeData = employeeSnap && employeeSnap.exists() ? employeeSnap.data() : null;
                    
                    if (employeeData && !bookingData.employee_name) {
                        relatedData.employeeName = employeeData.full_name || 'N/A';
                    }

                    const vehicleDoc = await getDoc(doc(db, bookingData.vehicle_id));
                    if (vehicleDoc.exists() && !bookingData.vehicle_number) {
                        const vehicleData = vehicleDoc.data();
                        relatedData.vehicleNumber = vehicleData.registration_no || vehicleData.vehicleNumber || vehicleData.number || vehicleData.plateNumber || 'N/A';
                    }
                } catch (error) {
                    console.warn('Error fetching vehicle data:', error);
                }
            }

            // Fetch slot data if slotId exists and direct fields are missing
            if (bookingData.slot_id && (!bookingData.slot_name || !bookingData.building || !bookingData.floor)) {
                try {
                    const slotDoc = await getDoc(bookingData.slot_id);
                    if (slotDoc.exists()) {
                        const slotData = slotDoc.data();
                        if (!bookingData.building) {
                            relatedData.buildingName = slotData.building || 'N/A';
                        }
                        if (!bookingData.slot_name) {
                            relatedData.slotName = slotData.slot_name || slotData.slotNumber || slotDoc.id;
                        }
                        if (!bookingData.floor) {
                            relatedData.level = slotData.floor || 'N/A';
                        }
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

    // Initialize table filters
    initTableFilters();

    // Load bookings data when page loads
    fetchAndDisplayBookings();
    //
    // ... (keep all the existing code at the top of your file) ...
    //

    // Load bookings data when page loads
    fetchAndDisplayBookings();

    // --- REPLACE THE EXISTING bookSlotButton EVENT LISTENER WITH THIS ENTIRE BLOCK ---

    const bookSlotButton = document.querySelector('.btn-primary');

    // Function to handle the booking submission
    const handleAddBooking = async () => {
        // 1. Get data from form inputs
        const vehicleNumber = document.getElementById('book-vehicle-number').value.trim();
        const employeeName = document.getElementById('book-employee-name').value.trim();
        const slotName = document.getElementById('book-slot-number').value.trim();
        const contactNumber = document.getElementById('book-contact-number').value.trim();
        const bookingDateStr = document.getElementById('book-booking-date').value;

        // 2. Basic validation
        if (!vehicleNumber || !slotName || !bookingDateStr) {
            alert('Please fill in Vehicle Number, Slot Number, and Booking Date.');
            return;
        }

        try {
            // 3. Find the slot's document reference (slot_id) and verify it's available
            const slotsRef = collection(db, 'ParkingSlots');
            const slotQuery = query(slotsRef, where('slot_name', '==', slotName));
            const slotSnapshot = await getDocs(slotQuery);

            if (slotSnapshot.empty) {
                alert(`Parking slot "${slotName}" not found.`);
                return;
            }

            const slotDoc = slotSnapshot.docs[0];
            const slotData = slotDoc.data();

            if (slotData.status !== 'Free') {
                alert(`Slot "${slotName}" is already ${slotData.status}. Please select a free slot.`);
                return;
            }
            const slotRef = slotDoc.ref; // This is the DocumentReference for slot_id

            // 4. Construct the new booking object with simplified structure
            const bookingDate = new Date(bookingDateStr);
            const newBooking = {
                booking_time: Timestamp.fromDate(bookingDate),
                // Let's set expiry time to 8 hours after booking time as an example
                expiry_time: Timestamp.fromMillis(bookingDate.getTime() + 8 * 60 * 60 * 1000),
                status: "Confirmed", // Default status for a new booking
                vehicle_number: vehicleNumber, // Store vehicle number directly
                employee_name: employeeName, // Store employee name directly
                contact_number: contactNumber, // Store contact number
                slot_id: slotRef,
                slot_name: slotName, // Store slot name for easier reference
                building: slotData.building || 'N/A',
                floor: slotData.floor || 'N/A',
                created_at: Timestamp.now()
            };

            // 5. Add the new booking document to Firestore
            const docRef = await addDoc(collection(db, 'bookings'), newBooking);
            console.log("Booking added with ID: ", docRef.id);

            // 6. IMPORTANT: Update the status of the parking slot
            await updateDoc(slotRef, {
                status: 'Booked'
            });
            console.log(`Slot ${slotName} status updated to Booked.`);

            // 7. Close overlay and refresh the table
            alert('Slot booked successfully!');
            document.body.removeChild(document.querySelector('.overlay')); // Close the overlay
            fetchAndDisplayBookings(); // Refresh the booking list

        } catch (error) {
            console.error("Error booking slot: ", error);
            alert("Failed to book slot. Please check the console for details.");
        }
    };

    bookSlotButton.addEventListener('click', () => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'overlay'; // Add a class for easier selection
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

        const heading = document.createElement('h3');
        heading.textContent = 'Book Parking Slot';
        heading.style.marginBottom = '20px';
        card.appendChild(heading);

        // --- MODIFICATION: ADD IDs TO INPUTS ---
        const fields = [
            { label: 'Vehicle Number', type: 'text', id: 'book-vehicle-number' },
            { label: 'Employee Name', type: 'text', id: 'book-employee-name' },
            { label: 'Slot Number', type: 'text', id: 'book-slot-number', button: 'Select Slot' },
            { label: 'Contact Number', type: 'text', id: 'book-contact-number' },
            { label: 'Booking Date', type: 'date', id: 'book-booking-date' }
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
            input.id = field.id; // Assign the ID
            input.style.width = '100%';
            input.style.padding = '8px';
            input.style.border = '1px solid #ccc';
            input.style.borderRadius = '4px';

            fieldContainer.appendChild(label);
            fieldContainer.appendChild(input);

            if (field.button) {
                const button = document.createElement('button');
                button.textContent = field.button;
                // (styling for the 'Select Slot' button remains the same)
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

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.marginTop = '20px';

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        // (styling for cancel button remains the same)
        cancelButton.style.marginRight = '10px';
        cancelButton.style.padding = '10px 20px';
        cancelButton.style.border = 'none';
        cancelButton.style.backgroundColor = '#6c757d';
        cancelButton.style.color = '#fff';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.cursor = 'pointer';

        const bookButton = document.createElement('button');
        bookButton.textContent = 'Book Slot';
        // (styling for book button remains the same)
        bookButton.style.padding = '10px 20px';
        bookButton.style.border = 'none';
        bookButton.style.backgroundColor = '#007bff';
        bookButton.style.color = '#fff';
        bookButton.style.borderRadius = '4px';
        bookButton.style.cursor = 'pointer';

        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(bookButton);
        card.appendChild(buttonContainer);

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        cancelButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });

        // --- MODIFICATION: CALL THE handleAddBooking FUNCTION ---
        bookButton.addEventListener('click', handleAddBooking);

        // (The 'Select Slot' button listener and related functions remain the same)
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
    }); // Closing brace for the last event listener
}); // Closing brace for the DOMContentLoaded event listener
