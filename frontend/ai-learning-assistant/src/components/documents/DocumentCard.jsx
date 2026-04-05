import { Eye, FileText, Sparkles, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatBytes, formatDate } from "../../utils/mockDb";

const DocumentCard = ({ document, onDelete }) => (
  <div className="group flex h-full flex-col rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-lg shadow-slate-200/40 transition hover:-translate-y-1 hover:shadow-xl">
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <Sparkles size={14} />
          AI-ready document
        </span>
        <h3 className="mt-3 text-xl font-semibold text-slate-950">{document.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{document.description}</p>
      </div>
      <div className="rounded-2xl bg-slate-100 p-3 text-slate-500">
        <FileText size={20} />
      </div>
    </div>

    <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
      <div className="rounded-2xl bg-slate-50 p-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Size</p>
        <p className="mt-1 font-semibold text-slate-800">{formatBytes(document.fileSize)}</p>
      </div>
      <div className="rounded-2xl bg-slate-50 p-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pages</p>
        <p className="mt-1 font-semibold text-slate-800">{document.pageCount}</p>
      </div>
      <div className="rounded-2xl bg-slate-50 p-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Flashcards</p>
        <p className="mt-1 font-semibold text-slate-800">{document.cardCount}</p>
      </div>
      <div className="rounded-2xl bg-slate-50 p-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Quizzes</p>
        <p className="mt-1 font-semibold text-slate-800">{document.quizCount}</p>
      </div>
    </div>

    <div className="mt-4 flex flex-wrap gap-2">
      {document.tags?.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
        >
          {tag}
        </span>
      ))}
    </div>

    <div className="mt-auto pt-5">
      <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
        <span>Uploaded {formatDate(document.uploadedAt)}</span>
        <span>{document.status}</span>
      </div>
      <div className="flex gap-3">
        <Link
          to={`/documents/${document._id}`}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Eye size={16} />
          Open Workspace
        </Link>
        <button
          type="button"
          onClick={() => onDelete?.(document)}
          className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-600 transition hover:bg-rose-100"
          aria-label={`Delete ${document.title}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  </div>
);

export default DocumentCard;
