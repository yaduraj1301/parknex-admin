document.addEventListener('DOMContentLoaded', () => {
    const bookSlotButton = document.querySelector('.btn-primary.btn-sm');

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
                button.style.marginLeft = '10px';
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
    });
});