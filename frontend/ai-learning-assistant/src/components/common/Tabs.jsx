const Tabs = ({ items, activeTab, onChange }) => (
  <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-sm">
    {items.map((item) => {
      const active = item.value === activeTab;
      return (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            active
              ? "bg-slate-900 text-white shadow"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          {item.label}
        </button>
      );
    })}
  </div>
);

export default Tabs;
