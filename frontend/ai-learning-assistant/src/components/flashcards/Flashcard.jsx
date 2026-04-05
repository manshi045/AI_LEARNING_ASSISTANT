import { useState } from "react";
import { RotateCcw, Star } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const Flashcard = ({ flashcard, onToggleStar }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const { isDark } = useTheme();

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="relative h-96">
      <div
        className="relative h-full w-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
        onClick={handleFlip}
      >
        <div
          className={`absolute flex h-full w-full cursor-pointer flex-col justify-between rounded-[30px] border-2 p-8 shadow-lg transition-shadow hover:shadow-xl ${
            isDark
              ? "border-emerald-900/80 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950/80"
              : "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-100"
          }`}
          style={{
            backfaceVisibility: "hidden",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                Question
              </p>
              <p className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-500"}`}>Tap anywhere to flip</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar?.(flashcard._id);
              }}
              className={`rounded-xl p-2 transition-colors ${isDark ? "hover:bg-emerald-900/50" : "hover:bg-emerald-100"}`}
            >
              <Star
                className={`w-5 h-5 ${
                  flashcard.starred
                    ? "fill-yellow-400 text-yellow-400"
                    : isDark
                      ? "text-slate-300"
                      : "text-slate-400"
                }`}
              />
            </button>
          </div>

          <div className="flex flex-1 items-center justify-center text-center">
            <h3 className={`max-w-xl text-3xl font-semibold leading-tight ${isDark ? "text-slate-50" : "text-slate-900"}`}>
              {flashcard.question}
            </h3>
          </div>
          <div className={`inline-flex items-center gap-2 text-sm font-medium ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
            <RotateCcw size={16} />
            Reveal answer
          </div>
        </div>

        <div
          className={`absolute flex h-full w-full cursor-pointer flex-col justify-between rounded-[30px] border-2 p-8 shadow-lg transition-shadow hover:shadow-xl ${
            isDark
              ? "border-sky-900/80 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950/80"
              : "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-100"
          }`}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDark ? "text-sky-300" : "text-sky-700"}`}>
              Answer
            </p>
            <p className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-500"}`}>Flip again to revisit the prompt</p>
          </div>

          <div className="flex flex-1 items-center justify-center text-center">
            <h3 className={`max-w-xl text-2xl font-semibold leading-relaxed ${isDark ? "text-slate-50" : "text-slate-900"}`}>
              {flashcard.answer}
            </h3>
          </div>

          <div className={`inline-flex items-center gap-2 text-sm font-medium ${isDark ? "text-sky-300" : "text-sky-700"}`}>
            <RotateCcw size={16} />
            Flip back
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
