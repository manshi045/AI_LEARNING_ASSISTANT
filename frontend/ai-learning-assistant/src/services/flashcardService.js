import axiosInstance from "../utils/axiosInstance";
import API_PATHS from "../utils/apiPaths";

const normalizeFlashcardSet = (set) => ({
  ...set,
  name: set.name || set.title || "Flashcard Set",
  title: set.title || set.documentTitle || set.documentId?.title || "Flashcard Set",
  documentTitle: set.documentTitle || set.documentId?.title || "",
  cards: (set.cards || []).map((card) => ({
    ...card,
    starred: card.starred ?? card.isStarred ?? false,
    reviewed: Boolean(card.reviewCount > 0 || card.lastReviewed),
  })),
  cardCount: Array.isArray(set.cards) ? set.cards.length : set.cardCount || 0,
});

const flashcardService = {
  async getFlashcardsForDocument(documentId) {
    const response = await axiosInstance.get(`${API_PATHS.flashcards}/${documentId}`);
    return (response.data.data || []).map(normalizeFlashcardSet);
  },

  async getAllFlashcardSets() {
    const response = await axiosInstance.get(API_PATHS.flashcards);
    return (response.data.data || []).map(normalizeFlashcardSet);
  },

  async getFlashcardSetById(flashcardSetId) {
    const sets = await this.getAllFlashcardSets();
    const set = sets.find((entry) => entry._id === flashcardSetId);
    if (!set) {
      throw new Error("Flashcard set not found");
    }
    return set;
  },

  async toggleFavorite(_flashcardSetId, cardId) {
    const response = await axiosInstance.put(`${API_PATHS.flashcards}/${cardId}/star`);
    const updatedSet = normalizeFlashcardSet(response.data.data);
    const updatedCard = updatedSet.cards.find((card) => card._id === cardId);

    if (!updatedCard) {
      throw new Error("Updated flashcard not found");
    }

    return updatedCard;
  },

  async reviewFlashcard(_flashcardSetId, cardId) {
    const response = await axiosInstance.post(`${API_PATHS.flashcards}/${cardId}/review`);
    const updatedSet = normalizeFlashcardSet(response.data.data);
    const updatedCard = updatedSet.cards.find((card) => card._id === cardId);

    if (!updatedCard) {
      throw new Error("Updated flashcard not found");
    }

    return updatedCard;
  },

  async deleteFlashcardSet(flashcardSetId) {
    const response = await axiosInstance.delete(`${API_PATHS.flashcards}/${flashcardSetId}`);
    return response.data;
  },
};

export default flashcardService;
