import { BookOpenText, FileText, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "../../utils/notify";
import { Link, useNavigate, useParams } from "react-router-dom";
import AIActions from "../../components/ai/AIActions";
import Button from "../../components/common/Button";
import PageHeader from "../../components/common/PageHeader";
import Spinner from "../../components/common/Spinner";
import Tabs from "../../components/common/Tabs";
import FlashcardManager from "../../components/flashcards/FlashcardManager";
import QuizManager from "../../components/quizzes/QuizManager";
import ChatInterface from "../../chat/ChatInterface";
import documentService from "../../services/documentService";
import { formatBytes, formatDate } from "../../utils/mockDb";

const tabItems = [
  { label: "Overview", value: "overview" },
  { label: "AI Chat", value: "chat" },
  { label: "Flashcards", value: "flashcards" },
  { label: "Quizzes", value: "quizzes" },
];

const DocumentDetailPage = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        const data = await documentService.getDocumentById(documentId);
        setDocument(data);
      } catch (error) {
        toast.error(error.message || "Failed to load document");
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      loadDocument();
    }
  }, [documentId]);

  useEffect(() => {
    if (!documentId || !document || document.status === "ready") {
      return undefined;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const data = await documentService.getDocumentById(documentId);
        setDocument(data);
      } catch {
        window.clearInterval(intervalId);
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [document, documentId]);

  const metadata = useMemo(
    () =>
      document
        ? [
            { label: "File", value: document.fileName },
            { label: "Size", value: formatBytes(document.fileSize) },
            { label: "Pages", value: `${document.pageCount} pages` },
            { label: "Uploaded", value: formatDate(document.uploadedAt) },
          ]
        : [],
    [document],
  );

  const handleDelete = async () => {
    if (!document) return;
    try {
      setDeleting(true);
      await documentService.deleteDocument(document._id);
      toast.success("Document deleted");
      navigate("/documents");
    } catch (error) {
      toast.error(error.message || "Failed to delete document");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <Spinner label="Opening document workspace..." />;
  }

  if (!document) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-8">
        <p className="text-lg font-semibold text-slate-900">Document not found</p>
        <Link to="/documents" className="mt-4 inline-flex text-sm font-semibold text-emerald-700">
          Return to documents
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        badge="Document Workspace"
        title={document.title}
        description={document.description}
        actions={
          <>
            <Button variant="secondary" as={Link} to="/documents">
              Back to documents
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              <Trash2 size={16} />
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      />

      <Tabs items={tabItems} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">Embedded PDF Viewer</p>
                  <h3 className="text-xl font-semibold text-slate-950">Read inside the app</h3>
                </div>
              </div>

              {document.previewUrl ? (
                <iframe
                  title={document.title}
                  src={document.previewUrl}
                  className="h-[640px] w-full rounded-[24px] border border-slate-200"
                />
              ) : (
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <BookOpenText size={32} className="text-slate-400" />
                  <p className="mt-4 text-lg font-semibold text-slate-900">Preview available after upload session</p>
                  <p className="mt-2 max-w-md text-sm leading-7 text-slate-500">
                    PDF preview will appear here once the uploaded file is available from the backend.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700">Document Insights</p>
                  <h3 className="text-xl font-semibold text-slate-950">Quick details</h3>
                </div>
              </div>

              <div className="space-y-3">
                {metadata.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <span className="text-sm text-slate-500">{item.label}</span>
                    <span className="text-right text-sm font-semibold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>

              {document.status !== "ready" ? (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  This document is still processing. Page count, chat, flashcards, and quizzes become more accurate after processing finishes.
                </div>
              ) : null}

              {document.tags?.length ? (
                <div className="mt-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {document.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <AIActions
            document={document}
            onSummaryGenerated={(summary) => setDocument((prev) => ({ ...prev, summary }))}
          />
        </div>
      ) : null}

      {activeTab === "chat" ? <ChatInterface documentId={document._id} /> : null}
      {activeTab === "flashcards" ? <FlashcardManager documentId={document._id} /> : null}
      {activeTab === "quizzes" ? <QuizManager documentId={document._id} /> : null}
    </div>
  );
};

export default DocumentDetailPage;
