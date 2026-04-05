import express from "express";
import {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    sendForgotPasswordOtp,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

const validateRegister = (req, res, next) => {
    const { username, email, password } = req.body || {};
    if (!username || String(username).trim().length < 3 || String(username).trim().length > 30) {
        return res.status(400).json({ message: "Username must be between 3 and 30 characters" });
    }

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    if (!validEmail) {
        return res.status(400).json({ message: "Invalid email address" });
    }

    if (!password || String(password).length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    req.body.username = String(username).trim();
    req.body.email = normalizedEmail;
    next();
};

const validateLogin = (req, res, next) => {
    const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    if (!validEmail) {
        return res.status(400).json({ message: "Invalid email address" });
    }

    if (!req.body?.password || String(req.body.password).length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    req.body.email = normalizedEmail;
    next();
};

//Public routes
router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.post("/forgot-password/send-otp", sendForgotPasswordOtp);
router.post("/forgot-password/verify-otp", forgotPassword);

//Private routes
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);

export default router;
