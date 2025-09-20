import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, query, onSnapshot, where, Timestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// IMPORTANT: This firebaseConfig must be the same one used in your other script.js
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

// --- Real-time listener for NEW notifications ---
const q = query(
    collection(db, "notifications"), 
    where("timestamp", ">", Timestamp.now())
);

onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
            console.log("New notification received: ", change.doc.data());
            showNotificationPopup(change.doc.data());
        }
    });
});

// --- MODIFIED Function to create and show the pop-up ---
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