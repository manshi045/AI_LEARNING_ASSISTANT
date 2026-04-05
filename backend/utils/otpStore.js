import crypto from "crypto";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const otpEntries = new Map();

const hashOtp = (otp) =>
    crypto.createHash("sha256").update(String(otp)).digest("hex");

const getNow = () => Date.now();

const isExpired = (entry) => {
    const expiresAt = new Date(entry?.expiresAt || 0).getTime();
    return !Number.isFinite(expiresAt) || expiresAt <= getNow();
};

const getActiveEntry = (email) => {
    const entry = otpEntries.get(email);
    if (!entry) {
        return null;
    }

    if (isExpired(entry)) {
        otpEntries.delete(email);
        return null;
    }

    return entry;
};

export const createPasswordResetOtp = async (email) => {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const existingEntry = getActiveEntry(normalizedEmail);

    if (existingEntry?.otp) {
        return {
            otp: existingEntry.otp,
            expiresAt: existingEntry.expiresAt,
        };
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(getNow() + OTP_TTL_MS).toISOString();

    otpEntries.set(normalizedEmail, {
        email: normalizedEmail,
        otp,
        otpHash: hashOtp(otp),
        attempts: 0,
        createdAt: new Date().toISOString(),
        expiresAt,
    });

    return { otp, expiresAt };
};

export const verifyPasswordResetOtp = async (email, otp) => {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedOtp = String(otp || "").replace(/\D/g, "").trim();
    const entry = getActiveEntry(normalizedEmail);

    if (!entry) {
        return { ok: false, reason: "OTP not found or expired" };
    }

    if (entry.attempts >= MAX_OTP_ATTEMPTS) {
        otpEntries.delete(normalizedEmail);
        return { ok: false, reason: "OTP expired. Please request a new one." };
    }

    if (entry.otpHash !== hashOtp(normalizedOtp)) {
        entry.attempts += 1;
        otpEntries.set(normalizedEmail, entry);
        return { ok: false, reason: "Invalid OTP" };
    }

    otpEntries.delete(normalizedEmail);
    return { ok: true };
};
