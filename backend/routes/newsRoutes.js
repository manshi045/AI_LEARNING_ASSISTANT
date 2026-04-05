import express from "express";
import { getNewsByDate } from "../controllers/newsController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
router.get("/:date", getNewsByDate);

export default router;
