import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { db } from "../../public/js/firebase-config.js";

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
  const popup = document.createElement("div");
  popup.className = "notification-popup";

  let iconClass = "fa-bell";
  if (notificationData.isCritical) {
    popup.classList.add("critical");
    iconClass = "fa-exclamation-triangle";
  } else if (notificationData.type === "booking_status") {
    popup.classList.add("warning");
    iconClass = "fa-exclamation-circle";
  }

  popup.innerHTML = `
        <div class="popup-icon">
            <i class="fas ${iconClass}"></i>
        </div>
        <div class="popup-content">
            <h4>${notificationData.type
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase())}</h4>
            <p>${notificationData.message}</p>
        </div>
        <div class="popup-close" title="Dismiss">
            &times; 
        </div>
    `;

  document.body.appendChild(popup);

  setTimeout(() => {
    popup.classList.add("show");
  }, 100);

  const dismissPopup = () => {
    popup.classList.remove("show");
    setTimeout(() => {
      if (popup) popup.remove();
    }, 500);
  };

  const autoDismissTimer = setTimeout(dismissPopup, 2000 * 30);

  const closeButton = popup.querySelector(".popup-close");
  closeButton.addEventListener("click", () => {
    clearTimeout(autoDismissTimer);
    dismissPopup();
  });
}

// ===================================================
// LISTENER 2: For Sidebar Badge
// ===================================================
document.addEventListener("DOMContentLoaded", () => {
  const notificationLink =
    document.querySelector(".user-menu") ||
    document.querySelector('.nav-link[data-section="notifications"]');

  if (notificationLink) {
    const unreadQuery = query(
      collection(db, "notifications"),
      where("isRead", "==", false)
    );

    onSnapshot(unreadQuery, (snapshot) => {
      const unreadCount = snapshot.size;
      let badgeElement = notificationLink.querySelector(".notification-badge");

      if (unreadCount > 0) {
        if (!badgeElement) {
          badgeElement = document.createElement("span");
          badgeElement.className = "notification-badge";
          notificationLink.appendChild(badgeElement);
        }
        badgeElement.textContent = unreadCount;
        setTimeout(() => badgeElement.classList.add("show"), 10);
      } else {
        if (badgeElement) {
          badgeElement.classList.remove("show");
          setTimeout(() => badgeElement.remove(), 300);
        }
      }
    });
  }
});
