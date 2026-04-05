import { getNewsDigestByDate } from "../utils/newsService.js";
import NewsActivity from "../models/NewsActivity.js";

const isValidDate = (value = "") => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const getNewsByDate = async (req, res, next) => {
  try {
    const { date } = req.params;

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Date must be in YYYY-MM-DD format",
      });
    }

    const data = await getNewsDigestByDate(date);

    await NewsActivity.create({
      userId: req.user._id,
      date,
      fetchedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
