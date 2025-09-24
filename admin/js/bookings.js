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
    // Add styles for parking slots
    const parkingStyles = document.createElement('style');
    parkingStyles.textContent = `
        @keyframes blink {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        .parking-slot {
            transition: all 0.3s ease;
            cursor: pointer;
        }
        .parking-slot.available {
            background-color: #43bf73;
            color: white;
        }
        .parking-slot.occupied {
            background-color: #DC143C;
            color: white;
            cursor: not-allowed;
        }
        .parking-slot.reserved {
            background-color: #F09951;
            color: white;
            cursor: not-allowed;
        }
        .parking-slot.named {
            background-color: #A0A0A0 !important;
            color: white;
            cursor: not-allowed;
        }
        .parking-slot.unbooked {
            background-color: #EA5853;
            color: white;
        }
    `;
    document.head.appendChild(parkingStyles);

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

        const clearFiltersBtn = document.getElementById('clearFilters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                if (statusFilter) statusFilter.value = '';
                if (dateFilter) dateFilter.value = '';
                applyFilters();
            });
        }
    }

    // Add loading state to prevent multiple simultaneous fetches
    let isLoading = false;

    // Function to fetch and display bookings data
    const fetchAndDisplayBookings = async () => {
        if (isLoading) return;
        
        try {
            isLoading = true;
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
                    <td><button class="btn-action view-btn" data-booking-id="${bookingDoc.id}">View</button></td>
                `;

                // Store booking data for later retrieval
                row.dataset.bookingData = JSON.stringify({
                    id: bookingDoc.id,
                    ...bookingData,
                    relatedData: relatedData
                });

                // Append row immediately
                bookingsTableBody.appendChild(row);
            }

            // Add event listeners to view buttons after all rows are created
            addViewButtonListeners();

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
        } finally {
            isLoading = false;
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

    // Function to add event listeners to view buttons
    const addViewButtonListeners = () => {
        document.querySelectorAll('.view-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const row = e.target.closest('tr');
                const bookingData = JSON.parse(row.dataset.bookingData);
                showBookingDetailsOverlay(bookingData);
            });
        });
    };

    // Function to show booking details overlay
    const showBookingDetailsOverlay = (bookingData) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'booking-details-overlay';
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
        card.style.width = '500px';
        card.style.maxHeight = '80vh';
        card.style.backgroundColor = '#fff';
        card.style.borderRadius = '12px';
        card.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
        card.style.padding = '30px';
        card.style.position = 'relative';
        card.style.overflowY = 'auto';

        // Format dates for display
        const bookingDate = bookingData.booking_time
            ? new Date(bookingData.booking_time.seconds * 1000).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
            : 'N/A';

        const bookingTime = bookingData.booking_time
            ? new Date(bookingData.booking_time.seconds * 1000).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            })
            : 'N/A';

        const expiryDate = bookingData.expiry_time
            ? new Date(bookingData.expiry_time.seconds * 1000).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
            : 'N/A';

        const expiryTime = bookingData.expiry_time
            ? new Date(bookingData.expiry_time.seconds * 1000).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            })
            : 'N/A';

        const createdAt = bookingData.created_at
            ? new Date(bookingData.created_at.seconds * 1000).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            : 'N/A';

        // Create card content
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px;">
                <h2 style="margin: 0; color: #333; font-size: 24px;">Booking Details</h2>
                <button class="close-details-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 5px;">&times;</button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <h3 style="margin: 0 0 10px 0; color: #007bff; font-size: 16px;">Booking Information</h3>
                    <p style="margin: 5px 0;"><strong>Booking ID:</strong> ${bookingData.id}</p>
                    <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${getStatusColor(bookingData.status)}; font-weight: bold;">${bookingData.status || 'N/A'}</span></p>
                    <p style="margin: 5px 0;"><strong>Booking Date:</strong> ${bookingDate}</p>
                    <p style="margin: 5px 0;"><strong>Booking Time:</strong> ${bookingTime}</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <h3 style="margin: 0 0 10px 0; color: #28a745; font-size: 16px;">Vehicle Information</h3>
                    <p style="margin: 5px 0;"><strong>Vehicle Number:</strong> ${bookingData.relatedData.vehicleNumber}</p>
                    <p style="margin: 5px 0;"><strong>Employee:</strong> ${bookingData.relatedData.employeeName}</p>
                    <p style="margin: 5px 0;"><strong>Contact:</strong> ${bookingData.contact_number || 'N/A'}</p>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <h3 style="margin: 0 0 10px 0; color: #dc3545; font-size: 16px;">Parking Details</h3>
                    <p style="margin: 5px 0;"><strong>Building:</strong> ${bookingData.relatedData.buildingName}</p>
                    <p style="margin: 5px 0;"><strong>Floor/Level:</strong> ${bookingData.relatedData.level}</p>
                    <p style="margin: 5px 0;"><strong>Slot Number:</strong> ${bookingData.relatedData.slotName}</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <h3 style="margin: 0 0 10px 0; color: #ffc107; font-size: 16px;">Timing Information</h3>
                    <p style="margin: 5px 0;"><strong>Expiry Date:</strong> ${expiryDate}</p>
                    <p style="margin: 5px 0;"><strong>Expiry Time:</strong> ${expiryTime}</p>
                    <p style="margin: 5px 0;"><strong>Created:</strong> ${createdAt}</p>
                </div>
            </div>
            
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                <button class="close-details-btn-bottom" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">Close</button>
            </div>
        `;

        // Append card to overlay
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        // Add close functionality
        const closeButtons = overlay.querySelectorAll('.close-details-btn, .close-details-btn-bottom');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(overlay);
            });
        });

        // Close overlay when clicking outside
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });

        // Add functionality for action buttons (placeholder for now)
        const editBtn = overlay.querySelector('.edit-booking-btn');
        const cancelBtn = overlay.querySelector('.cancel-booking-btn');

        editBtn.addEventListener('click', () => {
            alert('Edit functionality will be implemented here');
        });

        cancelBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to cancel this booking?')) {
                alert('Cancel booking functionality will be implemented here');
            }
        });
    };

    // Helper function to get status color
    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'confirmed':
                return '#28a745';
            case 'cancelled':
                return '#dc3545';
            case 'completed':
                return '#007bff';
            default:
                return '#6c757d';
        }
    };

    // Initialize table filters
    initTableFilters();

    // Load bookings data when page loads
    fetchAndDisplayBookings();

    // --- HANDLE BOOKING SLOT BUTTON ---

    const bookSlotButton = document.querySelector('.btn-primary');

    // Function to handle the booking submission
    const handleAddBooking = async (bookingDateStr) => {
        // 1. Get data from form inputs
        const vehicleNumber = document.getElementById('book-vehicle-number').value.trim();
        const employeeName = document.getElementById('book-employee-name').value.trim();
        const slotName = document.getElementById('book-slot-number').value.trim();
        const contactNumber = document.getElementById('book-contact-number').value.trim();

        // 2. Basic validation
        if (!vehicleNumber || !slotName) {
            alert('Please fill in Vehicle Number and select a Slot.');
            return;
        }

        try {
            // Get the selected floor and building from hidden inputs
            const floorInput = document.getElementById('book-floor-number');
            const buildingInput = document.getElementById('book-building');
            const selectedFloor = floorInput ? floorInput.value : null;
            const selectedBuilding = buildingInput ? buildingInput.value : null;
            
            if (!selectedFloor || !selectedBuilding) {
                alert('Please select a parking slot using the slot selection tool.');
                return;
            }

            // Extract the actual slot name from the display value
            const actualSlotName = slotName.split(' (')[0];
            
            // 3. Find the slot's document reference (slot_id) and verify it's available
            const slotsRef = collection(db, 'ParkingSlots');
            const slotQuery = query(slotsRef, 
                where('slot_name', '==', actualSlotName),
                where('floor', '==', selectedFloor),
                where('building', '==', selectedBuilding)
            );
            
            const slotSnapshot = await getDocs(slotQuery);

            if (slotSnapshot.empty) {
                alert(`Parking slot "${actualSlotName}" not found in ${selectedBuilding} on floor ${selectedFloor}.`);
                return;
            }

            const slotDoc = slotSnapshot.docs[0];
            const slotData = slotDoc.data();

            // For future dates, we assume the slot is free if it's not 'Named'
            const selectedDate = new Date(bookingDateStr);
            selectedDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate.getTime() === today.getTime()) {
                if (slotData.status !== 'Free') {
                    alert(`Slot "${actualSlotName}" in ${selectedBuilding} on floor ${selectedFloor} is already ${slotData.status}. Please select a free slot.`);
                    return;
                }
            } else if (selectedDate > today) {
                if (slotData.status === 'Named') {
                     alert(`Slot "${actualSlotName}" in ${selectedBuilding} on floor ${selectedFloor} is a named slot and cannot be booked.`);
                    return;
                }
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
                slot_name: actualSlotName, // Store actual slot name
                building: slotData.building || 'N/A',
                floor: slotData.floor || 'N/A',
                created_at: Timestamp.now()
            };

            // 5. Add the new booking document to Firestore
            const docRef = await addDoc(collection(db, 'bookings'), newBooking);
            console.log("Booking added with ID: ", docRef.id);

            // 6. IMPORTANT: Update the status of the parking slot only for today's bookings
            if (selectedDate.getTime() === today.getTime()) {
                await updateDoc(slotRef, {
                    status: 'Booked'
                });
                console.log(`Slot ${actualSlotName} status updated to Booked.`);
            }

            // 7. Close overlay and refresh the table
            alert('Slot booked successfully!');
            document.body.removeChild(document.querySelector('.overlay')); // Close the overlay
            fetchAndDisplayBookings(); // Refresh the booking list

        } catch (error) {
            console.error("Error booking slot: ", error);
            alert("Failed to book slot. Please check the console for details.");
        }
    };

    const showBookingForm = (bookingDateStr) => {
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
            { label: 'Booking Date', type: 'date', id: 'book-booking-date', readonly: true },
            { label: 'Vehicle Number', type: 'text', id: 'book-vehicle-number' },
            { label: 'Employee Name', type: 'text', id: 'book-employee-name' },
            { label: 'Slot Number', type: 'text', id: 'book-slot-number', button: 'Select Slot', readonly: true},
            { label: 'Contact Number', type: 'text', id: 'book-contact-number' }
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

            if (field.readonly) {
                input.readOnly = true;
                input.style.backgroundColor = '#e9ecef';
            }

            if (field.id === 'book-booking-date') {
                input.value = bookingDateStr;
            }

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
        bookButton.addEventListener('click', () => handleAddBooking(bookingDateStr));

        const selectSlotButton = card.querySelector('#book-slot-number + button');
        if (selectSlotButton) {
            selectSlotButton.addEventListener('click', () => {
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
                slotOverlay.style.zIndex = '1001'; // Higher z-index

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
                        <span class="legend-color occupied"></span> Booked
                    </div>
                    <div class="legend-item">
                        <span class="legend-color reserved"></span> Reserved
                    </div>
                    <div class="legend-item">
                        <span class="legend-color named"></span> Named
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
                    parkingGrid.innerHTML = '';

                    const selectedBuilding = buildingDropdown.value;
                    
                    const floorSlots = slots.filter(slot => 
                        slot.floor === floor && 
                        slot.building === selectedBuilding
                    );

                    if (floorSlots.length === 0) {
                        parkingGrid.innerHTML = '<div style="text-align: center; padding: 20px;">No slots available for this floor</div>';
                        return;
                    }
                    
                    const slotsByBlock = floorSlots.reduce((blocks, slot) => {
                        const block = slot.block || 'Default';
                        if (!blocks[block]) blocks[block] = [];
                        blocks[block].push(slot);
                        return blocks;
                    }, {});

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
                            
                            let currentStatus = slot.status;

                            const selectedDate = new Date(bookingDateStr);
                            selectedDate.setHours(0, 0, 0, 0);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);

                            let isClickable = false;

                            if (selectedDate > today) {
                                if (currentStatus !== 'Named') {
                                    currentStatus = 'Free';
                                    isClickable = true;
                                }
                            } else {
                                if (currentStatus === 'Free') {
                                    isClickable = true;
                                }
                            }
                            
                            slotElement.classList.remove('available', 'named', 'reserved', 'occupied', 'unbooked');
                            if (currentStatus === 'Free') {
                                slotElement.classList.add('available');
                            } else if (currentStatus === 'Named') {
                                slotElement.classList.add('named');
                            } else if (currentStatus === 'Reserved') {
                                slotElement.classList.add('reserved');
                            } else if (currentStatus === 'Booked') {
                                slotElement.classList.add('occupied');
                            } else {
                                slotElement.classList.add('unbooked');
                            }

                            slotElement.textContent = slot.slot_name;
                            slotElement.title = `Slot ${slot.slot_name}\nStatus: ${currentStatus}`;

                            if (isClickable) {
                                slotElement.style.cursor = 'pointer';
                                slotElement.addEventListener('click', () => {
                                    const slotInput = document.getElementById('book-slot-number');
                                    let floorInput = document.getElementById('book-floor-number');
                                    let buildingInput = document.getElementById('book-building');

                                    if (!floorInput) {
                                        floorInput = document.createElement('input');
                                        floorInput.type = 'hidden';
                                        floorInput.id = 'book-floor-number';
                                        slotInput.parentNode.appendChild(floorInput);
                                    }
                                    floorInput.value = floor;
                                    
                                    if (!buildingInput) {
                                        buildingInput = document.createElement('input');
                                        buildingInput.type = 'hidden';
                                        buildingInput.id = 'book-building';
                                        slotInput.parentNode.appendChild(buildingInput);
                                    }
                                    buildingInput.value = selectedBuilding;
                                    
                                    slotInput.value = `${slot.slot_name} (${selectedBuilding} - Floor ${floor})`;
                                    
                                    document.body.removeChild(slotOverlay);
                                });
                            }
                            
                            slotsGrid.appendChild(slotElement);
                        });

                        blockDiv.appendChild(slotsGrid);
                        parkingGrid.appendChild(blockDiv);
                    });
                };

                const fetchBuildings = async () => {
                    try {
                        const slotsSnapshot = await getDocs(collection(db, 'ParkingSlots'));
                        const buildingsSet = new Set();
                        slotsSnapshot.forEach((doc) => {
                            const slotData = doc.data();
                            if (slotData.building) {
                                buildingsSet.add(slotData.building);
                            }
                        });
                        const buildings = Array.from(buildingsSet).sort();
                        buildings.forEach((building) => {
                            const option = document.createElement('option');
                            option.value = building;
                            option.textContent = building;
                            buildingDropdown.appendChild(option);
                        });
                    } catch (error) {
                        console.error('Error fetching buildings:', error);
                    }
                };

                fetchBuildings();

                buildingDropdown.addEventListener('change', async () => {
                    const selectedBuilding = buildingDropdown.value;
                    if (selectedBuilding) {
                        levelTabs.style.display = 'flex';
                        parkingGrid.style.display = 'block';
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

                const fetchSlotsAndFloors = async (building) => {
                    try {
                        const slotsRef = collection(db, 'ParkingSlots');
                        const buildingQuery = query(slotsRef, where('building', '==', building));
                        const slotsSnapshot = await getDocs(buildingQuery);
                        
                        allSlotsData = [];
                        const floorsSet = new Set();

                        slotsSnapshot.forEach((doc) => {
                            allSlotsData.push({ id: doc.id, ...doc.data() });
                            if (doc.data().floor) {
                                floorsSet.add(doc.data().floor);
                            }
                        });

                        availableFloors = Array.from(floorsSet).sort();
                    } catch (error) {
                        console.error('Error fetching parking slots:', error);
                    }
                };

                slotOverlay.appendChild(parkingOverview);
                document.body.appendChild(slotOverlay);

                slotOverlay.addEventListener('click', (e) => {
                    if (e.target === slotOverlay) {
                        document.body.removeChild(slotOverlay);
                    }
                });
            });
        }
    }

    bookSlotButton.addEventListener('click', () => {
        // Create a preliminary overlay to ask for the date first
        const dateOverlay = document.createElement('div');
        dateOverlay.className = 'overlay';
        dateOverlay.style.position = 'fixed';
        dateOverlay.style.top = '0';
        dateOverlay.style.left = '0';
        dateOverlay.style.width = '100%';
        dateOverlay.style.height = '100%';
        dateOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        dateOverlay.style.display = 'flex';
        dateOverlay.style.justifyContent = 'center';
        dateOverlay.style.alignItems = 'center';
        dateOverlay.style.zIndex = '1000';

        const card = document.createElement('div');
        card.style.width = '400px';
        card.style.backgroundColor = '#fff';
        card.style.borderRadius = '8px';
        card.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        card.style.padding = '20px';
        card.style.position = 'relative';

        const heading = document.createElement('h3');
        heading.textContent = 'Select Booking Date';
        heading.style.marginBottom = '20px';
        card.appendChild(heading);

        const fieldContainer = document.createElement('div');
        fieldContainer.style.marginBottom = '15px';

        const label = document.createElement('label');
        label.textContent = 'Booking Date';
        label.style.display = 'block';
        label.style.marginBottom = '5px';
        fieldContainer.appendChild(label);

        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.id = 'pre-booking-date';
        dateInput.style.width = '100%';
        dateInput.style.padding = '8px';
        dateInput.style.border = '1px solid #ccc';
        dateInput.style.borderRadius = '4px';
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today); // Prevent selecting past dates
        fieldContainer.appendChild(dateInput);
        card.appendChild(fieldContainer);

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
        buttonContainer.appendChild(cancelButton);

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.style.padding = '10px 20px';
        nextButton.style.border = 'none';
        nextButton.style.backgroundColor = '#007bff';
        nextButton.style.color = '#fff';
        nextButton.style.borderRadius = '4px';
        nextButton.style.cursor = 'pointer';
        buttonContainer.appendChild(nextButton);

        card.appendChild(buttonContainer);
        dateOverlay.appendChild(card);
        document.body.appendChild(dateOverlay);

        cancelButton.addEventListener('click', () => {
            document.body.removeChild(dateOverlay);
        });

        nextButton.addEventListener('click', () => {
            const selectedDate = dateInput.value;
            if (!selectedDate) {
                alert('Please select a date to continue.');
                return;
            }
            document.body.removeChild(dateOverlay);
            showBookingForm(selectedDate);
        });
    });
});
