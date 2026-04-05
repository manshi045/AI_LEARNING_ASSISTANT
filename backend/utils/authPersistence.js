import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const USERS_FILE = path.join(DATA_DIR, "local-users.json");

const ensureStore = async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
        await fs.access(USERS_FILE);
    } catch {
        await fs.writeFile(USERS_FILE, "[]", "utf8");
    }
};

const readLocalUsers = async () => {
    await ensureStore();
    const raw = await fs.readFile(USERS_FILE, "utf8");
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeLocalUsers = async (users) => {
    await ensureStore();
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
};

const stripPassword = (user) => {
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
};

const mapMongoUser = (user) => {
    if (!user) return null;
    return {
        id: user._id.toString(),
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
        profileImage: user.profileImage ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
};

export const isMongoAvailable = () => mongoose.connection.readyState === 1;

export const findUserByEmail = async (email) => {
    if (isMongoAvailable()) {
        const user = await User.findOne({ email });
        if (!user) return null;
        return {
            source: "mongo",
            user,
        };
    }

    const users = await readLocalUsers();
    const user = users.find((entry) => entry.email === email.toLowerCase());
    if (!user) return null;
    return {
        source: "local",
        user,
    };
};

export const findUserByUsername = async (username) => {
    if (isMongoAvailable()) {
        const user = await User.findOne({ username });
        if (!user) return null;
        return {
            source: "mongo",
            user,
        };
    }

    const users = await readLocalUsers();
    const user = users.find(
        (entry) => entry.username.toLowerCase() === String(username).toLowerCase()
    );
    if (!user) return null;
    return {
        source: "local",
        user,
    };
};

export const createUserRecord = async ({ username, email, password }) => {
    if (isMongoAvailable()) {
        const user = await User.create({ username, email, password });
        return {
            source: "mongo",
            user: mapMongoUser(user),
        };
    }

    const users = await readLocalUsers();
    const now = new Date().toISOString();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = {
        _id: crypto.randomUUID(),
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        profileImage: null,
        createdAt: now,
        updatedAt: now,
    };
    users.push(newUser);
    await writeLocalUsers(users);

    return {
        source: "local",
        user: stripPassword(newUser),
    };
};

export const verifyUserPassword = async (record, enteredPassword) => {
    if (!record?.user) return false;
    if (record.source === "mongo") {
        return record.user.matchPassword(enteredPassword);
    }
    return bcrypt.compare(enteredPassword, record.user.password);
};

export const getSafeUser = (record) => {
    if (!record?.user) return null;
    return record.source === "mongo"
        ? mapMongoUser(record.user)
        : stripPassword(record.user);
};

export const findSafeUserById = async (id) => {
    if (isMongoAvailable()) {
        const user = await User.findById(id);
        return user ? mapMongoUser(user) : null;
    }

    const users = await readLocalUsers();
    const user = users.find((entry) => entry._id === id);
    return stripPassword(user);
};

export const updateUserRecord = async (id, updates) => {
    if (isMongoAvailable()) {
        const user = await User.findById(id);
        if (!user) return null;
        user.username = updates.username || user.username;
        user.email = updates.email || user.email;
        if (updates.profileImage !== undefined) {
            user.profileImage = updates.profileImage;
        }
        const savedUser = await user.save();
        return mapMongoUser(savedUser);
    }

    const users = await readLocalUsers();
    const index = users.findIndex((entry) => entry._id === id);
    if (index === -1) return null;
    users[index] = {
        ...users[index],
        username: updates.username || users[index].username,
        email: updates.email ? updates.email.toLowerCase() : users[index].email,
        profileImage: updates.profileImage ?? users[index].profileImage,
        updatedAt: new Date().toISOString(),
    };
    await writeLocalUsers(users);
    return stripPassword(users[index]);
};

export const changeUserPassword = async (id, currentPassword, newPassword) => {
    if (isMongoAvailable()) {
        const user = await User.findById(id);
        if (!user) return { user: null, validCurrentPassword: false };
        const validCurrentPassword = await user.matchPassword(currentPassword);
        if (!validCurrentPassword) {
            return { user: null, validCurrentPassword: false };
        }
        user.password = newPassword;
        const savedUser = await user.save();
        return {
            user: mapMongoUser(savedUser),
            validCurrentPassword: true,
        };
    }

    const users = await readLocalUsers();
    const index = users.findIndex((entry) => entry._id === id);
    if (index === -1) {
        return { user: null, validCurrentPassword: false };
    }
    const validCurrentPassword = await bcrypt.compare(currentPassword, users[index].password);
    if (!validCurrentPassword) {
        return { user: null, validCurrentPassword: false };
    }
    const salt = await bcrypt.genSalt(10);
    users[index].password = await bcrypt.hash(newPassword, salt);
    users[index].updatedAt = new Date().toISOString();
    await writeLocalUsers(users);
    return {
        user: stripPassword(users[index]),
        validCurrentPassword: true,
    };
};

export const resetUserPasswordByEmail = async (email, newPassword) => {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) {
        return null;
    }

    if (isMongoAvailable()) {
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return null;
        }
        user.password = newPassword;
        const savedUser = await user.save();
        return mapMongoUser(savedUser);
    }

    const users = await readLocalUsers();
    const index = users.findIndex((entry) => entry.email === normalizedEmail);
    if (index === -1) {
        return null;
    }
    const salt = await bcrypt.genSalt(10);
    users[index].password = await bcrypt.hash(newPassword, salt);
    users[index].updatedAt = new Date().toISOString();
    await writeLocalUsers(users);
    return stripPassword(users[index]);
};
