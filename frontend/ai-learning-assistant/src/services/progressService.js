import axiosInstance from "../utils/axiosInstance";
import API_PATHS from "../utils/apiPaths";

const buildPerformanceCoach = ({ overview = {}, gamification = {}, apiFeedback = {} }) => ({
  summary:
    apiFeedback.summary ||
    "Use your report to decide what needs more revision, then practice that area every day.",
  strengths: apiFeedback.strengths || [],
  focusAreas: apiFeedback.focusAreas || [],
  weeklyPlan: apiFeedback.weeklyPlan || [],
  nextMilestone:
    apiFeedback.nextMilestone ||
    (gamification.nextBadge
      ? `Next badge target: ${gamification.nextBadge.title}. ${gamification.nextBadge.description}`
      : "Keep up the same pace and maintain your consistency."),
});

const progressService = {
  async getDashboardData() {
    const progressResponse = await axiosInstance.get(`${API_PATHS.progress}/dashboard`);

    const overview = progressResponse.data.data?.overview || {};
    const gamification = progressResponse.data.data?.gamification || {};
    const recentActivity = progressResponse.data.data?.recentActivity || {};
    const recentItems = [
      ...(recentActivity.documents || []).map((item) => ({
        _id: item._id,
        title: item.title,
        type: "document",
        createdAt: item.lastAccessed || item.updatedAt || item.createdAt,
      })),
      ...(recentActivity.quizzes || []).map((item) => ({
        _id: item._id,
        title: item.title,
        type: "quiz",
        createdAt: item.completedAt || item.updatedAt || item.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      stats: [
        {
          label: "Points",
          value: gamification.points ?? 0,
          hint: `Level ${gamification.level ?? 1} learner`,
        },
        {
          label: "Documents",
          value: overview.totalDocuments ?? 0,
          hint: "Uploaded study sources",
        },
        {
          label: "Flashcards",
          value: overview.totalFlashcards ?? 0,
          hint: `${overview.starredFlashcards ?? 0} favorites saved`,
        },
        {
          label: "Quizzes",
          value: overview.totalQuizzes ?? 0,
          hint: `${overview.completedQuizzes ?? 0} completed`,
        },
      ],
      gamification: {
        points: gamification.points ?? 0,
        level: gamification.level ?? 1,
        unlockedBadges: gamification.unlockedBadges ?? 0,
        badges: gamification.badges || [],
        nextBadge: gamification.nextBadge || null,
      },
      recentActivity: recentItems.slice(0, 6),
      documents: recentActivity.documents || [],
    };
  },

  async getReportData() {
    const progressResponse = await axiosInstance.get(`${API_PATHS.progress}/dashboard`);

    const overview = progressResponse.data.data?.overview || {};
    const gamification = progressResponse.data.data?.gamification || {};
    const performanceFeedback = progressResponse.data.data?.performanceFeedback || {};
    const recentActivity = progressResponse.data.data?.recentActivity || {};
    const totalDocuments = overview.totalDocuments ?? 0;
    const totalFlashcards = overview.totalFlashcards ?? 0;
    const reviewedFlashcards = overview.reviewedFlashcards ?? 0;
    const flashcardReviewActions = overview.flashcardReviewActions ?? reviewedFlashcards;
    const totalQuizzes = overview.totalQuizzes ?? 0;
    const completedQuizzes = overview.completedQuizzes ?? 0;
    const flashcardCompletionRate = totalFlashcards > 0
      ? Math.round((reviewedFlashcards / totalFlashcards) * 100)
      : 0;
    const quizCompletionRate = totalQuizzes > 0
      ? Math.round((completedQuizzes / totalQuizzes) * 100)
      : 0;

    return {
      overview: {
        totalDocuments,
        totalFlashcardSets: overview.totalFlashcardSets ?? 0,
        totalFlashcards,
        reviewedFlashcards,
        flashcardReviewActions,
        starredFlashcards: overview.starredFlashcards ?? 0,
        totalQuizzes,
        completedQuizzes,
        averageScore: overview.averageScore ?? 0,
        studyStreak: overview.studyStreak ?? 0,
        flashcardCompletionRate: gamification.flashcardCompletionRate ?? flashcardCompletionRate,
        quizCompletionRate: gamification.quizCompletionRate ?? quizCompletionRate,
      },
      gamification: {
        points: gamification.points ?? 0,
        level: gamification.level ?? 1,
        unlockedBadges: gamification.unlockedBadges ?? 0,
        badges: gamification.badges || [],
        nextBadge: gamification.nextBadge || null,
      },
      performanceFeedback: buildPerformanceCoach({
        overview,
        gamification,
        apiFeedback: performanceFeedback,
      }),
      highlights: [
        {
          label: "Points Earned",
          value: gamification.points ?? 0,
          hint: `Level ${gamification.level ?? 1} progress score`,
        },
        {
          label: "Flashcards Studied",
          value: flashcardReviewActions,
          hint: `${reviewedFlashcards} unique flashcards reviewed • ${flashcardCompletionRate}% progress`,
        },
        {
          label: "Quizzes Submitted",
          value: completedQuizzes,
          hint: `${quizCompletionRate}% of all quizzes completed`,
        },
        {
          label: "Average Quiz Score",
          value: `${overview.averageScore ?? 0}%`,
          hint: "Based on completed quizzes only",
        },
      ],
      breakdown: [
        {
          label: "Documents added",
          value: totalDocuments,
          tone: "bg-sky-50 text-sky-700 border-sky-200",
        },
        {
          label: "Flashcard sets generated",
          value: overview.totalFlashcardSets ?? 0,
          tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
        },
        {
          label: "Flashcard review actions",
          value: flashcardReviewActions,
          tone: "bg-teal-50 text-teal-700 border-teal-200",
        },
        {
          label: "Starred flashcards",
          value: overview.starredFlashcards ?? 0,
          tone: "bg-amber-50 text-amber-700 border-amber-200",
        },
        {
          label: "Quizzes created",
          value: totalQuizzes,
          tone: "bg-rose-50 text-rose-700 border-rose-200",
        },
        {
          label: "Badges unlocked",
          value: gamification.unlockedBadges ?? 0,
          tone: "bg-violet-50 text-violet-700 border-violet-200",
        },
      ],
      recentActivity: [
        ...(recentActivity.documents || []).map((item) => ({
          _id: item._id,
          title: item.title,
          meta: "Document activity",
          createdAt: item.lastAccessed || item.updatedAt || item.createdAt,
        })),
        ...(recentActivity.quizzes || []).map((item) => ({
          _id: item._id,
          title: item.title,
          meta: `Quiz score ${item.score ?? 0}/${item.totalQuestions ?? 0}`,
          createdAt: item.completedAt || item.updatedAt || item.createdAt,
        })),
        ...(recentActivity.flashcards || []).flatMap((item) =>
          (item.cards || [])
            .filter((card) => card.lastReviewed)
            .map((card) => ({
              _id: `${item._id}-${card._id}`,
              title: card.question,
              meta: `Flashcard reviewed ${card.reviewCount ?? 0} time(s)`,
              createdAt: card.lastReviewed || item.updatedAt || item.createdAt,
            }))
        ),
      ]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8),
    };
  },
};

export default progressService;
