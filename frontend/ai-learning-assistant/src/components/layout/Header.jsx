import { Bell, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import ThemeToggle from "../common/ThemeToggle";
import { useNotifications } from "../../context/NotificationContext";

const getPageLabel = (pathname) => {
  if (pathname.startsWith("/documents/")) return "Document workspace";
  if (pathname.startsWith("/documents")) return "Document library";
  if (pathname.startsWith("/flashcards")) return "Flashcard review";
  if (pathname.startsWith("/quizzes")) return "Quiz center";
  if (pathname.startsWith("/newspaper")) return "Newspaper";
  if (pathname.startsWith("/reports")) return "Reports";
  if (pathname.startsWith("/feedback")) return "Performance Coach";
  if (pathname.startsWith("/profile")) return "Profile";
  return "Dashboard";
};

const Header = () => {
  const location = useLocation();
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 96, right: 16 });
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    dismissNotification,
    clearNotifications,
  } = useNotifications();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    markAllAsRead();

    const updatePanelPosition = () => {
      const buttonRect = buttonRef.current?.getBoundingClientRect();
      if (!buttonRect) {
        return;
      }

      setPanelPosition({
        top: buttonRect.bottom + 12,
        right: Math.max(16, window.innerWidth - buttonRect.right),
      });
    };

    updatePanelPosition();

    const handlePointerDown = (event) => {
      const clickedInsidePanel = panelRef.current?.contains(event.target);
      const clickedBell = buttonRef.current?.contains(event.target);

      if (!clickedInsidePanel && !clickedBell) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen, markAllAsRead]);

  return (
    <header className="app-header mb-6 flex flex-col gap-4 rounded-[28px] border p-5 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-emerald-700">Learning cockpit</p>
        <h2 className="text-2xl font-semibold text-slate-950">{getPageLabel(location.pathname)}</h2>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="relative" ref={panelRef}>
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            className="relative rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 transition hover:bg-slate-50"
          >
            <Bell size={18} />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>

        </div>
      </div>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              style={{
                top: `${panelPosition.top}px`,
                right: `${panelPosition.right}px`,
              }}
              className="fixed z-[9999] w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[26px] border-2 border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)] ring-1 ring-slate-950/5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Notifications</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Stored here until you dismiss them.
                  </p>
                </div>
                {notifications.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearNotifications}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <Trash2 size={14} />
                    Clear all
                  </button>
                ) : null}
              </div>

              <div className="max-h-[440px] overflow-y-auto bg-white p-3">
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`rounded-2xl border p-4 shadow-sm ${
                          notification.read
                            ? "border-slate-200 bg-white"
                            : "border-emerald-200 bg-emerald-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold capitalize text-slate-900">
                              {notification.type}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {notification.message}
                            </p>
                            <p className="mt-2 text-xs text-slate-400">
                              {new Date(notification.createdAt).toLocaleString("en-IN")}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => dismissNotification(notification.id)}
                            className="rounded-full p-1 text-slate-400 transition hover:bg-white hover:text-slate-700"
                            aria-label="Dismiss notification"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                    <p className="text-sm font-semibold text-slate-700">No notifications yet</p>
                    <p className="mt-2 text-sm text-slate-500">
                      New success and error updates will show up here.
                    </p>
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </header>
  );
};

export default Header;
