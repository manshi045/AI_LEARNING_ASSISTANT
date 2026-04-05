import Feedback from "../models/Feedback.js";

export const submitFeedback = async (req, res, next) => {
  try {
    const { category = "general", rating = 5, message } = req.body || {};

    if (!message || String(message).trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: "Please write at least 10 characters of feedback",
        statusCode: 400,
      });
    }

    const feedback = await Feedback.create({
      userId: req.user._id,
      category,
      rating: Number(rating) || 5,
      message: String(message).trim(),
    });

    res.status(201).json({
      success: true,
      data: feedback,
      message: "Feedback submitted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getMyFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};
