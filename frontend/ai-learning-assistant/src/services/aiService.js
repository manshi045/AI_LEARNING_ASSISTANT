import axiosInstance from "../utils/axiosInstance";
import API_PATHS from "../utils/apiPaths";

const aiService = {
  async summarizeDocument(documentId) {
    const response = await axiosInstance.post(`${API_PATHS.ai}/generate-summary`, {
      documentId,
    });

    return {
      summary: response.data.data.summary,
    };
  },

  async explainConcept(documentId, concept) {
    const response = await axiosInstance.post(`${API_PATHS.ai}/explain-concept`, {
      documentId,
      concept,
    });

    return {
      explanation: response.data.data.explanation,
      relevantChunks: response.data.data.relevantChunks || [],
    };
  },

  async askQuestion(documentId, question) {
    const response = await axiosInstance.post(`${API_PATHS.ai}/chat`, {
      documentId,
      question,
    });

    return {
      answer: response.data.data.answer,
      relevantChunks: response.data.data.relevantChunks || [],
    };
  },

  async getChatHistory(documentId) {
    const response = await axiosInstance.get(`${API_PATHS.ai}/chat-history/${documentId}`);
    return response.data.data || [];
  },

  async generateFlashcards(documentId, count = 5) {
    const response = await axiosInstance.post(`${API_PATHS.ai}/generate-flashcards`, {
      documentId,
      count,
    });

    return response.data.data || {};
  },

  async generateQuiz(documentId, { numQuestions = 5, title } = {}) {
    const response = await axiosInstance.post(`${API_PATHS.ai}/generate-quiz`, {
      documentId,
      numQuestions,
      title,
    });

    return response.data.data;
  },
};

export default aiService;
