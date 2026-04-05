import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import mongoose from "mongoose";
import NewsActivity from "../models/NewsActivity.js";
import Quiz from "../models/Quiz.js";

const toDateKey = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const collectActivityDateKeys = ({ documents = [], quizzes = [], flashcards = [] }) => {
  const keys = new Set();

  documents.forEach((item) => {
    [
      item.lastAccessed,
      item.updatedAt,
      item.uploadDate,
      item.createdAt,
    ].forEach((value) => {
      const key = toDateKey(value);
      if (key) keys.add(key);
    });
  });

  quizzes.forEach((item) => {
    [
      item.completedAt,
      item.updatedAt,
      item.createdAt,
      ...(Array.isArray(item.userAnswers) ? item.userAnswers.map((answer) => answer.answeredAt) : []),
    ].forEach((value) => {
      const key = toDateKey(value);
      if (key) keys.add(key);
    });
  });

  flashcards.forEach((item) => {
    [
      item.updatedAt,
      item.createdAt,
      ...(Array.isArray(item.cards) ? item.cards.map((card) => card.lastReviewed) : []),
    ].forEach((value) => {
      const key = toDateKey(value);
      if (key) keys.add(key);
    });
  });

  return keys;
};

const calculateStudyStreak = (activityDateKeys) => {
  const keys = activityDateKeys instanceof Set ? activityDateKeys : new Set(activityDateKeys || []);
  if (!keys.size) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!keys.has(key)) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

const buildGamification = ({
  totalDocuments = 0,
  totalFlashcardSets = 0,
  totalFlashcards = 0,
  reviewedFlashcards = 0,
  flashcardReviewActions = 0,
  starredFlashcards = 0,
  totalQuizzes = 0,
  completedQuizzes = 0,
  correctQuizAnswers = 0,
  newspaperSummaries = 0,
  averageScore = 0,
  studyStreak = 0,
}) => {
  const flashcardCompletionRate =
    totalFlashcards > 0 ? Math.round((reviewedFlashcards / totalFlashcards) * 100) : 0;
  const quizCompletionRate =
    totalQuizzes > 0 ? Math.round((completedQuizzes / totalQuizzes) * 100) : 0;

  const points =
    totalDocuments * 20 +
    flashcardReviewActions * 5 +
    correctQuizAnswers * 5 +
    newspaperSummaries * 5;

  const badges = [
    {
      key: "starter",
      title: "Getting Started",
      description: "Uploaded your first study document.",
      unlocked: totalDocuments >= 1,
      tone: "bg-sky-50 text-sky-700 border-sky-200",
    },
    {
      key: "card_crafter",
      title: "Card Crafter",
      description: "Generated at least 5 flashcard sets.",
      unlocked: totalFlashcardSets >= 5,
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      key: "review_warrior",
      title: "Review Warrior",
      description: "Reviewed at least 50 flashcards.",
      unlocked: reviewedFlashcards >= 50,
      tone: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      key: "quiz_champion",
      title: "Quiz Champion",
      description: "Completed 5 quizzes with strong consistency.",
      unlocked: completedQuizzes >= 5 && averageScore >= 70,
      tone: "bg-rose-50 text-rose-700 border-rose-200",
    },
    {
      key: "streak_guardian",
      title: "Streak Guardian",
      description: "Maintained a study streak of 5 days.",
      unlocked: studyStreak >= 5,
      tone: "bg-violet-50 text-violet-700 border-violet-200",
    },
    {
      key: "top_scorer",
      title: "Top Scorer",
      description: "Reached an average quiz score of 85% or more.",
      unlocked: completedQuizzes >= 3 && averageScore >= 85,
      tone: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    },
  ];

  const unlockedBadges = badges.filter((badge) => badge.unlocked).length;
  const nextBadge = badges.find((badge) => !badge.unlocked) || null;

  return {
    points,
    level: Math.max(1, Math.floor(points / 150) + 1),
    flashcardCompletionRate,
    quizCompletionRate,
    unlockedBadges,
    badges,
    nextBadge,
  };
};

