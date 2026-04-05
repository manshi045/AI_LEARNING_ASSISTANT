import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { extractTextFromPDF, getPDFPageCount } from "./pdfParser.js";
import { chunkText } from "./textChunker.js";
import { buildChunkEmbeddings, getEmbeddingConfig } from "./ragService.js";
import { buildPageIndex } from "./vectorlessRagService.js";
import {
  DOCUMENT_PROCESSING_VERSION,
  loadProcessedContent,
  saveProcessedContent,
} from "./documentContentStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, "..", "uploads");

export const resolveStoredFilePath = (storedPath = "") => {
  if (!storedPath) {
    return null;
  }

  if (storedPath.startsWith("/uploads/")) {
    return path.join(__dirname, "..", storedPath.replace(/^\//, ""));
  }

  if (storedPath.includes("/uploads/")) {
    const [, relativePath] = storedPath.split("/uploads/");
    return path.join(uploadsRoot, relativePath);
  }

  return storedPath;
};

export const processDocumentContent = async (document) => {
  const filePath = resolveStoredFilePath(document.filePath);
  if (!filePath) {
    throw new Error("Document file path is missing");
  }

  await fs.access(filePath);

  const fallbackNumPages = document.numPages || (await getPDFPageCount(filePath));
  const { text, pages, numPages } = await extractTextFromPDF(filePath);
  const chunks = chunkText(pages);
  const pageIndex = buildPageIndex(pages, chunks);
  const chunkEmbeddings = await buildChunkEmbeddings(chunks.slice(0, 120));
  const processedContentPath = await saveProcessedContent(document._id, {
    text,
    numPages: numPages || fallbackNumPages,
    chunks,
    pageIndex,
    chunkEmbeddings,
    rag: {
      retrievalMode: "vectorless-primary",
      ...getEmbeddingConfig(),
      indexedPageCount: pageIndex.pageNodes.length,
      indexedSectionCount: pageIndex.sectionNodes.length,
      indexedChunkCount: chunkEmbeddings.length,
    },
  });

  document.extractedText = (text || "").slice(0, 12000);
  document.chunks = chunks.slice(0, 20);
  document.numPages = numPages || fallbackNumPages;
  document.processedContentPath = processedContentPath;
  document.status = "ready";
  await document.save();

  return {
    text,
    chunks,
    numPages: document.numPages,
    processedContentPath,
  };
};

export const ensureDocumentContent = async (document) => {
  if (document?.processedContentPath) {
    try {
      const processedContent = await loadProcessedContent(document);
      if (processedContent?.version === DOCUMENT_PROCESSING_VERSION) {
        return document;
      }
    } catch (error) {
      console.error("Error reading processed content version, reprocessing document:", error);
    }
  }

  if (document?.chunks?.length && document?.status === "ready" && !document?.processedContentPath) {
    return document;
  }

  await processDocumentContent(document);
  return document;
};
