document.addEventListener("DOMContentLoaded", () => {
  console.log("hello world!");

  /**
   * Polls the backend for recent unread notifications.
   * Updates the UI with floating notifications and unread badge count.
   */

  const pollNotifications = () => {
    fetch("/poll-notifications/", {
      method: "GET",
      headers: {
        "X-CSRFToken": csrftoken,
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        updateNotificationBadge(data.unread_count);
        console.log("unread: ", data.unread_count);
        console.log("Debug info:", data.debug_info);
        showFloatingNotifications(data.notifications);
      })
      .catch((error) => {
        console.error("Notification polling failed", error);
      });
  };

  /**
   * Updates the notification badge with the count of unread items.
   * Hides the badge if the count is 0.
   * @param {number} count - Number of unread notifications.
   */
  const updateNotificationBadge = (count) => {
    const badge = document.querySelector(".notification-badge");
    if (!badge) return;

    badge.textContent = count > 0 ? count : "";
    badge.style.display = count > 0 ? "inline-block" : "none";
  };

  /**
   * Displays newly received notifications as floating containers on the UI.
   * Each container disappears after 5 seconds.
   * @param {Array} notifications - Array of notification objects.
   */

  // Keep track of displayed notification IDs
  const shownNotificationIds = new Set();

  const showFloatingNotifications = (notifications) => {
    console.log("floating notif");

    const existingNotifs = document.querySelectorAll(".floating-notification");
    const baseOffset = 2.2;
    const spacing = 4.5;

    notifications.forEach((notification, index) => {
      // Skip if already shown
      if (shownNotificationIds.has(notification.notification_id)) return;

      // Mark as shown
      shownNotificationIds.add(notification.notification_id);

      const container = document.createElement("div");
      container.classList.add("floating-notification");

      // Dynamically offset to stack
      container.style.bottom = `calc(${baseOffset}rem + ${
        existingNotifs.length * spacing + index * spacing
      }rem)`;

      console.log("Notification data:", notification);

      container.innerHTML = `
      <div class="notification-content">
        <div class="avatar-section">
          <img src="${notification.avatar_url}" alt="avatar" class="avatar-img" />
        </div>
        <div class="info-section">
          <div class="user-name">${notification.user_name}</div>
          <div class="notification-title">${notification.title}</div>
          <div class="notification-time">1ms</div>
        </div>
      </div>
    `;

      container.onclick = () => {
        if (notification.link_url) {
          window.location.href = notification.link_url;
        }
      };

      document.body.appendChild(container);

      // Auto-dismiss after 5 seconds with smooth fade-out
      setTimeout(() => {
        container.style.animation = "fade-out 0.4s ease-out forwards";

        setTimeout(() => {
          container.remove();
        }, 400); // Match fade-out duration
      }, 5000);
    });
  };

  // Begin polling every 10 seconds
  setInterval(pollNotifications, 10000);
});
