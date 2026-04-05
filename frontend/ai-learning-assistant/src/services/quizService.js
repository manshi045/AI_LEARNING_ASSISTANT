import axiosInstance from "../utils/axiosInstance";
import API_PATHS from "../utils/apiPaths";

const normalizeQuiz = (quiz) => ({
  ...quiz,
  documentId: quiz.documentId?._id || quiz.documentId,
  createdAt: quiz.createdAt || quiz.updatedAt,
});

const normalizeQuizResult = (payload) => {
  if (!payload) {
    return null;
  }

  if (payload.quiz && payload.result) {
    return {
      quiz: normalizeQuiz(payload.quiz),
      result: payload.result,
    };
  }

  if (payload.quiz && Array.isArray(payload.results)) {
    const quizMeta = payload.quiz || {};
    const normalizedResults = payload.results.map((entry, index) => ({
      questionIndex: entry.questionIndex ?? index,
      questionId: entry.questionId || quizMeta.questions?.[index]?._id,
      userAnswer: entry.selectedAnswer,
      correctAnswer: entry.correctAnswer,
      isCorrect: entry.isCorrect,
      explanation: entry.explanation,
      difficulty: entry.difficulty || "medium",
      whyWrong: entry.whyWrong || "",
    }));

    const correctAnswers = normalizedResults.filter((entry) => entry.isCorrect).length;

    return {
      quiz: normalizeQuiz(quizMeta),
      result: {
        score: quizMeta.score ?? correctAnswers,
        correctAnswers,
        totalQuestions: quizMeta.totalQuestions ?? normalizedResults.length,
        answers: normalizedResults,
        userAnswers: normalizedResults,
      },
    };
  }

  const quiz = normalizeQuiz(payload.quiz || {});
  const answers = Array.isArray(payload.userAnswers)
    ? payload.userAnswers.map((entry) => ({
        questionIndex: entry.questionIndex,
        questionId: quiz.questions?.[entry.questionIndex]?._id,
        userAnswer: entry.selectedAnswer,
        correctAnswer: quiz.questions?.[entry.questionIndex]?.correctAnswer,
        isCorrect: entry.isCorrect,
      }))
    : [];

  return {
    quiz,
    result: {
      score: payload.score,
      correctAnswers: payload.correctAnswers,
      totalQuestions: payload.totalQuestions,
      answers,
      userAnswers: answers,
    },
  };
};

const quizService = {
  async getQuizzesForDocument(documentId) {
    const response = await axiosInstance.get(`${API_PATHS.quizzes}/${documentId}`);
    return (response.data.data || []).map(normalizeQuiz);
  },

  async getAllQuizzes() {
    const response = await axiosInstance.get(API_PATHS.quizzes);
    return (response.data.data || []).map(normalizeQuiz);
  },

  async getQuizById(quizId) {
    const response = await axiosInstance.get(`${API_PATHS.quizzes}/quiz/${quizId}`);
    return normalizeQuiz(response.data.data);
  },

  async getQuizResult(quizId) {
    const [resultResponse, quizResponse] = await Promise.all([
      axiosInstance.get(`${API_PATHS.quizzes}/${quizId}/results`),
      axiosInstance.get(`${API_PATHS.quizzes}/quiz/${quizId}`),
    ]);

    return normalizeQuizResult({
      ...resultResponse.data.data,
      quiz: {
        ...(quizResponse.data.data || {}),
        ...(resultResponse.data.data?.quiz || {}),
      },
    });
  },

  async submitQuiz(quizId, answersByQuestionId) {
    const quiz = await this.getQuizById(quizId);
    const answers = (quiz.questions || []).map((question, index) => ({
      questionIndex: index,
      selectedAnswer: answersByQuestionId[question._id] || "Not answered",
    }));

    const response = await axiosInstance.post(`${API_PATHS.quizzes}/${quizId}/submit`, {
      answers,
    });

    return normalizeQuizResult({
      ...response.data.data,
      quiz,
    }).result;
  },

  async deleteQuiz(quizId) {
    const response = await axiosInstance.delete(`${API_PATHS.quizzes}/${quizId}`);
    return response.data;
  },
};

export default quizService;
