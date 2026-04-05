import express from "express";
import { getMyFeedback, submitFeedback } from "../controllers/feedbackController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
router.get("/", getMyFeedback);
router.post("/", submitFeedback);

export default router;
