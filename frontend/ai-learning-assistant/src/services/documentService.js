import axiosInstance from "../utils/axiosInstance";
import API_PATHS from "../utils/apiPaths";

const normalizeDocument = (document) => ({
  ...document,
  uploadedAt: document.uploadedAt || document.uploadDate || document.createdAt,
  updatedAt: document.updatedAt || document.uploadDate || document.createdAt,
  pageCount: document.pageCount || document.numPages || 0,
  cardCount: document.cardCount ?? document.flashcardCount ?? 0,
  quizCount: document.quizCount ?? 0,
  description:
    document.description ||
    `Uploaded study document for ${document.title}.`,
  previewUrl: document.previewUrl || document.filePath || "",
  tags: document.tags || [],
});

const documentService = {
  async getDocuments() {
    const response = await axiosInstance.get(API_PATHS.documents);
    return (response.data.data || []).map(normalizeDocument);
  },

  async getDocumentById(documentId) {
    const response = await axiosInstance.get(`${API_PATHS.documents}/${documentId}`);
    return normalizeDocument(response.data.data);
  },

  async uploadDocument(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "title",
      file?.name?.replace(/\.pdf$/i, "") || "Untitled Study Document",
    );

    const response = await axiosInstance.post(`${API_PATHS.documents}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return normalizeDocument(response.data.document);
  },

  async deleteDocument(documentId) {
    const response = await axiosInstance.delete(`${API_PATHS.documents}/${documentId}`);
    return response.data;
  },

  async saveSummary(documentId, summary) {
    return {
      _id: documentId,
      summary,
    };
  },
};

export default documentService;
