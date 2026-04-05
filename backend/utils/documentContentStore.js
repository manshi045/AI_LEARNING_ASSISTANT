import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const processedDir = path.join(__dirname, "..", "uploads", "processed");
export const DOCUMENT_PROCESSING_VERSION = 4;

const ensureProcessedDir = async () => {
  await fs.mkdir(processedDir, { recursive: true });
};

export const getProcessedContentPath = async (documentId) => {
  await ensureProcessedDir();
  return path.join(processedDir, `${documentId}.json`);
};

export const saveProcessedContent = async (documentId, content) => {
  const filepath = await getProcessedContentPath(documentId);
  await fs.writeFile(
    filepath,
    JSON.stringify({
      version: DOCUMENT_PROCESSING_VERSION,
      ...content,
    }),
    "utf8",
  );
  return filepath;
};

export const loadProcessedContent = async (document) => {
  if (document?.processedContentPath) {
    const raw = await fs.readFile(document.processedContentPath, "utf8");
    return JSON.parse(raw);
  }

  return {
    version: 0,
    numPages: document?.numPages || 0,
    chunks: document?.chunks || [],
    text: document?.extractedText || "",
    pageIndex: null,
    chunkEmbeddings: [],
  };
};

export const deleteProcessedContent = async (document) => {
  if (!document?.processedContentPath) {
    return;
  }

  await fs.unlink(document.processedContentPath).catch(() => {});
};
