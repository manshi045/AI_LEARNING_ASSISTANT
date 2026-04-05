import { ArrowRight, Clock3, Layers3, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate } from "../../utils/mockDb";

const FlashcardSetCard = ({ flashcardSet, onDelete }) => {
  const flashcards = flashcardSet?.cards || flashcardSet?.flashcards || [];
  const cardCount = flashcards.length || flashcardSet?.cardCount || 0;
  const title =
    flashcardSet?.title || flashcardSet?.documentTitle || 'Flashcard Set';
  const preview =
    flashcards[0]?.front ||
    flashcards[0]?.question ||
    flashcardSet?.description ||
    'Review key concepts from this set.';

  const createdAt = flashcardSet?.createdAt ? formatDate(flashcardSet.createdAt) : null;

  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      {onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(flashcardSet)}
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
        >
          <Trash2 size={16} />
        </button>
      ) : null}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium mb-3">
            <Layers3 size={14} />
            Flashcards
          </div>

          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        </div>

        <div className="text-right">
          <p className="text-xl font-bold text-slate-900">{cardCount}</p>
          <p className="text-xs text-slate-500">Cards</p>
        </div>
      </div>

      <p className="text-sm text-slate-600 leading-6 mb-4 line-clamp-3">{preview}</p>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="inline-flex items-center gap-2 text-xs text-slate-500">
          <Clock3 size={14} />
          {createdAt || 'Recently created'}
        </div>

        <Link
          to={`/flashcards/${flashcardSet?._id}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
        >
          Study Now
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
};

export default FlashcardSetCard;
