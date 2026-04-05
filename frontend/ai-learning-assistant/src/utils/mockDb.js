const STORAGE_KEYS = {
  users: "aila_users",
  session: "aila_session",
  documents: "aila_documents",
  flashcards: "aila_flashcards",
  quizzes: "aila_quizzes",
  activities: "aila_activities",
  initialized: "aila_initialized",
};

const fileUrlCache = new Map();

const getStorage = () => {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
};

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const createId = (prefix) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

const read = (key, fallback) => {
  try {
    const storage = getStorage();
    if (!storage) return fallback;
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  const storage = getStorage();
  if (!storage) return value;
  storage.setItem(key, JSON.stringify(value));
  return value;
};

export const formatBytes = (bytes = 0) => {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const removeOldSeedData = (storage) => {
  const users = read(STORAGE_KEYS.users, []);
  const documents = read(STORAGE_KEYS.documents, []);
  const flashcards = read(STORAGE_KEYS.flashcards, []);
  const quizzes = read(STORAGE_KEYS.quizzes, []);

  const hasOnlyDemoUser =
    users.length === 1 && users[0]?.email === "demo@assistant.ai" && users[0]?.name === "Demo Learner";
  const hasOnlySeedData =
    documents.every((entry) => entry?._id?.startsWith("doc_seed_")) &&
    flashcards.every((entry) => entry?._id?.startsWith("flashset_seed_")) &&
    quizzes.every((entry) => entry?._id?.startsWith("quiz_seed_"));

  if (hasOnlyDemoUser && hasOnlySeedData) {
    storage.removeItem(STORAGE_KEYS.users);
    storage.removeItem(STORAGE_KEYS.documents);
    storage.removeItem(STORAGE_KEYS.flashcards);
    storage.removeItem(STORAGE_KEYS.quizzes);
    storage.removeItem(STORAGE_KEYS.activities);
    storage.removeItem(STORAGE_KEYS.session);
    storage.removeItem("aila_auth_token");
  }
};

export const initializeStorage = () => {
  const storage = getStorage();
  if (!storage) return;

  removeOldSeedData(storage);

  const defaults = {
    [STORAGE_KEYS.users]: [],
    [STORAGE_KEYS.documents]: [],
    [STORAGE_KEYS.flashcards]: [],
    [STORAGE_KEYS.quizzes]: [],
    [STORAGE_KEYS.activities]: [],
  };

  Object.entries(defaults).forEach(([key, fallback]) => {
    if (!storage.getItem(key)) {
      storage.setItem(key, JSON.stringify(fallback));
    }
  });

  storage.setItem(STORAGE_KEYS.initialized, "true");
};

export const mockDb = {
  STORAGE_KEYS,
  wait,
  createId,
  read,
  write,
  fileUrlCache,
  addActivity(title, type) {
    const activities = read(STORAGE_KEYS.activities, []);
    const next = [
      {
        _id: createId("activity"),
        title,
        type,
        createdAt: new Date().toISOString(),
      },
      ...activities,
    ].slice(0, 20);
    write(STORAGE_KEYS.activities, next);
  },
};
