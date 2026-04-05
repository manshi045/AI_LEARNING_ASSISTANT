import { BookText, LoaderCircle, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import toast from "../../utils/notify";
import aiService from "../../services/aiService";
import Button from "../common/Button";
import MarkdownRenderer from "../common/MarkdownRenderer";

const AIActions = ({ document, onSummaryGenerated }) => {
  const [summary, setSummary] = useState(document?.summary || "");
  const [concept, setConcept] = useState("");
  const [explanation, setExplanation] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const handleGenerateSummary = async () => {
    try {
      setLoadingSummary(true);
      const response = await aiService.summarizeDocument(document._id);
      setSummary(response.summary);
      onSummaryGenerated?.(response.summary);
      toast.success("Summary generated");
    } catch (error) {
      toast.error(error.message || "Failed to generate summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleExplain = async (event) => {
    event.preventDefault();
    if (!concept.trim()) {
      toast.error("Enter a concept to explain");
      return;
    }

    try {
      setLoadingExplanation(true);
      const response = await aiService.explainConcept(document._id, concept);
      setExplanation(response.explanation);
      toast.success("Concept explained");
    } catch (error) {
      toast.error(error.message || "Failed to explain concept");
    } finally {
      setLoadingExplanation(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.95fr)]">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40 sm:p-7">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">AI Summary</p>
            <h3 className="mt-1 max-w-lg text-xl font-semibold leading-tight text-slate-950">
              Generate concise revision notes
            </h3>
          </div>
          <Button variant="success" onClick={handleGenerateSummary} disabled={loadingSummary}>
            {loadingSummary ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loadingSummary ? "Generating" : "Summarize"}
          </Button>
        </div>

        <div className="min-h-[320px] rounded-3xl bg-slate-50 p-5 sm:p-6">
          {summary ? (
            <MarkdownRenderer content={summary} />
          ) : (
            <p className="text-sm leading-7 text-slate-500">
              Create a one-click summary to condense the full document into high-signal study notes.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40 sm:p-7">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
            <BookText size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-700">Concept Explainer</p>
            <h3 className="text-xl font-semibold leading-tight text-slate-950">Break down a topic</h3>
          </div>
        </div>

        <form onSubmit={handleExplain} className="space-y-4">
          <input
            type="text"
            value={concept}
            onChange={(event) => setConcept(event.target.value)}
            placeholder="Try: supervised learning, transformers, backpropagation..."
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-emerald-500"
          />
          <Button type="submit" variant="secondary" className="w-full" disabled={loadingExplanation}>
            {loadingExplanation ? <LoaderCircle size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {loadingExplanation ? "Explaining" : "Explain Concept"}
          </Button>
        </form>

        <div className="mt-5 min-h-[320px] rounded-3xl bg-slate-50 p-5 sm:p-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Response
          </p>
          {explanation ? (
            <MarkdownRenderer content={explanation} />
          ) : (
            <p className="text-sm leading-7 text-slate-700">
              Ask for a concept and the assistant will return a focused explanation for revision.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIActions;
