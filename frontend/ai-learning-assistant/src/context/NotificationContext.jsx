/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  NOTIFICATION_EVENT_NAME,
  NOTIFICATION_STORAGE_KEY,
} from "../utils/notify";

const NotificationContext = createContext(null);
const MAX_NOTIFICATIONS = 30;

const getInitialNotifications = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(getInitialNotifications);

  useEffect(() => {
    window.localStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      JSON.stringify(notifications),
    );
  }, [notifications]);

  useEffect(() => {
    const syncNotifications = () => {
      setNotifications(getInitialNotifications().slice(0, MAX_NOTIFICATIONS));
    };

    window.addEventListener(NOTIFICATION_EVENT_NAME, syncNotifications);
    window.addEventListener("storage", syncNotifications);

    return () => {
      window.removeEventListener(NOTIFICATION_EVENT_NAME, syncNotifications);
      window.removeEventListener("storage", syncNotifications);
    };
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((item) => !item.read).length,
      markAllAsRead() {
        setNotifications((current) =>
          current.map((item) => ({ ...item, read: true })),
        );
      },
      dismissNotification(id) {
        setNotifications((current) => current.filter((item) => item.id !== id));
      },
      clearNotifications() {
        setNotifications([]);
      },
    }),
    [notifications],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }

  return context;
};
