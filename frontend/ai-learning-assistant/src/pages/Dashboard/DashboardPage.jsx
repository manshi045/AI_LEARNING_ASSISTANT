import { ArrowRight, Clock3, FileText, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Spinner from "../../components/common/Spinner";
import progressService from "../../services/progressService";
import { formatDate } from "../../utils/mockDb";

const DashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data = await progressService.getDashboardData();
        setDashboard(data);
      } catch (loadError) {
        console.error(loadError);
        setError(loadError?.message || "Could not load dashboard");
      }
    };

    loadDashboard();
  }, []);

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <p className="text-lg font-semibold">Dashboard failed to load</p>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  if (!dashboard) {
    return <Spinner label="Loading dashboard..." />;
  }

  const dashboardDocuments = Array.isArray(dashboard.documents) ? dashboard.documents : [];
  const dashboardRecentActivity = Array.isArray(dashboard.recentActivity) ? dashboard.recentActivity : [];
  const dashboardBadges = Array.isArray(dashboard.gamification?.badges) ? dashboard.gamification.badges : [];

  return (
    <div className="dashboard-page">
      <PageHeader
        badge="Progress Tracking"
        title="Your AI study dashboard"
        description="Monitor documents, generated learning assets, quiz readiness, and recent activity across the platform."
        actions={
          <Link
            to="/documents"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Open documents
            <ArrowRight size={16} />
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {dashboard.stats.map((stat) => (
          <div key={stat.label} className="dashboard-panel rounded-[28px] border p-5 shadow-lg">
            <p className="dashboard-muted text-sm font-semibold">{stat.label}</p>
            <p className="dashboard-heading mt-3 text-4xl font-semibold tracking-tight">{stat.value}</p>
            <p className="dashboard-muted mt-2 text-sm">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="dashboard-panel rounded-[28px] border p-6 shadow-lg">
          <div className="mb-5 flex items-center gap-3">
            <div className="dashboard-icon dashboard-icon-emerald rounded-2xl p-3">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="dashboard-label dashboard-label-emerald text-sm font-semibold">Recent Activity</p>
              <h3 className="dashboard-heading text-xl font-semibold">What happened lately</h3>
            </div>
          </div>

          <div className="space-y-4">
            {dashboardRecentActivity.map((item) => (
              <div
                key={item._id}
                className="dashboard-subpanel flex items-start justify-between gap-4 rounded-3xl border p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="dashboard-chip rounded-2xl p-2">
                    <Clock3 size={16} />
                  </div>
                  <div>
                    <p className="dashboard-title font-medium">{item.title}</p>
                    <p className="dashboard-muted mt-1 text-sm">{formatDate(item.createdAt)}</p>
                  </div>
                </div>
                <span className="dashboard-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                  {item.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-panel rounded-[28px] border p-6 shadow-lg">
          <div className="mb-5 flex items-center gap-3">
            <div className="dashboard-icon dashboard-icon-sky rounded-2xl p-3">
              <FileText size={18} />
            </div>
            <div>
              <p className="dashboard-label dashboard-label-sky text-sm font-semibold">Documents</p>
              <h3 className="dashboard-heading text-xl font-semibold">Continue where you left off</h3>
            </div>
          </div>

          <div className="space-y-4">
            {dashboardDocuments.slice(0, 4).map((document) => (
              <Link
                key={document._id}
                to={`/documents/${document._id}`}
                className="dashboard-subpanel block rounded-3xl border p-4 transition"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="dashboard-title font-semibold">{document.title}</p>
                    <p className="dashboard-muted mt-1 text-sm">
                      {document.cardCount} cards • {document.quizCount} quizzes
                    </p>
                  </div>
                  <ArrowRight size={16} className="dashboard-arrow" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="dashboard-panel rounded-[28px] border p-6 shadow-lg">
          <div className="mb-5 flex items-center gap-3">
            <div className="dashboard-icon dashboard-icon-violet rounded-2xl p-3">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="dashboard-label dashboard-label-violet text-sm font-semibold">Rewards</p>
              <h3 className="dashboard-heading text-xl font-semibold">Badges and points</h3>
            </div>
          </div>

          <div className="dashboard-accent dashboard-accent-violet rounded-3xl border p-5">
            <p className="dashboard-label dashboard-label-violet text-sm font-semibold">Level {dashboard.gamification.level}</p>
            <p className="dashboard-heading mt-2 text-4xl font-semibold">{dashboard.gamification.points}</p>
            <p className="dashboard-muted mt-2 text-sm">
              {dashboard.gamification.unlockedBadges} badges unlocked so far.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {dashboardBadges.slice(0, 4).map((badge) => (
              <div
                key={badge.key}
                className={`dashboard-badge rounded-3xl border p-4 ${badge.unlocked ? "dashboard-badge-unlocked" : "dashboard-badge-locked"}`}
              >
                <p className="font-semibold">{badge.title}</p>
                <p className="mt-1 text-sm leading-6">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-panel rounded-[28px] border p-6 shadow-lg">
          <div className="mb-5 flex items-center gap-3">
            <div className="dashboard-icon dashboard-icon-amber rounded-2xl p-3">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="dashboard-label dashboard-label-amber text-sm font-semibold">Next Milestone</p>
              <h3 className="dashboard-heading text-xl font-semibold">Keep going</h3>
            </div>
          </div>

          {dashboard.gamification.nextBadge ? (
            <div className="dashboard-accent dashboard-accent-amber rounded-3xl border p-5">
              <p className="dashboard-heading text-lg font-semibold">{dashboard.gamification.nextBadge.title}</p>
              <p className="dashboard-text mt-2 text-sm leading-7">
                {dashboard.gamification.nextBadge.description}
              </p>
            </div>
          ) : (
            <div className="dashboard-accent dashboard-accent-emerald rounded-3xl border p-5">
              <p className="text-lg font-semibold">All current badges unlocked</p>
              <p className="mt-2 text-sm">You have already unlocked every milestone currently available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
