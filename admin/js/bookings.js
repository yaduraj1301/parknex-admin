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
                            <span class="legend-color available"></span> Available
                        </div>
                        <div class="legend-item">
                            <span class="legend-color occupied"></span> Occupied
                        </div>
                        <div class="legend-item">
                            <span class="legend-color reserved"></span> Reserved
                        </div>
                        <div class="legend-item">
                            <span class="legend-color unbooked"></span> Unbooked
                        </div>
                    `;
                    parkingOverview.appendChild(legend);

                    // Add level tabs
                    const levelTabs = document.createElement('div');
                    levelTabs.classList.add('level-tabs');
                    for (let i = 1; i <= 3; i++) {
                        const tab = document.createElement('button');
                        tab.classList.add('level-tab');
                        if (i === 1) tab.classList.add('active');
                        tab.dataset.level = i;
                        tab.textContent = `Level ${i}`;
                        tab.addEventListener('click', () => {
                            document.querySelectorAll('.level-tab').forEach(t => t.classList.remove('active'));
                            tab.classList.add('active');
                            renderParkingGrid(i);
                        });
                        levelTabs.appendChild(tab);
                    }
                    parkingOverview.appendChild(levelTabs);

                    // Add parking grid
                    const parkingGrid = document.createElement('div');
                    parkingGrid.classList.add('parking-grid');
                    parkingOverview.appendChild(parkingGrid);

                    // Function to render parking grid for a level
                    const renderParkingGrid = (level) => {
                        parkingGrid.innerHTML = '';
                        const blocks = ['A', 'B', 'C'];
                        blocks.forEach(block => {
                            const blockDiv = document.createElement('div');
                            blockDiv.classList.add('parking-block');

                            const blockHeader = document.createElement('h4');
                            blockHeader.textContent = `${block}-Block`;
                            blockDiv.appendChild(blockHeader);

                            const slotsGrid = document.createElement('div');
                            slotsGrid.classList.add('slots-grid');

                            for (let i = 1; i <= 12; i++) {
                                const slot = document.createElement('div');
                                slot.classList.add('parking-slot', 'available');
                                if (i%4 === 0) slot.classList.remove('available'), slot.classList.add('slot-blinking', 'occupied');
                                slot.textContent = `${block}${i}`;
                                slotsGrid.appendChild(slot);
                            }

                            blockDiv.appendChild(slotsGrid);
                            parkingGrid.appendChild(blockDiv);
                        });
                    };

                    // Initial render for Level 1
                    renderParkingGrid(1);

                    // Add close button
                    const closeButton = document.createElement('button');
                    closeButton.textContent = 'Close';
                    closeButton.style.marginTop = '20px';
                    closeButton.style.padding = '10px 20px';
                    closeButton.style.border = 'none';
                    closeButton.style.backgroundColor = '#6c757d';
                    closeButton.style.color = '#fff';
                    closeButton.style.borderRadius = '4px';
                    closeButton.style.cursor = 'pointer';

                    closeButton.addEventListener('click', () => {
                        document.body.removeChild(slotOverlay);
                    });

                    parkingOverview.appendChild(closeButton);

                    // Append parking overview to overlay
                    slotOverlay.appendChild(parkingOverview);
                    document.body.appendChild(slotOverlay);
                });
            }
        });
    });
});