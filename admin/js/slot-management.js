// Sample data structure with enhanced slot information
let parkingData = {
    level1: {
        'A Block': {
            slots: [
                { id: 'A01', status: 'available', type: 'normal', location: 'Thiruvanathapuram', building: 'Thejaswini', group: 'Yamuna', notes: '' },
                { id: 'A02', status: 'occupied', type: 'normal', location: 'Thiruvanathapuram', building: 'Thejaswini', group: 'Yamuna', notes: '' },
                { id: 'A03', status: 'reserved', type: 'normal', location: 'Thiruvanathapuram', building: 'Thejaswini', group: 'Yamuna', notes: '' },
                { id: 'A04', status: 'available', type: 'ev', location: 'Thiruvanathapuram', building: 'Thejaswini', group: 'Yamuna', notes: 'EV charging station' },
                { id: 'A05', status: 'occupied', type: 'normal', location: 'Thiruvanathapuram', building: 'Thejaswini', group: 'Yamuna', notes: '' },
                { id: 'A06', status: 'available', type: 'handicap', location: 'Thiruvanathapuram', building: 'Thejaswini', group: 'Yamuna', notes: 'Near entrance' },
                { id: 'A07', status: 'occupied', type: 'normal', location: 'Thiruvanathapuram', building: 'Thejaswini', group: 'Ganga', notes: '' },
                { id: 'A08', status: 'occupied', type: 'normal', location: 'Thiruvanathapuram', building: 'Thejaswini', group: 'Ganga', notes: '' },
                { id: 'A09', status: 'unauthorized', type: 'normal', location: 'Thiruvanathapuram', building: 'Thejaswini', group: 'Ganga', notes: '' },
                { id: 'A10', status: 'available', type: 'normal', location: 'Thiruvanathapuram', building: 'Thejaswini', group: 'Ganga', notes: '' },
                { id: 'A11', status: 'available', type: 'normal', location: 'Thiruvanathapuram', building: 'Thejaswini', group: 'Ganga', notes: '' },
                { id: 'A12', status: 'reserved', type: 'normal', location: 'Thiruvanathapuram', building: 'Thejaswini', group: 'Ganga', notes: '' }
            ]
        },
        'B Block': {
            slots: [
                { id: 'B01', status: 'available', type: 'normal', location: 'Kochi', building: 'Gayan', group: 'Periyar', notes: '' },
                { id: 'B02', status: 'occupied', type: 'normal', location: 'Kochi', building: 'Gayan', group: 'Periyar', notes: '' },
                { id: 'B03', status: 'reserved', type: 'normal', location: 'Kochi', building: 'Gayan', group: 'Periyar', notes: '' },
                { id: 'B04', status: 'available', type: 'ev', location: 'Kochi', building: 'Gayan', group: 'Periyar', notes: 'Fast charging' },
                { id: 'B05', status: 'occupied', type: 'normal', location: 'Kochi', building: 'Gayan', group: 'Periyar', notes: '' },
                { id: 'B06', status: 'available', type: 'handicap', location: 'Kochi', building: 'Gayan', group: 'Periyar', notes: 'Wide space' },
                { id: 'B07', status: 'occupied', type: 'normal', location: 'Kochi', building: 'Athulya', group: 'Yamuna', notes: '' },
                { id: 'B08', status: 'occupied', type: 'normal', location: 'Kochi', building: 'Athulya', group: 'Yamuna', notes: '' },
                { id: 'B09', status: 'unauthorized', type: 'normal', location: 'Kochi', building: 'Athulya', group: 'Yamuna', notes: '' },
                { id: 'B10', status: 'available', type: 'normal', location: 'Kochi', building: 'Athulya', group: 'Yamuna', notes: '' },
                { id: 'B11', status: 'available', type: 'normal', location: 'Kochi', building: 'Athulya', group: 'Yamuna', notes: '' },
                { id: 'B12', status: 'reserved', type: 'normal', location: 'Kochi', building: 'Athulya', group: 'Yamuna', notes: '' }
            ]
        },
        'C Block': {
            slots: [
                { id: 'C01', status: 'available', type: 'normal', location: 'Thiruvanathapuram', building: 'Athulya', group: 'Ganga', notes: '' },
                { id: 'C02', status: 'occupied', type: 'normal', location: 'Thiruvanathapuram', building: 'Athulya', group: 'Ganga', notes: '' },
                { id: 'C03', status: 'reserved', type: 'normal', location: 'Thiruvanathapuram', building: 'Athulya', group: 'Ganga', notes: '' },
                { id: 'C04', status: 'available', type: 'ev', location: 'Thiruvanathapuram', building: 'Athulya', group: 'Ganga', notes: 'Premium charging' },
                { id: 'C05', status: 'occupied', type: 'normal', location: 'Thiruvanathapuram', building: 'Athulya', group: 'Ganga', notes: '' },
                { id: 'C06', status: 'available', type: 'handicap', location: 'Thiruvanathapuram', building: 'Athulya', group: 'Ganga', notes: 'Around a corner, near a Pillar' },
                { id: 'C07', status: 'occupied', type: 'normal', location: 'Thiruvanathapuram', building: 'Gayan', group: 'Periyar', notes: '' },
                { id: 'C08', status: 'occupied', type: 'normal', location: 'Thiruvanathapuram', building: 'Gayan', group: 'Periyar', notes: '' },
                { id: 'C09', status: 'unauthorized', type: 'normal', location: 'Thiruvanathapuram', building: 'Gayan', group: 'Periyar', notes: '' },
                { id: 'C10', status: 'available', type: 'normal', location: 'Thiruvanathapuram', building: 'Gayan', group: 'Periyar', notes: '' },
                { id: 'C11', status: 'available', type: 'normal', location: 'Thiruvanathapuram', building: 'Gayan', group: 'Periyar', notes: '' },
                { id: 'C12', status: 'reserved', type: 'normal', location: 'Thiruvanathapuram', building: 'Gayan', group: 'Periyar', notes: '' }
            ]
        }
    }
};

