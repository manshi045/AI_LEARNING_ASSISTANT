import { FileText, Plus } from "lucide-react";

const EmptyState = ({
  onAction,
  onActionClick,
  title,
  description,
  actionLabel,
  buttonText,
}) => {
  const actionHandler = onAction || onActionClick;
  const actionText = actionLabel || buttonText;

  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50/50 to-white px-6 py-16 text-center">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/50">
        <FileText className="h-8 w-8 text-slate-400" strokeWidth={2} />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mb-8 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>
      {actionText && actionHandler && (
        <button
          onClick={actionHandler}
          className="group relative inline-flex h-11 items-center gap-2 overflow-hidden rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:from-emerald-600 hover:to-teal-600 active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
        >
          <span className="relative z-10 flex items-center gap-2">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            {actionText}
          </span>
          <div className="absolute inset-0 translate-x-[-100%] bg-linear-to-r from-white/0 via-white/20 to-white/0 transition-transform duration-700 group-hover:translate-x-[100%]" />
        </button>
      )}
    </div>
  );
};

export default EmptyState;
