const NOTIFICATION_BASE_OFFSET = 2.2;
const NOTIFICATION_HEIGHT = 7.0;

document.addEventListener("DOMContentLoaded", () => {
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
    badge.style.display = count > 0 ? "flex" : "none";
    // Also toggle hidden class for consistency
    badge.classList.toggle("hidden", count === 0);
  };

  /**
   * Plays a notification sound: implement only if needed
   */
  const playNotificationSound = () => {
    try {
      // Create audio element for notification sound
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaCkSW2eXBfSsPF2gWCwAA=="
      );
      audio.volume = 1; // Adjust volume as needed
      audio
        .play()
        .catch((e) => console.log("Could not play notification sound:", e));
    } catch (e) {
      console.log("Could not create notification sound:", e);
    }
  };

  /**
   * Calculates the proper position for a new notification
   * @returns {number} - The bottom position in rem
   */
  const calculateNotificationPosition = () => {
    const existingNotifs = document.querySelectorAll(".floating-notification");
    return (
      NOTIFICATION_BASE_OFFSET + existingNotifs.length * NOTIFICATION_HEIGHT
    );
  };

  /**
   * Updates positions of all existing notifications
   * Called when a notification is removed to reposition remaining ones
   */
  const updateNotificationPositions = () => {
    const notifications = document.querySelectorAll(".floating-notification");
    notifications.forEach((notification, index) => {
      const newBottom = NOTIFICATION_BASE_OFFSET + index * NOTIFICATION_HEIGHT;
      notification.style.bottom = `${newBottom}rem`;
      notification.style.transition = "bottom 0.3s ease";
    });
  };

  /**
   * Displays newly received notifications as floating containers on the UI.
   * Each container disappears after 5 seconds.
   * @param {Array} notifications - Array of notification objects.
   */

  // Keep track of displayed notification IDs
  const shownNotificationIds = new Set();

  const showFloatingNotifications = (notifications) => {
    if (!notifications || notifications.length === 0) return;

    const existingNotifs = document.querySelectorAll(".floating-notification");
    const baseOffset = 2.2;
    const spacing = 4.5;

    notifications.forEach((notification, index) => {
      // Skip if already shown
      if (shownNotificationIds.has(notification.notification_id)) return;

      // Mark as shown
      shownNotificationIds.add(notification.notification_id);

      // Play notification sound: implement if needed
      // playNotificationSound();

      const container = document.createElement("div");
      container.classList.add("floating-notification");
      container.dataset.notificationId = notification.notification_id;

      // Calculate position dynamically
      const bottomPosition = calculateNotificationPosition();
      container.style.bottom = `${bottomPosition}rem`;

      // Dynamically offset to stack
      // container.style.bottom = `calc(${baseOffset}rem + ${
      //   existingNotifs.length * spacing + index * spacing
      // }rem)`;

      container.innerHTML = `
      <div class="notification-content">
        <div class="avatar-section">
          <img src="${notification.avatar_url}" alt="avatar" class="avatar-img" />
        </div>
        <div class="info-section">
          <div class="user-name">${notification.user_name}</div>
          <div class="notification-title">${notification.title}</div>
          <div class="notification-time">1m</div>
        </div>
      </div>
    `;

      container.onclick = async () => {
        // Mark this specific notification as read
        await markSingleNotificationAsRead(notification.notification_id);

        // Update the badge count
        const currentBadge = document.querySelector(".notification-badge");
        const currentCount = parseInt(currentBadge.textContent) || 0;
        if (currentCount > 0) {
          updateNotificationBadge(currentCount - 1);
        }

        if (notification.link_url && notification.link_url.trim() !== "") {
          window.open(notification.link_url, "_blank", "noopener,noreferrer");
        }
      };

      document.body.appendChild(container);

      // Auto-dismiss after 5 seconds with smooth fade-out
      setTimeout(() => {
        container.style.animation = "fade-out 0.4s ease-out forwards";

        setTimeout(() => {
          container.remove();
          // Update positions of remaining notifications
          updateNotificationPositions();
          // Clean up from shown notifications set after a longer delay
          // to prevent re-showing the same notification too quickly
          setTimeout(() => {
            shownNotificationIds.delete(notification.notification_id);
          }, 30000); // 30 seconds delay before allowing re-show
        }, 400); // Match fade-out duration
      }, 5000);
    });
  };

  /* ------------------------------- START OF TOPBAR NOTIFICATION -------------------------------*/
  const notifToggle = document.getElementById("notificationToggle");
  const notifDropdown = document.getElementById("notificationDropdown");
  const notifList = document.querySelector(".notification-list");
  const notifBadge = document.querySelector(".notification-badge");

  let isDropdownOpen = false;
  let hasUnreadNotifications = false;

  notifToggle.addEventListener("click", async () => {
    const wasOpen = isDropdownOpen;
    isDropdownOpen = !wasOpen;

    notifDropdown.classList.toggle("hidden", !isDropdownOpen);

    if (isDropdownOpen) {
      // Dropdown opening -> load notifications
      await loadNotifications();
    } else {
      // Dropdown closing -> mark as read only if there were unread notifications
      if (hasUnreadNotifications) {
        await markNotificationsAsRead();
      }
    }
  });

  document.addEventListener("click", (event) => {
    const isClickInside =
      notifToggle.contains(event.target) ||
      notifDropdown.contains(event.target);

    if (!isClickInside && isDropdownOpen) {
      isDropdownOpen = false;
      notifDropdown.classList.add("hidden");

      // Mark as read when clicking outside if there were unread notifications
      if (hasUnreadNotifications) {
        markNotificationsAsRead();
      }
    }
  });

  const markNotificationsAsRead = async () => {
    try {
      if (!hasUnreadNotifications) return;
      await fetch("/notifications/mark-read/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        body: JSON.stringify({}),
      });

      // Update local state
      hasUnreadNotifications = false;

      // Update badge
      updateNotificationBadge(0);

      // Remove unread visual styles from list items
      notifList.querySelectorAll(".unread").forEach((item) => {
        item.classList.remove("unread");
      });
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
    }
  };

  /**
   * Marks a single notification as read
   * @param {number|string} notificationId - The ID of the notification to mark as read
   */
  const markSingleNotificationAsRead = async (notificationId) => {
    try {
      await fetch("/notifications/mark-read/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        body: JSON.stringify({ notification_id: notificationId }),
      });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const loadNotifications = async () => {
    console.log("getting notifs");
    try {
      const response = await fetch("/notifications/", {
        method: "GET",
      });

      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();
      console.log("DATA: ", data);
      notifList.innerHTML = "";

      if (data.notifications.length === 0) {
        notifList.innerHTML = `<li class="notification-item"><p class="notif-text">No notifications</p></li>`;
        hasUnreadNotifications = false;
        updateNotificationBadge(0);
        return;
      }

      // Count unread notifications
      const unreadCount = data.notifications.filter((n) => !n.is_read).length;
      hasUnreadNotifications = unreadCount > 0;

      // Update badge based on actual unread count
      updateNotificationBadge(unreadCount);

      data.notifications.forEach((notif) => {
        const li = document.createElement("li");
        li.className = `notification-item ${notif.is_read ? "" : "unread"}`;
        li.innerHTML = `
        ${
          notif.triggered_by_avatar
            ? `<div class="notif-image"><img src="${notif.triggered_by_avatar}" alt="Notification Icon" class="notif-icon" /></div>`
            : `<div class="notif-icon">${notif.title
                .charAt(0)
                .toUpperCase()}</div>`
        }
        <div class="notif-content">
          <p class="notif-text">${notif.message}</p>
          <span class="notif-time">${notif.time_ago}</span>
        </div>
      `;
        // add click handler for both read and unread notifications
        li.addEventListener("click", async () => {
          // if notification is unread, mark it as read
          if (!notif.is_read) {
            await markSingleNotificationAsRead(notif.id);

            // remove unread styling immediately
            li.classList.remove("unread");

            // update the badge count
            const currentBadge = document.querySelector(".notification-badge");
            const currentCount = parseInt(currentBadge.textContent) || 0;
            if (currentCount > 0) {
              updateNotificationBadge(currentCount - 1);
              hasUnreadNotifications = currentCount - 1 > 0;
            }
          }
          // navigate to the link if available
          if (notif.link_url) {
            window.open(notif.link_url, "_blank", "noopener,noreferrer");
          }
        });
        notifList.appendChild(li);
      });
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  /* ------------------------------- END OF TOPBAR NOTIFICATION -------------------------------*/

  // Load notifications immediately on page load
  pollNotifications();

  // Begin polling every 10 seconds
  setInterval(pollNotifications, 10000);
});
