import { Award, BarChart2, Play, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate } from "../../utils/mockDb";

const QuizCard = ({ quiz, onDelete }) => {
  const isCompleted = Boolean(quiz?.completedAt);
  const statusLabel = isCompleted ? "Completed" : "Ready";

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border-2 border-slate-200 bg-white/80 p-4 transition-all duration-200 hover:border-emerald-300 hover:shadow-emerald-500/10">
        <button
            onClick={(e) => {
                e.stopPropagation();
                onDelete(quiz);
            }}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
        >
            <Trash2 className="" strokeWidth={2.5} />
        </button>

        <div className="space-y-4">
            {/*Status Badge*/}
            <div className="inline-flex items-center gap-1.5 py-1 rounded-lg text-xs font-semibold">
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1">
                    <Award className="w-3.5 h-3.5 text-emarld-600" strokeWidth={2.5} />
                    <span className="text-emerald-700">{statusLabel}</span>
                </div>
            </div>

            <div>
                <h3
                    className="mb-1 text-base font-semibold text-slate-900 line-clamp-2"
                    title={quiz.title}
                >
                    {quiz.title || `Quiz - ${formatDate(quiz.createdAt)}`}
                </h3>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Created {formatDate(quiz.createdAt)}
                </p>
            </div>

            {/*Quiz Info*/}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                    <span className="text-sm font-semibold text-slate-700">
                        {quiz.questions.length}{" "}
                        {quiz.questions.length ===1 ? "Question" : "Questions"}
                    </span>
                </div>
            </div>
        </div>

        {/*Action Button*/}
        <div className="mt-2 pt-4 border-t border-slate-100">
            {isCompleted ? (
                <Link to={`/quizzes/${quiz._id}/result`}>
                    <div className="group/btn inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-200 active:scale-95">
                        <BarChart2 className="w-4 h-4" strokeWidth={2.5} />
                        View Result
                    </div>
                </Link>
            ) : (
                <Link to={`/quizzes/${quiz._id}`}>
                    <div className="group/btn relative h-11 w-full overflow-hidden rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:from-emerald-600 hover:to-teal-600 active:scale-95">
                        <span className="relative z-10 flex h-full items-center justify-center gap-2">
                            <Play className="w-4 h-4" strokeWidth={2.5} />
                            Start Quiz
                        </span>
                        <div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                    </div>
                </Link>
            )}
        </div>
    </div>
  )
}

export default QuizCard;