let currentLevel = 1;
let currentFilter = null;

// Initialize the parking grid
function initializeParkingGrid() {
    renderParkingGrid();
}

function renderParkingGrid() {
    const grid = document.getElementById('parkingGrid');
    const levelData = parkingData[`level${currentLevel}`];

    grid.innerHTML = '';

    Object.keys(levelData).forEach(blockName => {
        const blockDiv = document.createElement('div');
        blockDiv.className = 'parking-block';

        const blockTitle = document.createElement('h4');
        blockTitle.className = 'block-title';
        blockTitle.textContent = blockName;

        const slotsGrid = document.createElement('div');
        slotsGrid.className = 'slots-grid';

        levelData[blockName].slots.forEach(slot => {
            if (currentFilter && !matchesFilter(slot)) {
                return;
            }

            const slotDiv = document.createElement('div');
            slotDiv.className = `slot ${slot.status}`;
            slotDiv.textContent = slot.id;
            slotDiv.onclick = () => showSlotModal(slot);
            slotsGrid.appendChild(slotDiv);
        });

        blockDiv.appendChild(blockTitle);
        blockDiv.appendChild(slotsGrid);
        grid.appendChild(blockDiv);
    });
}

function matchesFilter(slot) {
    if (!currentFilter) return true;
    return slot.status === currentFilter || slot.type === currentFilter;
}

