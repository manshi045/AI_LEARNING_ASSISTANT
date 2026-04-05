import mongoose from "mongoose";

const newsActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    fetchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

newsActivitySchema.index({ userId: 1, fetchedAt: -1 });

const NewsActivity = mongoose.model("NewsActivity", newsActivitySchema);

export default NewsActivity;
