import {
  CalendarDays,
  FileSearch,
  Newspaper,
  RefreshCcw,
  Sparkles,
  Tags,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "../../utils/notify";
import Button from "../../components/common/Button";
import PageHeader from "../../components/common/PageHeader";
import Spinner from "../../components/common/Spinner";
import newspaperService from "../../services/newspaperService";

const getTodayValue = () => {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

const formatDisplayDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const detailCards = [
  {
    key: "importance",
    title: "Why It Matters",
    icon: Sparkles,
    tone: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    key: "qa",
    title: "Quick Revision Q&A",
    icon: FileSearch,
    tone: "bg-sky-50 text-sky-700 border-sky-200",
  },
];

const NewspaperPage = () => {
  const [selectedDate, setSelectedDate] = useState(getTodayValue);
  const [newsData, setNewsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadNews = async (date, { silent = false, notifyOnSuccess = false } = {}) => {
    try {
      setError("");
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await newspaperService.getNewsByDate(date);
      setNewsData(data);
      if (notifyOnSuccess) {
        toast.success(`Newspaper summary fetched for ${formatDisplayDate(date)}`);
      }
    } catch (loadError) {
      const message = loadError.message || "Could not load newspaper summary";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNews(selectedDate);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await loadNews(selectedDate, {
      silent: Boolean(newsData),
      notifyOnSuccess: true,
    });
  };

  return (
    <div>
      <PageHeader
        badge="Daily Newspaper"
        title="Fetch date-wise current affairs summary"
        description="Pick a date, fetch the generated newspaper digest, and revise the main summary in a clean card-based layout."
      />

      <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
        <form className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" onSubmit={handleSubmit}>
          <div className="flex-1">
            <label htmlFor="news-date" className="mb-2 block text-sm font-semibold text-slate-700">
              Select newspaper date
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <CalendarDays size={18} className="text-slate-400" />
              <input
                id="news-date"
                type="date"
                max={getTodayValue()}
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="app-date-input w-full bg-transparent text-sm font-medium text-slate-800 outline-none"
                required
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" disabled={loading || refreshing}>
              <Newspaper size={16} />
              {loading || refreshing ? "Fetching..." : "Fetch Summary"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                loadNews(selectedDate, {
                  silent: Boolean(newsData),
                  notifyOnSuccess: true,
                })
              }
              disabled={loading || refreshing}
            >
              <RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>
        </form>
      </div>

      {loading ? <Spinner label="Loading newspaper summary..." /> : null}

      {!loading && error ? (
        <div className="mt-6 rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <p className="text-lg font-semibold">Summary fetch failed</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      ) : null}

      {!loading && newsData ? (
        <div className="mt-6 space-y-6">
          <div className="app-hero-card rounded-[30px] border border-slate-200 p-6 shadow-2xl shadow-slate-900/10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <span className="app-hero-badge inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                  {newsData.date ? formatDisplayDate(newsData.date) : "Selected Date"}
                </span>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Daily newspaper summary
                </h2>
                <p className="app-hero-text mt-4 whitespace-pre-line text-sm leading-7 sm:text-base">
                  {newsData.summary}
                </p>
              </div>

              <div className="app-hero-side min-w-[220px] rounded-[28px] border p-4 backdrop-blur">
                <div className="app-hero-side-title flex items-center gap-2 text-sm font-semibold">
                  <Tags size={16} />
                  Focus tags
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {newsData.tags.length > 0 ? (
                    newsData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="app-hero-tag rounded-full border px-3 py-1 text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <p className="app-hero-muted text-sm">No tags available for this date.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            {detailCards.map((card) => {
              const Icon = card.icon;
              const content = newsData[card.key];

              return (
                <div key={card.key} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-2xl border p-3 ${card.tone}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{card.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {card.key === "qa" ? "Use this block for quick revision before quizzes." : "Key takeaway for exam relevance and context."}
                      </p>
                    </div>
                  </div>

                  <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-700">
                    {content || "No content available for this section."}
                  </p>
                </div>
              );
            })}
          </div>

          {newsData.syllabusLinks.length > 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
              <p className="text-lg font-semibold text-slate-950">Relevant syllabus links</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {newsData.syllabusLinks.map((link) => (
                  <a
                    key={link}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default NewspaperPage;