function switchLevel(level) {
    currentLevel = level;

    // Update tab appearance
    document.querySelectorAll('.level-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    renderParkingGrid();
}

function filterSlots(status) {
    currentFilter = status;
    renderParkingGrid();
}

function clearFilters() {
    currentFilter = null;
    renderParkingGrid();
}

function showConfigureSlotModal(slot) {
    const modal = document.getElementById('configureSlotModal');

    // Populate form with slot data
    document.getElementById('configSlotNumber').value = slot.id;
    document.getElementById('configSlotLocation').value = slot.location || '';
    document.getElementById('configSlotBuilding').value = slot.building || '';
    document.getElementById('configSlotGroup').value = slot.group || '';
    document.getElementById('configSlotType').value = slot.type || 'normal';
    document.getElementById('configSlotStatus').value = slot.status || 'available';
    document.getElementById('configSlotNotes').value = slot.notes || '';

    modal.style.display = 'block';
}

function closeModal(modalId) {
    if (modalId) {
        document.getElementById(modalId).style.display = 'none';
    } else {
        // For backward compatibility
        document.getElementById('configureSlotModal').style.display = 'none';
        document.getElementById('addSlotModal').style.display = 'none';
    }
}

function addNewSlot() {
    const modal = document.getElementById('addSlotModal');

    // Clear form
    document.getElementById('addSlotForm').reset();

    modal.style.display = 'block';
}

function refreshData() {
    renderParkingGrid();
}

function searchSlots(query) {
    if (!query.trim()) {
        currentFilter = null;
        renderParkingGrid();
        return;
    }

    const levelData = parkingData[`level${currentLevel}`];
    const grid = document.getElementById('parkingGrid');
    grid.innerHTML = '';

    Object.keys(levelData).forEach(blockName => {
        const matchingSlots = levelData[blockName].slots.filter(slot =>
            slot.id.toLowerCase().includes(query.toLowerCase()) ||
            (slot.building && slot.building.toLowerCase().includes(query.toLowerCase())) ||
            (slot.location && slot.location.toLowerCase().includes(query.toLowerCase())) ||
            (slot.group && slot.group.toLowerCase().includes(query.toLowerCase()))
        );

        if (matchingSlots.length > 0) {
            const blockDiv = document.createElement('div');
            blockDiv.className = 'parking-block';

            const blockTitle = document.createElement('h4');
            blockTitle.className = 'block-title';
            blockTitle.textContent = blockName;

            const slotsGrid = document.createElement('div');
            slotsGrid.className = 'slots-grid';

            matchingSlots.forEach(slot => {
                const slotDiv = document.createElement('div');
                slotDiv.className = `slot ${getSlotClass(slot)}`;
                slotDiv.textContent = slot.id;
                slotDiv.onclick = () => showConfigureSlotModal(slot);
                slotsGrid.appendChild(slotDiv);
            });

            blockDiv.appendChild(blockTitle);
            blockDiv.appendChild(slotsGrid);
            grid.appendChild(blockDiv);
        }
    });
}

function filterByLocation(location) {
    if (!location) {
        clearFilters();
        return;
    }

    const levelData = parkingData[`level${currentLevel}`];
    const grid = document.getElementById('parkingGrid');
    grid.innerHTML = '';

    Object.keys(levelData).forEach(blockName => {
        const matchingSlots = levelData[blockName].slots.filter(slot =>
            slot.location && slot.location.toLowerCase() === location.toLowerCase()
        );

        if (matchingSlots.length > 0) {
            const blockDiv = document.createElement('div');
            blockDiv.className = 'parking-block';

            const blockTitle = document.createElement('h4');
            blockTitle.className = 'block-title';
            blockTitle.textContent = blockName;

            const slotsGrid = document.createElement('div');
            slotsGrid.className = 'slots-grid';

            matchingSlots.forEach(slot => {
                const slotDiv = document.createElement('div');
                slotDiv.className = `slot ${getSlotClass(slot)}`;
                slotDiv.textContent = slot.id;
                slotDiv.onclick = () => showConfigureSlotModal(slot);
                slotsGrid.appendChild(slotDiv);
            });

            blockDiv.appendChild(blockTitle);
            blockDiv.appendChild(slotsGrid);
            grid.appendChild(blockDiv);
        }
    });
}

function filterByBuilding(building) {
    if (!building) {
        clearFilters();
        return;
    }

    const levelData = parkingData[`level${currentLevel}`];
    const grid = document.getElementById('parkingGrid');
    grid.innerHTML = '';

    Object.keys(levelData).forEach(blockName => {
        const matchingSlots = levelData[blockName].slots.filter(slot =>
            slot.building && slot.building.toLowerCase() === building.toLowerCase()
        );

        if (matchingSlots.length > 0) {
            const blockDiv = document.createElement('div');
            blockDiv.className = 'parking-block';

            const blockTitle = document.createElement('h4');
            blockTitle.className = 'block-title';
            blockTitle.textContent = blockName;

            const slotsGrid = document.createElement('div');
            slotsGrid.className = 'slots-grid';

            matchingSlots.forEach(slot => {
                const slotDiv = document.createElement('div');
                slotDiv.className = `slot ${getSlotClass(slot)}`;
                slotDiv.textContent = slot.id;
                slotDiv.onclick = () => showConfigureSlotModal(slot);
                slotsGrid.appendChild(slotDiv);
            });

            blockDiv.appendChild(blockTitle);
            blockDiv.appendChild(slotsGrid);
            grid.appendChild(blockDiv);
        }
    });
}

function filterByGroup(group) {
    if (!group) {
        clearFilters();
        return;
    }

    const levelData = parkingData[`level${currentLevel}`];
    const grid = document.getElementById('parkingGrid');
    grid.innerHTML = '';

    Object.keys(levelData).forEach(blockName => {
        const matchingSlots = levelData[blockName].slots.filter(slot =>
            slot.group && slot.group.toLowerCase() === group.toLowerCase()
        );

        if (matchingSlots.length > 0) {
            const blockDiv = document.createElement('div');
            blockDiv.className = 'parking-block';

            const blockTitle = document.createElement('h4');
            blockTitle.className = 'block-title';
            blockTitle.textContent = blockName;

            const slotsGrid = document.createElement('div');
            slotsGrid.className = 'slots-grid';

            matchingSlots.forEach(slot => {
                const slotDiv = document.createElement('div');
                slotDiv.className = `slot ${getSlotClass(slot)}`;
                slotDiv.textContent = slot.id;
                slotDiv.onclick = () => showConfigureSlotModal(slot);
                slotsGrid.appendChild(slotDiv);
            });

            blockDiv.appendChild(blockTitle);
            blockDiv.appendChild(slotsGrid);
            grid.appendChild(blockDiv);
        }
    });
}

function filterByStatus(status) {
    if (status) {
        filterSlots(status);
    } else {
        clearFilters();
    }
}

// Form submission handlers
document.getElementById('addSlotForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const newSlot = {
        id: document.getElementById('slotNumber').value,
        location: document.getElementById('slotLocation').value,
        building: document.getElementById('slotBuilding').value,
        group: document.getElementById('slotGroup').value,
        type: document.getElementById('slotType').value,
        status: document.getElementById('slotInitialStatus').value,
        notes: document.getElementById('slotNotes').value
    };

    // Add to first available block (simplified logic)
    const levelData = parkingData[`level${currentLevel}`];
    const firstBlock = Object.keys(levelData)[0];
    levelData[firstBlock].slots.push(newSlot);

    closeModal('addSlotModal');
    renderParkingGrid();
    alert('Slot added successfully!');
});

document.getElementById('configureSlotForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const slotId = document.getElementById('configSlotNumber').value;
    const levelData = parkingData[`level${currentLevel}`];

    // Find and update the slot
    Object.keys(levelData).forEach(blockName => {
        const slot = levelData[blockName].slots.find(s => s.id === slotId);
        if (slot) {
            slot.location = document.getElementById('configSlotLocation').value;
            slot.building = document.getElementById('configSlotBuilding').value;
            slot.group = document.getElementById('configSlotGroup').value;
            slot.type = document.getElementById('configSlotType').value;
            slot.status = document.getElementById('configSlotStatus').value;
            slot.notes = document.getElementById('configSlotNotes').value;
        }
    });

    closeModal('configureSlotModal');
    renderParkingGrid();
    alert('Slot configuration updated successfully!');
});

// Close modal when clicking outside
window.onclick = function (event) {
    const addModal = document.getElementById('addSlotModal');
    const configModal = document.getElementById('configureSlotModal');

    if (event.target === addModal) {
        closeModal('addSlotModal');
    } else if (event.target === configModal) {
        closeModal('configureSlotModal');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initializeParkingGrid();
});
