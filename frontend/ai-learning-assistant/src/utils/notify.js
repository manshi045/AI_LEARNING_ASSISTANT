const STORAGE_KEY = "aila_notifications";
const EVENT_NAME = "aila:notification-added";
const MAX_NOTIFICATIONS = 30;

const readNotifications = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeNotifications = (notifications) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
};

const pushNotification = (type, message) => {
  const entry = {
    id: `notification_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    message: typeof message === "string" ? message : "New notification",
    createdAt: Date.now(),
    read: false,
  };

  const updated = [entry, ...readNotifications()].slice(0, MAX_NOTIFICATIONS);
  writeNotifications(updated);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: entry }));
  return entry.id;
};

const toast = {
  success(message) {
    return pushNotification("success", message);
  },
  error(message) {
    return pushNotification("error", message);
  },
  loading(message) {
    return pushNotification("loading", message);
  },
  dismiss() {},
  remove() {},
};

export const NOTIFICATION_EVENT_NAME = EVENT_NAME;
export const NOTIFICATION_STORAGE_KEY = STORAGE_KEY;
export default toast;
