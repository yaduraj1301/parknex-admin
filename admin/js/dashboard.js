// Dashboard JavaScript
class ParkingDashboard {
    constructor() {
        this.currentLevel = 1;
        this.slots = this.generateSampleSlots();
        this.stats = {
            total: 50,
            available: 8,
            occupied: 8,
            reserved: 10
        };
        this.weeklyData = [45, 48, 15, 46, 42, 58, 60];
        this.init();
    }

    init() {
        this.updateDateTime();
        this.setupEventListeners();
        this.renderChart();
        this.updateStats();
        this.renderParkingSlots();
        
        // Update time every second
        setInterval(() => this.updateDateTime(), 1000);
        
        // Simulate real-time updates every 30 seconds
        setInterval(() => this.simulateRealTimeUpdates(), 30000);
    }

    generateSampleSlots() {
        const slots = {};
        const statuses = ['available', 'occupied', 'reserved', 'unbooked'];
        const blocks = ['A', 'B', 'C'];
        
        blocks.forEach(block => {
            for (let i = 1; i <= 15; i++) {
                const slotId = `${block}${i.toString().padStart(2, '0')}`;
                const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
                slots[slotId] = {
                    id: slotId,
                    status: randomStatus,
                    level: Math.floor(Math.random() * 3) + 1,
                    block: block,
                    vehicle: randomStatus !== 'available' ? this.generateVehicleInfo() : null
                };
            }
        });
        
        return slots;
    }

    generateVehicleInfo() {
        const vehicles = [
            { plate: 'KL-01-AB-1234', owner: 'John Doe' },
            { plate: 'KL-02-CD-5678', owner: 'Jane Smith' },
            { plate: 'KL-03-EF-9012', owner: 'Mike Johnson' },
            { plate: 'KL-04-GH-3456', owner: 'Sarah Wilson' }
        ];
        return vehicles[Math.floor(Math.random() * vehicles.length)];
    }