const buildPerformanceFeedback = ({ overview = {}, gamification = {} }) => {
  const strengths = [];
  const focusAreas = [];
  const weeklyPlan = [];

  if ((overview.averageScore || 0) >= 80) {
    strengths.push("Your quiz score is strong. Keep using quizzes to lock in revision.");
  }

  if ((overview.reviewedFlashcards || 0) >= 40) {
    strengths.push("You are reviewing flashcards regularly, which is helping retention.");
  }

  if ((overview.totalDocuments || 0) >= 3) {
    strengths.push("You are learning from multiple documents, which gives you broader coverage.");
  }

  if ((overview.flashcardCompletionRate || 0) < 60) {
    focusAreas.push({
      priority: "High",
      title: "Revise more of your generated flashcards",
      reason: `You have reviewed only ${overview.flashcardCompletionRate || 0}% of your flashcards.`,
      action: "Review 15 to 20 flashcards daily and star the ones you miss often.",
    });
    weeklyPlan.push("Spend 20 minutes daily on flashcard review until completion crosses 60%.");
  }

  if ((overview.quizCompletionRate || 0) < 50) {
    focusAreas.push({
      priority: "High",
      title: "Complete more quizzes from your uploaded documents",
      reason: `Only ${overview.quizCompletionRate || 0}% of your quizzes have been completed.`,
      action: "Attempt at least one full quiz after finishing each topic.",
    });
    weeklyPlan.push("Finish one pending quiz after every study session to improve exam readiness.");
  }

  if ((overview.averageScore || 0) < 70) {
    focusAreas.push({
      priority: "High",
      title: "Work on concept clarity before taking the next quiz",
      reason: `Your average quiz score is ${overview.averageScore || 0}%.`,
      action: "Use concept explainer on weak topics and then retake a quiz from the same document.",
    });
    weeklyPlan.push("Pick your 2 weakest topics this week and revise them using summary plus concept explainer.");
  }

  if ((overview.starredFlashcards || 0) < 10 && (overview.totalFlashcards || 0) > 0) {
    focusAreas.push({
      priority: "Medium",
      title: "Use starred flashcards for targeted revision",
      reason: "You are not yet building a strong set of difficult cards for quick review.",
      action: "Star the cards you get wrong or find confusing so your hard revision set becomes stronger.",
    });
  }

  if ((overview.studyStreak || 0) < 4) {
    focusAreas.push({
      priority: "Medium",
      title: "Build a steadier daily study rhythm",
      reason: `Your current study streak is ${overview.studyStreak || 0} day(s).`,
      action: "Even a short 20 minute daily session will improve consistency more than one long session.",
    });
    weeklyPlan.push("Protect one fixed study slot every day to build streak and momentum.");
  }

  if (strengths.length === 0) {
    strengths.push("You have started building study activity. The next step is to stay consistent with review and quizzes.");
  }

  if (focusAreas.length === 0) {
    focusAreas.push({
      priority: "Maintain",
      title: "Keep reinforcing your strongest habits",
      reason: "Your activity looks balanced right now.",
      action: "Continue document upload, flashcard review and quiz practice at the same pace.",
    });
  }

  if (weeklyPlan.length === 0) {
    weeklyPlan.push("Maintain your current study flow and keep practicing one quiz plus one flashcard session each day.");
  }

  return {
    summary:
      focusAreas[0]?.action ||
      "Your performance is moving in the right direction. Stay regular with review and quizzes.",
    strengths,
    focusAreas,
    weeklyPlan,
    nextMilestone:
      gamification.nextBadge
        ? `Next badge target: ${gamification.nextBadge.title}. ${gamification.nextBadge.description}`
        : "You have unlocked all current badges. Keep revising to maintain your performance.",
  };
};

