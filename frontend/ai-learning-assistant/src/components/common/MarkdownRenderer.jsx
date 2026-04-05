const MarkdownRenderer = ({ content = "" }) => {
  const lines = content.split("\n").filter(Boolean);

  return (
    <div className="space-y-3 text-sm leading-7 text-slate-700">
      {lines.map((line, index) =>
        line.trim().startsWith("- ") ? (
          <div key={`${line}-${index}`} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <p>{line.replace(/^- /, "")}</p>
          </div>
        ) : (
          <p key={`${line}-${index}`}>{line}</p>
        ),
      )}
    </div>
  );
};

export default MarkdownRenderer;
