import jwt from "jsonwebtoken";
import {
    changeUserPassword,
    createUserRecord,
    findSafeUserById,
    findUserByEmail,
    findUserByUsername,
    getSafeUser,
    resetUserPasswordByEmail,
    updateUserRecord,
    verifyUserPassword,
} from "../utils/authPersistence.js";
import { sendPasswordResetOtpEmail } from "../utils/emailService.js";
import {
    createPasswordResetOtp,
    verifyPasswordResetOtp,
} from "../utils/otpStore.js";

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: "7d"});
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
    try {
        const {username, email, password} = req.body;
        const existingEmail = await findUserByEmail(email);
        const existingUsername = await findUserByUsername(username);
        if(existingEmail || existingUsername){
            return res.status(400).json({
                success: false,
                error: 
                    existingEmail ? "Email already exists" : "Username already exists",
            });
        }
        const created = await createUserRecord({username, email, password});
        const user = created.user;
        const token = generateToken(user.id || user._id);
        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user.id || user._id,
                    username: user.username,
                    email: user.email,
                    profileImage: user.profileImage,
                    createdAt: user.createdAt,
                },
                token,
            },
            message: "User registered successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
    try {
        const {email, password} = req.body;
        if(!email || !password){
            return res.status(400).json({message: "Please provide email and password"});
        }
        const record = await findUserByEmail(email);
        if(!record){
            return res.status(401).json({message: "Invalid email or password"});
        }
        const passwordMatched = await verifyUserPassword(record, password);
        if(passwordMatched){
            const user = getSafeUser(record);
            const token = generateToken(user.id || user._id);
            res.json({
                success: true,
                data: {
                    user: {
                        id: user.id || user._id,
                        username: user.username,
                        email: user.email,
                        profileImage: user.profileImage,
                        createdAt: user.createdAt,
                    },
                    token,
                },
                message: "User logged in successfully"});
        }else{
            res.status(401).json({message: "Invalid email or password"});
        }
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res) => {
    try {
        const user = await findSafeUserById(req.user.id);
        if(user){
            res.json({
                success: true,
                data: {
                    user: {
                        id: user.id || user._id,
                        username: user.username,
                        email: user.email,
                        profileImage: user.profileImage,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                    },
                },
                message: "User profile fetched successfully",
            });
        }else{
            res.status(404).json({message: "User not found"});
        }
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
    try {
        const {username, email, profileImage} = req.body;
        const user = await updateUserRecord(req.user.id, { username, email, profileImage });
        if(user){
            res.json({
                success: true,
                data: {
                    user: {
                        id: user.id || user._id,
                        username: user.username,
                        email: user.email,
                        profileImage: user.profileImage,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                    },
                },
                message: "User profile updated successfully",
            });
        }else{
            res.status(404).json({message: "User not found"});
        }
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
    try {
        const {currentPassword, newPassword} = req.body;
        const { user, validCurrentPassword } = await changeUserPassword(
            req.user.id,
            currentPassword,
            newPassword
        );
        if(user){
            res.json({
                success: true,
                data: {
                    user: {
                        id: user.id || user._id,
                        username: user.username,
                        email: user.email,
                        profileImage: user.profileImage,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                    },
                },
                message: "Password changed successfully",
            });
        }else if(!validCurrentPassword){
            return res.status(401).json({message: "Invalid current password"});
        }else{
            res.status(404).json({message: "User not found"});
        }
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

// @desc    Send OTP for password reset
// @route   POST /api/auth/forgot-password/send-otp
// @access  Public
export const sendForgotPasswordOtp = async (req, res) => {
    try {
        const { email } = req.body || {};
        const normalizedEmail = String(email || "").trim().toLowerCase();

        if (!normalizedEmail) {
            return res.status(400).json({ message: "Please provide your registered email" });
        }

        const record = await findUserByEmail(normalizedEmail);
        if (!record) {
            return res.status(404).json({ message: "Account not registered with this email" });
        }

        const { otp } = await createPasswordResetOtp(normalizedEmail);
        const safeUser = getSafeUser(record);
        const responsePayload = {
            success: true,
            message: "OTP sent to your registered email address.",
        };

        if (String(process.env.OTP_DEBUG_PREVIEW || "false") === "true") {
            responsePayload.debugOtp = otp;
        }

        await sendPasswordResetOtpEmail({
            to: normalizedEmail,
            otp,
            username: safeUser?.username,
        });

        res.json(responsePayload);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP and reset password
// @route   POST /api/auth/forgot-password/verify-otp
// @access  Public
export const forgotPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body || {};
        const normalizedEmail = String(email || "").trim().toLowerCase();

        if (!normalizedEmail || !otp || !newPassword) {
            return res.status(400).json({
                message: "Please provide email, OTP and new password",
            });
        }

        if (String(newPassword).length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long",
            });
        }

        const verification = await verifyPasswordResetOtp(normalizedEmail, otp);
        if (!verification.ok) {
            return res.status(400).json({ message: verification.reason });
        }

        const user = await resetUserPasswordByEmail(normalizedEmail, newPassword);
        if (!user) {
            return res.status(404).json({ message: "Account not registered with this email" });
        }

        res.json({
            success: true,
            message: "Password reset successfully. You can now log in with the new password.",
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
