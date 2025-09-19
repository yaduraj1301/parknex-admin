import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBh0XI8p736BK2Zn-PuC9r2FbDNBSddWRE",
  authDomain: "parknex-admin.firebaseapp.com",
  projectId: "parknex-admin",
  storageBucket: "parknex-admin.firebasestorage.app",
  messagingSenderId: "1018594733850",
  appId: "1:1018594733850:web:91a7f78628eb5e089846a3",
  measurementId: "G-0ETW3XZN2E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Mappings for UI display ---
const notificationTypeMap = {
    unauthorized_parking: { title: 'Unauthorized parking detected', cssClass: 'critical', icon: 'fa-exclamation-triangle', tag: 'Unauthorized parking', tagClass: 'tag-red' },
    booking_status: { title: 'Major Slots booked Alert', cssClass: 'warning', icon: 'fa-exclamation-circle', tag: 'Booking Status', tagClass: 'tag-orange' },
    pre_book_confirmation: { title: 'Pre-booking Confirmed', cssClass: 'success', icon: 'fa-check-circle', tag: 'Pre-book Confirmation', tagClass: 'tag-green' },
    slot_status: { title: 'Slot Status Update', cssClass: 'info', icon: 'fa-info-circle', tag: 'Slot Status', tagClass: 'tag-gray' },
    system_malfunction: { title: 'System Malfunction', cssClass: 'critical', icon: 'fa-tools', tag: 'System Alert', tagClass: 'tag-red' }
};

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const criticalCountEl = document.getElementById('critical-count');
    const unreadCountEl = document.getElementById('unread-count');
    const todayCountEl = document.getElementById('today-count');
    const notificationListEl = document.getElementById('notification-list');
    const filterTypeEl = document.getElementById('filter-type');
    const filterStatusEl = document.getElementById('filter-status');
    const filterDateEl = document.getElementById('filter-date');
    const markAllReadBtn = document.getElementById('mark-all-read-btn');

    let allNotifications = []; // Cache for all fetched notifications

    // --- Main function to fetch and render data ---
    async function fetchAndRenderNotifications() {
        // ... this function is unchanged ...
        try {
            const notificationsRef = collection(db, 'notifications');
            const q = query(notificationsRef, orderBy('timestamp', 'desc'));
            const querySnapshot = await getDocs(q);
            
            allNotifications = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            updateSummaryCards(allNotifications);
            applyFilters(); 

        } catch (error) {
            console.error("Error fetching notifications: ", error);
            notificationListEl.innerHTML = '<p>Error loading notifications. Please try again later.</p>';
        }
    }

    // --- Update the three summary cards ---
    function updateSummaryCards(notifications) {
        // ... this function is unchanged ...
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
        // ... this function is unchanged ...
        if (!notifications.length) {
            notificationListEl.innerHTML = '<p>No notifications match the current filters.</p>';
            return;
        }

        let notificationsHTML = '';
        notifications.forEach(notif => {
            const config = notificationTypeMap[notif.type] || { title: 'Notification', cssClass: 'info', icon: 'fa-bell', tag: 'General', tagClass: 'tag-gray' };
            
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
                            <i class="fas fa-clock"></i> ${notif.timestamp ? formatTimeAgo(notif.timestamp.toDate()) : 'No date'}
                            ${!notif.isRead ? '<span class="badge-new">New</span>' : ''}
                        </div>
                    </div>
                    ${!notif.isRead ? `<a href="#" class="notification-mark-read" data-id="${notif.id}"><i class="fas fa-check"></i> Mark as Read</a>` : ''}
                </div>
            `;
        });
        notificationListEl.innerHTML = notificationsHTML;
    }

    // --- Handle filtering ---
    function applyFilters() {
        const type = filterTypeEl.value;
        const status = filterStatusEl.value;
        const dateFilter = filterDateEl.value;

        let filteredNotifications = allNotifications;

        // Filter by Type
        if (type !== 'all') {
            filteredNotifications = filteredNotifications.filter(n => n.type === type);
        }

        // Filter by Read/Unread Status
        if (status !== 'all') {
            const isRead = status === 'read';
            filteredNotifications = filteredNotifications.filter(n => n.isRead === isRead);
        }
        
        // Filter by Date
        if (dateFilter !== 'all') {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfYesterday = new Date(startOfToday);
            startOfYesterday.setDate(startOfYesterday.getDate() - 1);

            if (dateFilter === 'today') {
                filteredNotifications = filteredNotifications.filter(n => {
                    // BUG FIX: Check if timestamp exists before using it
                    return n.timestamp && n.timestamp.toDate() >= startOfToday;
                });
            } else if (dateFilter === 'yesterday') {
                filteredNotifications = filteredNotifications.filter(n => {
                    // BUG FIX: Check if timestamp exists before using it
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
        // ... this function is unchanged ...
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;


        if (interval > 1){

            if(Math.floor(interval) > 1){
                return Math.floor(interval) + " years ago";
            }
            return Math.floor(interval) + " year ago";
        }
        interval = seconds / 2592000;


        if (interval > 1){
            if (Math.floor(interval) > 1){
                return Math.floor(interval) + " months ago";
            }
            return Math.floor(interval) + " month ago";
        } 
        interval = seconds / 86400;


        if (interval > 1){
            if (Math.floor(interval) > 1){
                return Math.floor(interval) + " days ago";
            }
            return Math.floor(interval) + " day ago";
        } 
        interval = seconds / 3600;

        if (interval > 1){

            if ((Math.floor(interval)) > 1){
                return Math.floor(interval) + " hours ago";
            }
            return Math.floor(interval) + " hour ago";

        } 
        interval = seconds / 60;


        if (interval > 1){

            if(Math.floor(interval) > 1){
                return Math.floor(interval) + " minutes ago";
            }
            return Math.floor(interval) + " minute ago";
        }

        if(Math.floor(seconds) > 1){
            return Math.floor(seconds) + " seconds ago";
        }
        return Math.floor(seconds) + " second ago";
    }

    // --- Mark as Read Logic ---
    async function markSingleAsRead(notificationId) {
        try {
            const notifRef = doc(db, 'notifications', notificationId);
            await updateDoc(notifRef, {
                isRead: true
            });
            console.log(`Notification ${notificationId} marked as read.`);
            // Refresh all data from Firestore to ensure UI is in sync
            await fetchAndRenderNotifications();
        } catch (error) {
            console.error("Error updating notification: ", error);
        }
    }

    // --- Mark ALL notifications as read ---
    async function markAllAsRead() {
        try {
            const unreadNotifications = allNotifications.filter(n => !n.isRead);
            if (unreadNotifications.length === 0) {
                console.log("No unread notifications to mark.");
                return;
            }

            const updatePromises = unreadNotifications.map(notif => {
                const notifRef = doc(db, 'notifications', notif.id);
                return updateDoc(notifRef, { isRead: true });
            });
            
            await Promise.all(updatePromises);
            console.log("All notifications marked as read.");
            await fetchAndRenderNotifications();

        } catch (error) {
            console.error("Error marking all notifications as read: ", error);
        }
    }

    // --- Event Listeners ---
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
            if (notificationId) {
                markSingleAsRead(notificationId);
            }
        }
    });

    // --- Initial Load ---
    fetchAndRenderNotifications();
});