// @desc    Get user learning statistics
// @route   GET /api/progress/dashboard
// @access  Private
export const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const aggregateUserId = mongoose.Types.ObjectId.isValid(String(userId))
      ? new mongoose.Types.ObjectId(String(userId))
      : userId;

    const [
      totalDocuments,
      totalFlashcardSets,
      totalQuizzes,
      completedQuizzes,
      flashcardStatsResult,
      quizScoreResult,
      quizAnswerStatsResult,
      newspaperSummaryCount,
      flashcardActivity,
      quizActivity,
      documentActivity,
      recentDocuments,
      recentQuizzes,
      recentFlashcards,
    ] = await Promise.all([
      Document.countDocuments({ userId }),
      Flashcard.countDocuments({ userId }),
      Quiz.countDocuments({ userId }),
      Quiz.countDocuments({
        userId,
        completedAt: { $ne: null },
      }),
      Flashcard.aggregate([
        { $match: { userId: aggregateUserId } },
        {
          $project: {
            totalFlashcards: { $size: "$cards" },
            reviewedFlashcards: {
              $size: {
                $filter: {
                  input: "$cards",
                  as: "card",
                  cond: { $gt: ["$$card.reviewCount", 0] },
                },
              },
            },
            starredFlashcards: {
              $size: {
                $filter: {
                  input: "$cards",
                  as: "card",
                  cond: { $eq: ["$$card.isStarred", true] },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalFlashcards: { $sum: "$totalFlashcards" },
            reviewedFlashcards: { $sum: "$reviewedFlashcards" },
            starredFlashcards: { $sum: "$starredFlashcards" },
          },
        },
      ]),
      Quiz.aggregate([
        { $match: { userId: aggregateUserId, completedAt: { $ne: null } } },
        {
          $group: {
            _id: null,
            averageScore: { $avg: "$score" },
          },
        },
      ]),
      Quiz.aggregate([
        { $match: { userId: aggregateUserId } },
        { $unwind: { path: "$userAnswers", preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: null,
            correctQuizAnswers: {
              $sum: { $cond: [{ $eq: ["$userAnswers.isCorrect", true] }, 1, 0] },
            },
          },
        },
      ]),
      NewsActivity.countDocuments({ userId }),
      Flashcard.find({ userId })
        .select("updatedAt createdAt cards.lastReviewed cards.reviewCount")
        .lean(),
      Quiz.find({ userId })
        .select("completedAt updatedAt createdAt userAnswers.answeredAt")
        .lean(),
      Document.find({ userId })
        .select("lastAccessed updatedAt uploadDate createdAt")
        .lean(),
      Document.find({ userId })
        .sort({ lastAccessed: -1 })
        .limit(5)
        .select("title fileName lastAccessed updatedAt createdAt status")
        .lean(),
      Quiz.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title score totalQuestions completedAt updatedAt createdAt")
        .lean(),
      Flashcard.find({
        userId,
        "cards.lastReviewed": { $ne: null },
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select("title updatedAt createdAt cards.question cards.lastReviewed cards.reviewCount")
        .lean(),
    ]);

    const flashcardStats = flashcardStatsResult[0] || {
      totalFlashcards: 0,
      reviewedFlashcards: 0,
      starredFlashcards: 0,
    };
    const averageScore = Math.round(quizScoreResult[0]?.averageScore || 0);
    const flashcardReviewActions = flashcardActivity.reduce(
      (sum, item) =>
        sum +
        (Array.isArray(item.cards)
          ? item.cards.reduce((cardSum, card) => cardSum + Number(card.reviewCount || 0), 0)
          : 0),
      0
    );
    const correctQuizAnswers = quizAnswerStatsResult[0]?.correctQuizAnswers || 0;
    const studyStreak = calculateStudyStreak(
      collectActivityDateKeys({
        documents: documentActivity,
        quizzes: quizActivity,
        flashcards: flashcardActivity,
      })
    );
    const gamification = buildGamification({
      totalDocuments,
      totalFlashcardSets,
      totalFlashcards: flashcardStats.totalFlashcards,
      reviewedFlashcards: flashcardStats.reviewedFlashcards,
      flashcardReviewActions,
      starredFlashcards: flashcardStats.starredFlashcards,
      totalQuizzes,
      completedQuizzes,
      correctQuizAnswers,
      newspaperSummaries: newspaperSummaryCount,
      averageScore,
      studyStreak,
    });
    const overview = {
      totalDocuments,
      totalFlashcardSets,
      totalFlashcards: flashcardStats.totalFlashcards,
      reviewedFlashcards: flashcardStats.reviewedFlashcards,
      flashcardReviewActions,
      starredFlashcards: flashcardStats.starredFlashcards,
      totalQuizzes,
      completedQuizzes,
      correctQuizAnswers,
      newspaperSummaryCount,
      averageScore,
      studyStreak,
      flashcardCompletionRate: gamification.flashcardCompletionRate,
      quizCompletionRate: gamification.quizCompletionRate,
    };
    const performanceFeedback = buildPerformanceFeedback({
      overview,
      gamification,
    });

    res.status(200).json({
      success: true,
      data: {
        overview,
        gamification,
        performanceFeedback,
        recentActivity: {
          documents: recentDocuments,
          quizzes: recentQuizzes,
          flashcards: recentFlashcards,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
