import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import progressService from "../../services/progressService";
import toast from "../../utils/notify";

const toneMap = {
  High: "border-rose-200 bg-rose-50 text-rose-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  Maintain: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const FeedbackPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPerformanceFeedback = async () => {
      try {
        setLoading(true);
        const report = await progressService.getReportData();
        setData(report);
      } catch (error) {
        toast.error(error.message || "Could not load performance feedback");
      } finally {
        setLoading(false);
      }
    };

    loadPerformanceFeedback();
  }, []);

  const feedback = data?.performanceFeedback;
  const overview = data?.overview || {};

  return (
    <div>
      <PageHeader
        badge="Performance Coach"
        title="How to improve your performance"
        description="This page reads your report and tells you what to improve next so your score, revision quality and consistency keep getting better."
      />

      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-lg shadow-slate-200/40">
          Building your improvement plan...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/40">
              <p className="text-sm text-slate-500">Average Quiz Score</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{overview.averageScore || 0}%</p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/40">
              <p className="text-sm text-slate-500">Flashcard Completion</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{overview.flashcardCompletionRate || 0}%</p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/40">
              <p className="text-sm text-slate-500">Quiz Completion</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{overview.quizCompletionRate || 0}%</p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/40">
              <p className="text-sm text-slate-500">Study Streak</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{overview.studyStreak || 0} day(s)</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
            <p className="text-xl font-semibold text-slate-950">Your main improvement advice</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {feedback?.summary || "Keep using your reports to identify weak areas and revise them consistently."}
            </p>
            <div className="mt-5 rounded-3xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
              {feedback?.nextMilestone || "Keep improving your activity to unlock your next milestone."}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
              <p className="text-xl font-semibold text-slate-950">What you are already doing well</p>
              <div className="mt-5 space-y-3">
                {(feedback?.strengths || []).map((item) => (
                  <div key={item} className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-7 text-emerald-800">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
              <p className="text-xl font-semibold text-slate-950">What to improve next</p>
              <div className="mt-5 space-y-4">
                {(feedback?.focusAreas || []).map((item) => (
                  <div key={item.title} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneMap[item.priority] || "border-slate-200 bg-slate-100 text-slate-600"}`}>
                        {item.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{item.reason}</p>
                    <p className="mt-2 text-sm font-medium leading-7 text-slate-800">{item.action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
            <p className="text-xl font-semibold text-slate-950">Your weekly plan</p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {(feedback?.weeklyPlan || []).map((item, index) => (
                <div key={`${index}-${item}`} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Step {index + 1}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackPage;
