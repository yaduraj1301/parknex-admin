import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, query, onSnapshot, where, Timestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// IMPORTANT: This firebaseConfig must be the same one used in your other script.js
const firebaseConfig = {
  apiKey: "AIzaSyBDG2sJZF5Z2T3ABa0bJ_dOF2E_CDZvRFk",
  authDomain: "parknex-e6cea.firebaseapp.com",
  projectId: "parknex-e6cea",
  storageBucket: "parknex-e6cea.firebasestorage.app",
  messagingSenderId: "830756459271",
  appId: "1:830756459271:web:f2c5591a282887a10b6ba2",
  measurementId: "G-VN0P6KKP50"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===================================================
// LISTENER 1: For the Real-time Pop-up Alert
// ===================================================
const newNotificationsQuery = query(
    collection(db, "notifications"), 
    where("timestamp", ">", Timestamp.now())
);

onSnapshot(newNotificationsQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
            showNotificationPopup(change.doc.data());
        }
    });
});

function showNotificationPopup(notificationData) {
    // 1. Create the pop-up element
    const popup = document.createElement('div');
    popup.className = 'notification-popup';
    
    // 2. Determine style based on notification type
    let iconClass = 'fa-bell';
    if (notificationData.isCritical) {
        popup.classList.add('critical');
        iconClass = 'fa-exclamation-triangle';
    } else if (notificationData.type === 'booking_status') {
        popup.classList.add('warning');
        iconClass = 'fa-exclamation-circle';
    }

    // 3. Populate with notification content, NOW INCLUDING a close button
    popup.innerHTML = `
        <div class="popup-icon">
            <i class="fas ${iconClass}"></i>
        </div>
        <div class="popup-content">
            <h4>${notificationData.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
            <p>${notificationData.message}</p>
        </div>
        <div class="popup-close" title="Dismiss">
            &times; 
        </div>
    `;
    // Note: Using &times; is a lightweight way to create a 'x' symbol.

    // 4. Add to the page
    document.body.appendChild(popup);

    // 5. Animate in
    setTimeout(() => {
        popup.classList.add('show');
    }, 100);

    // --- NEW LOGIC for dismissing the pop-up ---

    // Function to handle the dismissal animation and removal
    const dismissPopup = () => {
        popup.classList.remove('show');
        setTimeout(() => {
            if (popup) popup.remove();
        }, 500); // This delay should match the transition time in CSS
    };

    // 6. Set timer for auto-dismissal
    const autoDismissTimer = setTimeout(dismissPopup, 2000*30); // Auto-dismiss after 2 seconds

    // 7. Add click listener to the close button
    const closeButton = popup.querySelector('.popup-close');
    closeButton.addEventListener('click', () => {
        // When clicked, cancel the automatic timer and dismiss immediately
        clearTimeout(autoDismissTimer);
        dismissPopup();
    });
}

// ===================================================
// LISTENER 2: For Dynamically Creating/Removing the Sidebar Badge
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
    // Get the parent link where the badge will be added
    const notificationLink = document.querySelector('.nav-link[data-section="notifications"]');

    if (notificationLink) {
        const unreadQuery = query(
            collection(db, "notifications"),
            where("isRead", "==", false)
        );

        onSnapshot(unreadQuery, (snapshot) => {
            const unreadCount = snapshot.size;
            // Try to find the badge in case it already exists
            let badgeElement = notificationLink.querySelector('.notification-badge');

            if (unreadCount > 0) {
                // If the badge doesn't exist, create it
                if (!badgeElement) {
                    badgeElement = document.createElement('span');
                    badgeElement.className = 'notification-badge';
                    notificationLink.appendChild(badgeElement);
                }
                
                // Update the count and make it visible
                badgeElement.textContent = unreadCount;
                // Use a tiny timeout to ensure the CSS transition fires correctly on creation
                setTimeout(() => {
                    badgeElement.classList.add('show');
                }, 10);

            } else {
                // If the badge exists and the count is zero, remove it
                if (badgeElement) {
                    badgeElement.classList.remove('show');
                    // Wait for the fade-out animation to finish before removing from the DOM
                    setTimeout(() => {
                        badgeElement.remove();
                    }, 300); // This duration should match your CSS transition time
                }
            }
        });
    }
});