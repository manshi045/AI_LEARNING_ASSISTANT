import { CheckCircle2, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "../../utils/notify";
import { Link, useParams } from "react-router-dom";
import Flashcard from "../../components/flashcards/Flashcard";
import flashcardService from "../../services/flashcardService";
import { formatDate } from "../../utils/mockDb";

const FlashcardPage = () => {
  const { id } = useParams();

  const [flashcardSet, setFlashcardSet] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [reviewedCards, setReviewedCards] = useState([]);

  useEffect(() => {
    const fetchFlashcardSet = async () => {
      try {
        const setData = await flashcardService.getFlashcardSetById(id);
        setFlashcardSet(setData);
        setFlashcards(setData?.cards || []);
      } catch {
        toast.error("Failed to load flashcards");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchFlashcardSet();
    }
  }, [id]);

  useEffect(() => {
    setReviewedCards(
      (flashcards || [])
        .filter((card) => card.reviewed)
        .map((card) => card._id)
    );
  }, [flashcards]);

  const handleReview = async (index) => {
    const card = flashcards[index];
    if (!card) return;

    if (reviewedCards.includes(card._id)) {
      toast.success("This flashcard is already marked as reviewed.");
      return;
    }

    try {
      const updatedCard = await flashcardService.reviewFlashcard(id, card._id);
      setFlashcards((prev) =>
        prev.map((entry) => (entry._id === card._id ? { ...entry, ...updatedCard } : entry))
      );
      setReviewedCards((prev) => (prev.includes(card._id) ? prev : [...prev, card._id]));
      toast.success("Flashcard marked as reviewed.");
    } catch (error) {
      toast.error(error.message || "Failed to update flashcard progress");
    }
  };

  const handleNextCard = async () => {
    await handleReview(currentCardIndex);
    setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrevCard = async () => {
    await handleReview(currentCardIndex);
    setCurrentCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const handleToggleStar = async () => {
    const currentCard = flashcards[currentCardIndex];
    const updatedCard = await flashcardService.toggleFavorite(id, currentCard._id);
    setFlashcards((prev) =>
      prev.map((card) => (card._id === currentCard._id ? updatedCard : card)),
    );
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto p-6 text-slate-700 dark:text-slate-200">Loading flashcards...</div>;
  }

  if (!flashcardSet || !flashcards.length) {
    return <div className="max-w-4xl mx-auto p-6 text-slate-700 dark:text-slate-200">Flashcards not found</div>;
  }

  const currentCard = flashcards[currentCardIndex];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link
          to="/flashcards"
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
        >
          <ChevronLeft size={16} />
          Back
        </Link>

        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {flashcardSet.title || "Flashcards"}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          Review one card at a time, flip for answers, and save favorites for quick revision.
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          Created {formatDate(flashcardSet.createdAt)}
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">
            Card {currentCardIndex + 1} of {flashcards.length}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-300">
            {reviewedCards.length} reviewed
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-emerald-500 rounded-full"
            style={{
              width: `${((currentCardIndex + 1) / flashcards.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mb-4">
        <button
          type="button"
          onClick={handleToggleStar}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium ${
            currentCard?.starred
              ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
              : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-100'
          }`}
        >
          <Star size={16} className={currentCard?.starred ? 'fill-current' : ''} />
          {currentCard?.starred ? 'Starred' : 'Star'}
        </button>
      </div>

      <Flashcard flashcard={currentCard} onToggleStar={handleToggleStar} />

      <div className="flex items-center justify-between mt-8">
        <button
          type="button"
          onClick={handlePrevCard}
          disabled={currentCardIndex === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-100"
        >
          <ChevronLeft size={16} />
          Previous
        </button>

        <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">
          {currentCardIndex + 1} / {flashcards.length}
        </span>

        <button
          type="button"
          onClick={handleNextCard}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={() => handleReview(currentCardIndex)}
          disabled={currentCard?.reviewed || reviewedCards.includes(currentCard?._id)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-emerald-400 dark:text-slate-950"
        >
          <CheckCircle2 size={16} />
          {currentCard?.reviewed || reviewedCards.includes(currentCard?._id)
            ? "Reviewed"
            : "Mark as Reviewed"}
        </button>
      </div>
    </div>
  );
};

export default FlashcardPage;
