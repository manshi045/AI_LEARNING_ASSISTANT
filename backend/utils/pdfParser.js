import fs from "fs/promises";
import { PDFParse } from "pdf-parse";

const normalizeExtractedPageText = (value = "") =>
  String(value || "")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \f\v]+/g, " ")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s*([●•◦▪])\s*/g, "\n$1 ")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const getPDFPageCount = async (filepath) => {
  let parser;

  try {
    const dataBuffer = await fs.readFile(filepath);
    parser = new PDFParse({ data: dataBuffer });
    const info = await parser.getInfo();
    return info.total || 0;
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }
};

/**
 * Extract text from a PDF file with per-page text included.
 * @param {string} filepath
 * @returns {Promise<{text: string, numPages: number, info: object, pages: Array<{pageNumber: number, text: string}>}>}
 */
export const extractTextFromPDF = async (filepath) => {
  let parser;

  try {
    const dataBuffer = await fs.readFile(filepath);
    parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();

    const pages = (result.pages || []).map((page, index) => ({
      pageNumber: page.page ?? index + 1,
      text: normalizeExtractedPageText(page.text || ""),
    }));

    return {
      text: normalizeExtractedPageText(result.text || pages.map((page) => page.text).join("\n\n")),
      numPages: result.total || pages.length,
      info: result.info || {},
      pages,
    };
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw error;
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }
};
