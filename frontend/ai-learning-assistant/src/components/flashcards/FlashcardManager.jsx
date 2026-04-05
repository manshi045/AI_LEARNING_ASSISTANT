import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Brain, ChevronRight, Plus, Sparkles, Star, Trash2 } from "lucide-react";
import toast from "../../utils/notify";
import flashcardService from "../../services/flashcardService";
import aiService from "../../services/aiService";
import Modal from "../common/Modal";
import Flashcard from "./Flashcard";
import { formatDate } from "../../utils/mockDb";

const normalizeFlashcardSet = (set) => ({
  ...set,
  name: set.name || set.title || "Flashcard Set",
  cards: (set.cards || []).map((card) => ({
    ...card,
    starred: card.starred ?? card.isStarred ?? false,
    reviewed: Boolean(card.reviewCount > 0 || card.lastReviewed),
  })),
});

const FlashcardManager = ({ documentId }) => {
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [setToDelete, setSetToDelete] = useState(null);

  const fetchFlashcardSets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await flashcardService.getFlashcardsForDocument(documentId);
      setFlashcardSets(response);
    } catch {
      toast.error("Failed to fetch flashcard sets.");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (documentId) {
      fetchFlashcardSets();
    }
  }, [documentId, fetchFlashcardSets]);

  const handleGenerateFlashcards = async () => {
    setGenerating(true);
    try {
      const requestedCount = 5;
      const newSet = normalizeFlashcardSet(await aiService.generateFlashcards(documentId, requestedCount));

      if (!newSet || !(newSet.cards || []).length) {
        throw new Error("No flashcards were generated.");
      }

      setFlashcardSets((prev) => [newSet, ...prev]);
      setSelectedSet(newSet);
      setCurrentCardIndex(0);
      toast.success(`${newSet.cards.length} flashcards generated in one set.`);
    } catch (error) {
      toast.error(error.message || "Failed to generate flashcards.");
    } finally {
      setGenerating(false);
    }
  };

  const handleNextCard = () => {
    if (selectedSet) {
      handleReview(selectedSet.cards[currentCardIndex]?._id);
      setCurrentCardIndex(
        (prevIndex) => (prevIndex + 1) % selectedSet.cards.length,
      );
    }
  };

  const handlePrevCard = () => {
    if (selectedSet) {
      handleReview(selectedSet.cards[currentCardIndex]?._id);
      setCurrentCardIndex(
        (prevIndex) =>
          (prevIndex - 1 + selectedSet.cards.length) % selectedSet.cards.length,
      );
    }
  };

  const handleReview = async (cardId) => {
    if (!cardId || !selectedSet) return;
    try {
      await flashcardService.reviewFlashcard(selectedSet._id, cardId);
      setSelectedSet((prev) =>
        prev
          ? {
              ...prev,
              cards: prev.cards.map((card) =>
                card._id === cardId ? { ...card, reviewed: true } : card,
              ),
            }
          : prev,
      );
    } catch {
      toast.error("Failed to review flashcard.");
    }
  };

  const handleDeleteRequest = (e, set) => {
    e.stopPropagation();
    setSetToDelete(set);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!setToDelete) return;
    setDeleting(true);
    try {
      await flashcardService.deleteFlashcardSet(setToDelete._id);
      toast.success("Flashcard set deleted successfully!");
      setFlashcardSets(flashcardSets.filter((set) => set._id !== setToDelete._id));
      setIsDeleteModalOpen(false);
      setSetToDelete(null);
    } catch (error) {
      toast.error(error.message || "Failed to delete flashcard set.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectSet = (set) => {
    setSelectedSet(set);
    setCurrentCardIndex(0);
  };

  const handleToggleStar = async (cardId) => {
    if (!selectedSet) return;
    try {
      const updatedCard = await flashcardService.toggleFavorite(selectedSet._id, cardId);
      setSelectedSet((prev) =>
        prev
          ? {
              ...prev,
              cards: prev.cards.map((card) => (card._id === cardId ? updatedCard : card)),
            }
          : prev,
      );
      setFlashcardSets((prev) =>
        prev.map((set) =>
          set._id === selectedSet._id
            ? {
                ...set,
                cards: set.cards.map((card) => (card._id === cardId ? updatedCard : card)),
              }
            : set,
        ),
      );
    } catch {
      toast.error("Could not update favorites");
    }
  };

  const renderFlashcardViewer = () => {
    if (!selectedSet || selectedSet.cards.length === 0) {
      return null;
    }

    const currentCard = selectedSet.cards[currentCardIndex];

    return (
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedSet(null)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" strokeWidth={2} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {selectedSet.name || 'Flashcard Set'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Card {currentCardIndex + 1} of {selectedSet.cards.length}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
            style={{
              width: `${((currentCardIndex + 1) / selectedSet.cards.length) * 100}%`,
            }}
          />
        </div>

        {/* Flashcard Display */}
        <div className="my-8">
          <Flashcard
            key={currentCard._id}
            flashcard={currentCard}
            onToggleStar={handleToggleStar}
          />
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <button
            onClick={handlePrevCard}
            disabled={currentCardIndex === 0}
            className="flex items-center gap-2 px-5 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 rotate-180" strokeWidth={2} />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {selectedSet.cards.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentCardIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentCardIndex
                    ? 'bg-emerald-500 w-8'
                    : 'bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNextCard}
            disabled={currentCardIndex === selectedSet.cards.length - 1}
            className="flex items-center gap-2 px-5 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="inline-flex items-center gap-2 font-medium">
            <Star size={16} className={currentCard.starred ? "fill-current" : ""} />
            {currentCard.starred ? "Saved to favorites" : "Mark important cards as favorites"}
          </div>
          <span>{selectedSet.cards.filter((card) => card.starred).length} starred</span>
        </div>
      </div>
    );
  };

  const renderSetList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      );
    }

    if (flashcardSets.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="inline flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-tr from-emerald-100 to-teal-100 mb-6">
            <Brain className="w-8 h-8 text-emerald-600" strokeWidth={2} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Flashcards Yet
          </h3>
          <p className="text-sm text-slate-500 mb-8 text-center max-w-sm">
            Generate flashcards from your document to start learning and
            reinforce your knowledge.
          </p>
          <button
            onClick={handleGenerateFlashcards}
            disabled={generating}
            className="group inline-flex items-center gap-2 px-6 h-12 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-200"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" strokeWidth={2} />
                Generate Flashcards
              </>
            )}
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        {/* Header with Generate Button */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Your Flashcard Sets</h3>
            <p className="text-sm text-slate-500 mt-1">
              {flashcardSets.length}{" "}
              {flashcardSets.length === 1 ? "set" : "sets"} available
            </p>
          </div>
          <button
            onClick={handleGenerateFlashcards}
            disabled={generating}
            className="group inline-flex items-center gap-2 px-5 h-11 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Generate New Set
              </>
            )}
          </button>
        </div>

        {/* Flashcard Sets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {flashcardSets.map((set) => (
            <div
              key={set._id}
              onClick={() => handleSelectSet(set)}
              className="group relative bg-white/80 backdrop-blur-xl border-2 border-slate-200 hover:border-emerald-300 rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/10"
            >
              {/* Delete Button */}
              <button onClick={(e) => handleDeleteRequest(e, set)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100">
                <Trash2 className="w-4 h-4" strokeWidth={2} />
              </button>

              {/* Set Content */}
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-linear-to-tr from-emerald-100 to-teal-100">
                  <Brain className="w-6 h-6 text-emerald-600" strokeWidth={2} />
                </div>

                <div>
                  <h4 className="text-base font-semibold text-slate-900 mb-1">
                    {set.title || "Flashcard Set"}
                  </h4>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Created {formatDate(set.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200  rounded-lg">
                  <span className="text-sm font-semibold text-emerald-700">
                    {set.cards.length}{" "}
                    {set.cards.length === 1 ? "card" : "cards"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-xl shadow-slate-200/50 p-8">
        {selectedSet ? renderFlashcardViewer() : renderSetList()}
      </div>
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Flashcard Set?"
      >
        <div className="space-y-6">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this flashcard set? This action
            cannot be undone and all cards will be permanently removed.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleting}
              className="px-5 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="px-5 h-11 bg-rose-500 hover:bg-rose-600 text-white font-medium text-sm rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>Delete Set</>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default FlashcardManager;
