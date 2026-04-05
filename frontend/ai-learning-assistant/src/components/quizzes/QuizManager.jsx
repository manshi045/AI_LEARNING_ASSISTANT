import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import toast from "../../utils/notify";
import aiService from "../../services/aiService";
import quizService from "../../services/quizService";
import Button from "../common/Button";
import EmptyState from "../common/EmptyState";
import Modal from "../common/Modal";
import Spinner from "../common/Spinner";
import QuizCard from "./QuizCard";

const QuizManager = ({ documentId }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await quizService.getQuizzesForDocument(documentId);
      setQuizzes(data);
    } catch {
      toast.error("Failed to fetch quizzes");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (documentId) {
      fetchQuizzes();
    }
  }, [documentId, fetchQuizzes]);

  const handleGenerateQuiz = async (event) => {
    event.preventDefault();
    setGenerating(true);
    try {
      await aiService.generateQuiz(documentId, { numQuestions });
      toast.success("Quiz generated successfully");
      setIsGenerateModalOpen(false);
      fetchQuizzes();
    } catch (error) {
      toast.error(error.message || "Failed to generate quiz");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteRequest = (quiz) => {
    setSelectedQuiz(quiz);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedQuiz) return;
    setDeleting(true);
    try {
      await quizService.deleteQuiz(selectedQuiz._id);
      toast.success(`${selectedQuiz.title || "Quiz"} deleted`);
      setIsDeleteModalOpen(false);
      setSelectedQuiz(null);
      setQuizzes((prev) => prev.filter((quiz) => quiz._id !== selectedQuiz._id));
    } catch (error) {
      toast.error(error.message || "Failed to delete quiz");
    } finally {
      setDeleting(false);
    }
  };

  const renderQuizContent = () => {
    if (loading) {
      return <Spinner label="Loading quizzes..." />;
    }

    if (quizzes.length === 0) {
      return (
        <EmptyState
          title="No quizzes yet"
          description="Generate a custom multiple-choice quiz from this document and start testing your understanding."
          actionLabel="Generate Quiz"
          onAction={() => setIsGenerateModalOpen(true)}
        />
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {quizzes.map((quiz) => (
          <QuizCard key={quiz._id} quiz={quiz} onDelete={handleDeleteRequest} />
        ))}
      </div>
    );
  };

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-700">AI Quiz Generator</p>
          <h3 className="text-xl font-semibold text-slate-950">Create practice tests from your notes</h3>
        </div>
        <Button variant="success" onClick={() => setIsGenerateModalOpen(true)}>
          <Plus size={16} />
          Generate Quiz
        </Button>
      </div>

      {renderQuizContent()}

      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Generate New Quiz"
      >
        <form onSubmit={handleGenerateQuiz} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Number of Questions
            </label>
            <input
              type="number"
              value={numQuestions}
              onChange={(event) =>
                setNumQuestions(Math.max(1, parseInt(event.target.value, 10) || 1))
              }
              min="1"
              max="15"
              required
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsGenerateModalOpen(false)}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button type="submit" variant="success" disabled={generating}>
              {generating ? "Generating..." : "Generate Quiz"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Quiz"
      >
        <div className="space-y-5">
          <p className="text-sm leading-7 text-slate-600">
            Delete <span className="font-semibold text-slate-900">{selectedQuiz?.title || "this quiz"}</span>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default QuizManager;
