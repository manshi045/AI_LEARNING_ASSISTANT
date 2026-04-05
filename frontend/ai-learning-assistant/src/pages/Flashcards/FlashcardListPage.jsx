import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "../../utils/notify";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Modal";
import PageHeader from "../../components/common/PageHeader";
import Spinner from "../../components/common/Spinner";
import FlashcardSetCard from "../../components/flashcards/FlashcardSetCard";
import flashcardService from "../../services/flashcardService";

const FlashcardListPage = () => {
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSet, setSelectedSet] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const starredCards = useMemo(
    () =>
      flashcardSets.flatMap((set) =>
        (set.cards || [])
          .filter((card) => card.starred)
          .map((card) => ({
            ...card,
            setId: set._id,
            setTitle: set.title || set.documentTitle || "Flashcard Set",
          }))
      ),
    [flashcardSets]
  );

  useEffect(() => {
    const fetchFlashcardSets = async () => {
      try {
        const data = await flashcardService.getAllFlashcardSets();
        setFlashcardSets(data || []);
      } catch {
        toast.error("Failed to fetch flashcard sets");
      } finally {
        setLoading(false);
      }
    };

    fetchFlashcardSets();
  }, []);

  const handleDelete = async () => {
    if (!selectedSet) return;

    try {
      setDeleting(true);
      await flashcardService.deleteFlashcardSet(selectedSet._id);
      setFlashcardSets((prev) => prev.filter((entry) => entry._id !== selectedSet._id));
      setSelectedSet(null);
      toast.success("Flashcard set deleted");
    } catch (error) {
      toast.error(error.message || "Failed to delete flashcard set");
    } finally {
      setDeleting(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <Spinner label="Loading flashcard sets..." />;
    }

    if (flashcardSets.length === 0) {
      return (
        <EmptyState
          title="No Flashcard Sets Found"
          description="You haven't generated any flashcards yet. Go to a document to create your first set."
        />
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {flashcardSets.map((set) => (
          <FlashcardSetCard key={set._id} flashcardSet={set} onDelete={setSelectedSet} />
        ))}
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        badge="Favorites + Review"
        title="All generated flashcard sets"
        description="Browse every auto-generated flashcard deck, then open a set for flip-card study and starred review."
      />

      {!loading && starredCards.length > 0 ? (
        <div className="mb-6 rounded-[28px] border border-amber-200 bg-amber-50/70 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                Saved Favorites
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Starred flashcards
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Important cards are now collected here for quick revision.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-right">
              <p className="text-2xl font-bold text-amber-700">{starredCards.length}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Starred Cards
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {starredCards.map((card) => (
              <Link
                key={card._id}
                to={`/flashcards/${card.setId}`}
                className="rounded-3xl border border-amber-200 bg-white p-4 transition hover:border-amber-300 hover:shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                  {card.setTitle}
                </p>
                <p className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900">
                  {card.question}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                  {card.answer}
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {renderContent()}

      <Modal
        isOpen={Boolean(selectedSet)}
        onClose={() => setSelectedSet(null)}
        title="Delete Flashcard Set"
      >
        <div className="space-y-5">
          <p className="text-sm leading-7 text-slate-600">
            Delete{" "}
            <span className="font-semibold text-slate-900">
              {selectedSet?.title || selectedSet?.documentTitle || "this flashcard set"}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setSelectedSet(null)}
              disabled={deleting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FlashcardListPage;
