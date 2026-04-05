const Spinner = ({ label = "Loading..." }) => (
  <div className="flex min-h-[220px] items-center justify-center">
    <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
      <span className="text-sm font-medium text-slate-600">{label}</span>
    </div>
  </div>
);

export default Spinner;
