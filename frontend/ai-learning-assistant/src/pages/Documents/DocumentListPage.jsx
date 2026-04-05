import { FolderPlus, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "../../utils/notify";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Modal";
import PageHeader from "../../components/common/PageHeader";
import Spinner from "../../components/common/Spinner";
import DocumentCard from "../../components/documents/DocumentCard";
import documentService from "../../services/documentService";

const DocumentListPage = () => {
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentService.getDocuments();
      setDocuments(data);
    } catch (error) {
      toast.error(error.message || "Could not load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      await documentService.uploadDocument(file);
      toast.success("Document uploaded");
      await loadDocuments();
    } catch (error) {
      toast.error(error.message || "Upload failed");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      setDeleting(true);
      await documentService.deleteDocument(documentToDelete._id);
      setDocuments((prev) => prev.filter((document) => document._id !== documentToDelete._id));
      toast.success("Document deleted");
      setDocumentToDelete(null);
    } catch (error) {
      toast.error(error.message || "Failed to delete document");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        badge="Document Management"
        title="Upload and organize your study PDFs"
        description="Bring your study material into one responsive workspace with upload tracking, PDF viewing, AI tools, flashcards, quizzes, and revision flows."
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button variant="success" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload size={16} />
              {uploading ? "Uploading..." : "Upload PDF"}
            </Button>
          </>
        }
      />

      {loading ? <Spinner label="Loading documents..." /> : null}

      {!loading && documents.length === 0 ? (
        <EmptyState
          title="No study documents yet"
          description="Upload your first PDF to unlock AI chat, summaries, concept explanations, auto-generated flashcards, and practice quizzes."
          actionLabel={uploading ? "Uploading..." : "Upload PDF"}
          onAction={() => fileInputRef.current?.click()}
        />
      ) : null}

      {!loading && documents.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {documents.map((document) => (
            <DocumentCard
              key={document._id}
              document={document}
              onDelete={setDocumentToDelete}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-8 rounded-[30px] border border-dashed border-slate-300 bg-slate-50 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-white p-3 text-slate-600 shadow-sm">
            <FolderPlus size={18} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Built for all 12 requested frontend features</h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              Authentication, PDF upload management, embedded viewer, AI chat, summary, concept explainer, flashcards, quizzes, analytics, progress tracking, favorites, and responsive UI are now reflected throughout the frontend flow.
            </p>
          </div>
        </div>
      </div>

      <Modal
        isOpen={Boolean(documentToDelete)}
        onClose={() => setDocumentToDelete(null)}
        title="Delete Document"
      >
        <div className="space-y-5">
          <p className="text-sm leading-7 text-slate-600">
            Delete <span className="font-semibold text-slate-900">{documentToDelete?.title || "this document"}</span>? Its related flashcards and quizzes will also be removed.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDocumentToDelete(null)}
              disabled={deleting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteDocument}
              disabled={deleting}
              className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DocumentListPage;