    updateDateTime() {
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

    setupEventListeners() {
        // Navigation menu
        // document.querySelectorAll('.nav-link').forEach(link => {
        //     link.addEventListener('click', (e) => {
        //         e.preventDefault();
        //         this.handleNavigation(e.target.closest('.nav-link'));
        //     });
        // });

        // Level tabs
        document.querySelectorAll('.level-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchLevel(parseInt(e.target.dataset.level));
            });
        });

        // Parking slots
        document.addEventListener('click', (e) => {
            if (e.target.closest('.parking-slot')) {
                this.handleSlotClick(e.target.closest('.parking-slot'));
            }
        });

        // Alert action buttons
        document.querySelectorAll('.alert-action').forEach(button => {
            button.addEventListener('click', (e) => {
                this.handleAlertAction(e.target);
            });
        });

        // Building selector
        const buildingSelector = document.querySelector('.building-selector');
        if (buildingSelector) {
            buildingSelector.addEventListener('change', (e) => {
                this.handleBuildingChange(e.target.value);
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

    switchLevel(level) {
        this.currentLevel = level;
        
        // Update active tab
        document.querySelectorAll('.level-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-level="${level}"]`).classList.add('active');
        
        // Re-render parking slots for the selected level
        this.renderParkingSlots();
    }

    handleSlotClick(slotElement) {
        const slotId = slotElement.dataset.slot;
        const slot = this.slots[slotId];
        
        if (!slot) return;
        
        let message = `Slot: ${slotId}\nStatus: ${slot.status.toUpperCase()}\nLevel: ${slot.level}`;
        
        if (slot.vehicle) {
            message += `\nVehicle: ${slot.vehicle.plate}\nOwner: ${slot.vehicle.owner}`;
        }
        
        alert(message);
    }

    handleAlertAction(button) {
        const alertType = button.closest('.alert-card').classList.contains('attention') ? 'attention' : 'sensor';
        
        if (alertType === 'attention') {
            alert('Redirecting to unbooked vehicles management...');
        } else {
            alert('Redirecting to sensor diagnostics...');
        }
    }

    handleBuildingChange(building) {
        console.log(`Building changed to: ${building}`);
        // Here you would typically load data for the selected building
        alert(`Loading data for ${building}...`);
    }

    updateStats() {
        // Calculate stats from current slots
        const levelSlots = Object.values(this.slots).filter(slot => slot.level === this.currentLevel);
        
        const stats = {
            total: levelSlots.length,
            available: levelSlots.filter(slot => slot.status === 'available').length,
            occupied: levelSlots.filter(slot => slot.status === 'occupied').length,
            reserved: levelSlots.filter(slot => slot.status === 'reserved').length,
            unbooked: levelSlots.filter(slot => slot.status === 'unbooked').length
        };

        // Update stat cards
        const statCards = document.querySelectorAll('.stat-card');
        if (statCards.length >= 4) {
            // Total slots
            statCards[0].querySelector('.stat-number').textContent = stats.total;
            
            // Available
            const availableCard = statCards[1];
            availableCard.querySelector('.stat-number').innerHTML = `${stats.available} <span class="stat-total">/ ${stats.total}</span>`;
            availableCard.querySelector('.stat-percentage').textContent = `${Math.round(stats.available / stats.total * 100)}%`;
            
            // Occupied
            const occupiedCard = statCards[2];
            occupiedCard.querySelector('.stat-number').innerHTML = `${stats.occupied} <span class="stat-total">/ ${stats.total}</span>`;
            occupiedCard.querySelector('.stat-percentage').textContent = `${Math.round(stats.occupied / stats.total * 100)}%`;
            
            // Reserved
            const reservedCard = statCards[3];
            reservedCard.querySelector('.stat-number').innerHTML = `${stats.reserved} <span class="stat-total">/ ${stats.total}</span>`;
            reservedCard.querySelector('.stat-percentage').textContent = `${Math.round(stats.reserved / stats.total * 100)}%`;
        }

        // Update alert counts
        const attentionAlert = document.querySelector('.alert-card.attention p');
        if (attentionAlert) {
            attentionAlert.textContent = `${stats.unbooked} vehicles are parked without booking.`;
        }
    }

    renderParkingSlots() {
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
            const blockSlots = Object.values(this.slots).filter(slot => 
                slot.block === blockName && slot.level === this.currentLevel
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
        
        this.updateStats();
    }

    renderChart() {
        const canvas = document.getElementById('weeklyChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const data = this.weeklyData;
        const labels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = 300;
        
        const padding = 40;
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
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(labels[index], x + width/2, canvas.height - 10);
            
            // Draw value
            ctx.fillStyle = '#333';
            ctx.font = '11px Arial';
            ctx.fillText(value.toString(), x + width/2, y - 5);
        });
        
        // Draw Y-axis labels
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const value = Math.round((maxValue / 4) * i);
            const y = canvas.height - padding - (chartHeight / 4) * i;
            ctx.fillText(value.toString(), padding - 10, y + 3);
        }
    }

    simulateRealTimeUpdates() {
        // Randomly update a few slots
        const slotIds = Object.keys(this.slots);
        const statuses = ['available', 'occupied', 'reserved'];
        
        for (let i = 0; i < 3; i++) {
            const randomSlotId = slotIds[Math.floor(Math.random() * slotIds.length)];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            
            this.slots[randomSlotId].status = randomStatus;
            
            if (randomStatus !== 'available') {
                this.slots[randomSlotId].vehicle = this.generateVehicleInfo();
            } else {
                this.slots[randomSlotId].vehicle = null;
            }
        }
        
        // Re-render the current level
        this.renderParkingSlots();
        
        console.log('Real-time update completed');
    }

    // Public methods for external integrations
    updateSlotStatus(slotId, status, vehicleInfo = null) {
        if (this.slots[slotId]) {
            this.slots[slotId].status = status;
            this.slots[slotId].vehicle = vehicleInfo;
            this.renderParkingSlots();
        }
    }

    getSlotInfo(slotId) {
        return this.slots[slotId] || null;
    }

    getAllSlots() {
        return this.slots;
    }

    refreshData() {
        this.simulateRealTimeUpdates();
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.parkingDashboard = new ParkingDashboard();
    
    // Add global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // F5 or Ctrl+R to refresh data
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
            e.preventDefault();
            window.parkingDashboard.refreshData();
        }
        
        // Number keys 1-3 to switch levels
        if (['1', '2', '3'].includes(e.key)) {
            window.parkingDashboard.switchLevel(parseInt(e.key));
        }
    });
});

// Utility functions for external use
window.ParkingAPI = {
    updateSlot: (slotId, status, vehicleInfo) => {
        if (window.parkingDashboard) {
            window.parkingDashboard.updateSlotStatus(slotId, status, vehicleInfo);
        }
    },
    
    getSlot: (slotId) => {
        return window.parkingDashboard ? window.parkingDashboard.getSlotInfo(slotId) : null;
    },
    
    getAllSlots: () => {
        return window.parkingDashboard ? window.parkingDashboard.getAllSlots() : {};
    },
    
    refresh: () => {
        if (window.parkingDashboard) {
            window.parkingDashboard.refreshData();
        }
    }
};