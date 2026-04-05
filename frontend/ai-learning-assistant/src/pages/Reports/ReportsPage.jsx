import { BarChart3, BookOpenCheck, Brain, FileText, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Spinner from "../../components/common/Spinner";
import progressService from "../../services/progressService";
import { formatDate } from "../../utils/mockDb";

const insightCards = [
  {
    key: "flashcards",
    title: "Flashcard Progress",
    icon: Brain,
    accent: "bg-emerald-50 text-emerald-700 border-emerald-200",
    getText: (overview) =>
      `${overview.reviewedFlashcards} out of ${overview.totalFlashcards} flashcards have been reviewed at least once.`,
    getSubtext: (overview) =>
      `${overview.flashcardCompletionRate}% completion • ${overview.flashcardReviewActions ?? 0} total study actions.`,
  },
  {
    key: "quizzes",
    title: "Quiz Performance",
    icon: Trophy,
    accent: "bg-rose-50 text-rose-700 border-rose-200",
    getText: (overview) =>
      `${overview.completedQuizzes} quizzes completed with an average score of ${overview.averageScore}%.`,
    getSubtext: (overview) => `${overview.quizCompletionRate}% of created quizzes have been attempted.`,
  },
];

const ReportsPage = () => {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReport = async () => {
      try {
        const data = await progressService.getReportData();
        setReport(data);
      } catch (loadError) {
        console.error(loadError);
        setError(loadError?.message || "Could not load report");
      }
    };

    loadReport();
  }, []);

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <p className="text-lg font-semibold">Report failed to load</p>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  if (!report) {
    return <Spinner label="Preparing total report..." />;
  }

  const { overview, highlights, breakdown, recentActivity } = report;

  return (
    <div>
      <PageHeader
        badge="Total Report"
        title="Your full study progress report"
        description="Track how many flashcards you have studied, how many quizzes you have completed, your average performance, and the overall learning progress snapshot."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {highlights.map((item) => (
          <div key={item.label} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/40">
            <p className="text-sm font-semibold text-slate-500">{item.label}</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{item.value}</p>
            <p className="mt-2 text-sm text-slate-500">{item.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-violet-700">Gamification</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              {report.gamification.points} points • Level {report.gamification.level}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {report.gamification.unlockedBadges} badges unlocked through your study activity.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {report.gamification.badges.map((badge) => (
            <div
              key={badge.key}
              className={`rounded-3xl border p-4 ${badge.unlocked ? badge.tone : "border-slate-200 bg-slate-50 text-slate-500"}`}
            >
              <p className="font-semibold">{badge.title}</p>
              <p className="mt-1 text-sm">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="app-hero-card rounded-[30px] border border-slate-200 p-6 shadow-2xl shadow-slate-900/10">
          <div className="flex items-center gap-3">
            <div className="app-hero-side rounded-2xl p-3">
              <BarChart3 size={18} />
            </div>
            <div>
              <p className="app-hero-side-title text-sm font-semibold">Progress Summary</p>
              <h2 className="text-2xl font-semibold tracking-tight">Overall learning snapshot</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="app-hero-side rounded-[24px] border p-4">
              <div className="app-hero-side-title flex items-center gap-2">
                <FileText size={16} />
                <p className="text-sm font-semibold">Study Material</p>
              </div>
              <p className="mt-4 text-3xl font-semibold">{overview.totalDocuments}</p>
              <p className="app-hero-muted mt-2 text-sm">Documents uploaded into your workspace</p>
            </div>

            <div className="app-hero-side rounded-[24px] border p-4">
              <div className="app-hero-side-title flex items-center gap-2">
                <BookOpenCheck size={16} />
                <p className="text-sm font-semibold">Revision Assets</p>
              </div>
              <p className="mt-4 text-3xl font-semibold">{overview.totalFlashcardSets}</p>
              <p className="app-hero-muted mt-2 text-sm">Flashcard sets generated for practice</p>
            </div>
          </div>

          <div className="app-hero-side mt-6 rounded-[24px] border p-5">
            <p className="app-hero-side-title text-sm font-semibold">Report Insight</p>
            <p className="app-hero-text mt-3 text-sm leading-7">
              You have completed {overview.flashcardReviewActions ?? 0} flashcard study actions across{" "}
              {overview.reviewedFlashcards} unique flashcards, completed {overview.completedQuizzes} quizzes,
              and maintained a {overview.studyStreak}-day study streak. This report gives you one place to see your
              total progress across the learning assistant.
            </p>
          </div>
        </div>

        <div className="grid gap-5">
          {insightCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.key} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
                <div className="flex items-center gap-3">
                  <div className={`rounded-2xl border p-3 ${card.accent}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{card.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{card.getSubtext(overview)}</p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-slate-700">{card.getText(overview)}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
          <p className="text-xl font-semibold text-slate-950">Report Breakdown</p>
          <div className="mt-5 grid gap-4">
            {breakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{item.value}</p>
                </div>
                <div className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${item.tone}`}>
                  Total
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
          <p className="text-xl font-semibold text-slate-950">Recent Report Activity</p>
          <div className="mt-5 space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((item) => (
                <div key={item._id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.meta}</p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No recent progress activity yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
