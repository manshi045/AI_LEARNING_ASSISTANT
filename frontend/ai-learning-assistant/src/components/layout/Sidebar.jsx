import {
  BarChart3,
  BookOpen,
  Brain,
  ChartColumnBig,
  FileText,
  Lightbulb,
  LogOut,
  Newspaper,
  Sparkles,
  UserCircle2,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

const navItems = [
  { to: "/", label: "Dashboard", icon: BarChart3 },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/flashcards", label: "Flashcards", icon: Brain },
  { to: "/quizzes", label: "Quizzes", icon: BookOpen },
  { to: "/newspaper", label: "Newspaper", icon: Newspaper },
  { to: "/reports", label: "Reports", icon: ChartColumnBig },
  { to: "/feedback", label: "Performance Coach", icon: Lightbulb },
  { to: "/profile", label: "Profile", icon: UserCircle2 },
];

const Sidebar = () => {
  const { logout, user } = useAuth();

  return (
    <aside className="app-sidebar flex h-full flex-col rounded-[28px] border p-5 shadow-2xl">
      <div className="mb-8">
        <div className="app-sidebar-badge inline-flex items-center gap-3 rounded-2xl px-3 py-2 backdrop-blur">
          <div className="app-sidebar-badge-icon rounded-2xl p-2">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold">AI Learning Assistant</p>
            <p className="app-sidebar-subtitle text-xs">Study smarter, faster</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `app-sidebar-link flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "app-sidebar-link-active shadow-lg"
                  : "app-sidebar-link-inactive"
              }`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="app-sidebar-user mt-6 rounded-3xl border p-4">
        <p className="text-sm font-semibold">{user?.name || "Learner"}</p>
        <p className="app-sidebar-subtitle mt-1 text-xs">{user?.email}</p>
        <button
          type="button"
          onClick={logout}
          className="app-sidebar-logout mt-4 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
