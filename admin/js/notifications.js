// Import onSnapshot for real-time updates
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, doc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBDG2sJZF5Z2T3ABa0bJ_dOF2E_CDZvRFk",
  authDomain: "parknex-e6cea.firebaseapp.com",
  projectId: "parknex-e6cea",
  storageBucket: "parknex-e6cea.firebasestorage.app",
  messagingSenderId: "830756459271",
  appId: "1:830756459271:web:f2c5591a282887a10b6ba2",
  measurementId: "G-VN0P6KKP50"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Mappings for UI display ---
const notificationTypeMap = {
    unauthorized_parking: { title: 'Unauthorized parking detected', cssClass: 'critical', icon: 'fa-exclamation-triangle', tag: 'Unauthorized parking', tagClass: 'tag-red' },
    booking_status: { title: 'Slot status', cssClass: 'warning', icon: 'fa-exclamation-circle', tag: 'Booking Status', tagClass: 'tag-orange' },
    pre_book_confirmation: { title: 'Pre-booking Confirmed', cssClass: 'success', icon: 'fa-check-circle', tag: 'Pre-book Confirmation', tagClass: 'tag-green' },
    reports: { title: 'Reports', cssClass: 'info', icon: 'fa-info-circle', tag: 'Reports', tagClass: 'tag-gray' },
    system_malfunction: { title: 'System Malfunction', cssClass: 'critical', icon: 'fa-tools', tag: 'System Alert', tagClass: 'tag-red' }
};

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors (FIXED) ---
    const criticalCountEl = document.getElementById('critical-count');
    const unreadCountEl = document.getElementById('unread-count');
    const todayCountEl = document.getElementById('today-count');
    const notificationListEl = document.getElementById('notification-list');
    const filterBuilding = document.getElementById('filter-building');
    const filterTypeEl = document.getElementById('filter-type');
    const filterStatusEl = document.getElementById('filter-status');
    const filterDateEl = document.getElementById('filter-date');
    const markAllReadBtn = document.getElementById('mark-all-read-btn');
    
    let allNotifications = []; // Cache for all fetched notifications

    // --- Sets up a REAL-TIME LISTENER ---
    function setupNotificationListener() {
        const notificationsRef = collection(db, 'notifications');
        const q = query(notificationsRef, orderBy('timestamp', 'desc'));

        onSnapshot(q, (querySnapshot) => {
            console.log("Notification data updated in real-time!");
            allNotifications = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateSummaryCards(allNotifications);
            applyFilters();
        }, (error) => {
            console.error("Error with real-time listener: ", error);
            notificationListEl.innerHTML = '<p>Error loading notifications. Please try again later.</p>';
        });
    }

    // --- Update the three summary cards ---
    function updateSummaryCards(notifications) {
        const unreadCount = notifications.filter(n => !n.isRead).length;
        const criticalCount = notifications.filter(n => n.isCritical && !n.isRead).length;
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);
        const todayCount = notifications.filter(n => n.timestamp && n.timestamp.toDate() > twentyFourHoursAgo).length;

        criticalCountEl.textContent = criticalCount;
        unreadCountEl.textContent = unreadCount;
        todayCountEl.textContent = todayCount;
    }
    
    // --- Render the list of notifications ---
    function renderNotifications(notifications) {
        if (!notifications.length) {
            notificationListEl.innerHTML = '<p>No notifications match the current filters.</p>';
            return;
        }

        let notificationsHTML = '';
        notifications.forEach(notif => {
            const config = notificationTypeMap[notif.type] || { title: 'Notification', cssClass: 'info', icon: 'fa-bell', tag: 'General', tagClass: 'tag-gray' };
            
            // ===================================================
            // NEW LOGIC: Generate action buttons based on notification type
            // ===================================================
            let actionsHTML = '';
            switch (notif.type) {
                case 'unauthorized_parking':
                    actionsHTML = `
                        <a href="#" class="action-btn btn-blue"><i class="fas fa-search"></i> Inspect slot</a>
                        <a href="#" class="action-btn btn-purple"><i class="fas fa-shield-alt"></i> Escalate to Security</a>
                    `;
                    break;
                case 'booking_status':
                case 'pre_book_confirmation':
                    actionsHTML = `
                        <a href="#" class="action-btn btn-dark"><i class="fas fa-eye"></i> View Bookings</a>
                    `;
                    break;
                // Add other cases here for future button types
            }

            // Prepare the timestamp part of the HTML
            let timeMetaHTML = 'No date';
            if (notif.timestamp) {
                const date = notif.timestamp.toDate();
                timeMetaHTML = `<span class="time-ago" data-timestamp="${date.toISOString()}">${formatTimeAgo(date)}</span>`;
            }

            notificationsHTML += `
                <div class="notification-item notification-item--${config.cssClass}">
                    <div class="notification-icon"><i class="fas ${config.icon}"></i></div>
                    <div class="notification-content">
                        <div class="notification-header">
                            <h4>${config.title}</h4>
                            <span class="tag ${config.tagClass}">${config.tag}</span>
                        </div>
                        <p>${notif.message}</p>
                        <div class="notification-meta">
                            <i class="fas fa-clock"></i> ${timeMetaHTML}
                            ${!notif.isRead ? '<span class="badge-new">New</span>' : ''}
                        </div>
                        
                        <!-- Conditionally render the actions container -->
                        ${actionsHTML ? `<div class="notification-actions">${actionsHTML}</div>` : ''}

                    </div>
                    ${!notif.isRead ? `<a href="#" class="notification-mark-read" data-id="${notif.id}"><i class="fas fa-check"></i> Mark as Read</a>` : ''}
                </div>
            `;
        });
        notificationListEl.innerHTML = notificationsHTML;
    }


    // --- Handle filtering ---
    function applyFilters() {
        // ... (This function remains unchanged and correct)
        const building = filterBuilding.value;
        const type = filterTypeEl.value;
        const status = filterStatusEl.value;
        const dateFilter = filterDateEl.value;

        let filteredNotifications = allNotifications;

        if (building !== 'all'){
            filteredNotifications = filteredNotifications.filter(n => n.building === building);
        }
        if (type !== 'all') {
            filteredNotifications = filteredNotifications.filter(n => n.type === type);
        }
        if (status !== 'all') {
            const isRead = status === 'read';
            filteredNotifications = filteredNotifications.filter(n => n.isRead === isRead);
        }
        if (dateFilter !== 'all') {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfYesterday = new Date(startOfToday);
            startOfYesterday.setDate(startOfYesterday.getDate() - 1);
            if (dateFilter === 'today') {
                filteredNotifications = filteredNotifications.filter(n => n.timestamp && n.timestamp.toDate() >= startOfToday);
            } else if (dateFilter === 'yesterday') {
                filteredNotifications = filteredNotifications.filter(n => {
                    if (!n.timestamp) return false;
                    const notifDate = n.timestamp.toDate();
                    return notifDate >= startOfYesterday && notifDate < startOfToday;
                });
            }
        }
        renderNotifications(filteredNotifications);
    }
    
    // --- Helper function for time formatting ---
    function formatTimeAgo(date) {
        // Your improved singular/plural logic is good!
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) {
            const count = Math.floor(interval);
            return count > 1 ? `${count} years ago` : `${count} year ago`;
        }
        interval = seconds / 2592000;
        if (interval > 1) {
            const count = Math.floor(interval);
            return count > 1 ? `${count} months ago` : `${count} month ago`;
        }
        interval = seconds / 86400;
        if (interval > 1) {
            const count = Math.floor(interval);
            return count > 1 ? `${count} days ago` : `${count} day ago`;
        }
        interval = seconds / 3600;
        if (interval > 1) {
            const count = Math.floor(interval);
            return count > 1 ? `${count} hours ago` : `${count} hour ago`;
        }
        interval = seconds / 60;
        if (interval > 1) {
            const count = Math.floor(interval);
            return count > 1 ? `${count} minutes ago` : `${count} minute ago`;
        }
        const count = Math.floor(seconds);
        return count > 1 || count === 0 ? `${count} seconds ago` : `${count} second ago`;
    }

    function updateTimestamps() {
        const timeElements = document.querySelectorAll('.time-ago');
        timeElements.forEach(element => {
            const timestamp = element.dataset.timestamp;
            if (timestamp) {
                const date = new Date(timestamp);
                element.textContent = formatTimeAgo(date);
            }
        });
    }

    // --- Mark as Read Logic (FIXED) ---
    async function markSingleAsRead(notificationId) {
        try {
            const notifRef = doc(db, 'notifications', notificationId);
            await updateDoc(notifRef, { isRead: true });
            console.log(`Notification ${notificationId} marked as read.`);
            // No need to refetch, onSnapshot will handle the UI update automatically!
        } catch (error) {
            console.error("Error updating notification: ", error);
        }
    }

    async function markAllAsRead() {
        try {
            const unreadNotifications = allNotifications.filter(n => !n.isRead);
            if (unreadNotifications.length === 0) return;

            const updatePromises = unreadNotifications.map(notif => {
                const notifRef = doc(db, 'notifications', notif.id);
                return updateDoc(notifRef, { isRead: true });
            });
            await Promise.all(updatePromises);
            console.log("All notifications marked as read.");
            // No need to refetch, onSnapshot will handle the UI update automatically!
        } catch (error) {
            console.error("Error marking all notifications as read: ", error);
        }
    }

    // --- Event Listeners (Cleaned up) ---
    filterBuilding.addEventListener('change', applyFilters);
    filterTypeEl.addEventListener('change', applyFilters);
    filterStatusEl.addEventListener('change', applyFilters);
    filterDateEl.addEventListener('change', applyFilters);
    
    markAllReadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        markAllAsRead();
    });
    
    notificationListEl.addEventListener('click', (e) => {
        const target = e.target.closest('.notification-mark-read');
        if (target) {
            e.preventDefault();
            const notificationId = target.dataset.id;
            if (notificationId) markSingleAsRead(notificationId);
        }
    });

    // --- Initial Load ---
    setupNotificationListener(); 

    setInterval(updateTimestamps, 10000);
});