import { useEffect, useState } from "react";
import toast from "../../utils/notify";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Modal";
import PageHeader from "../../components/common/PageHeader";
import Spinner from "../../components/common/Spinner";
import QuizCard from "../../components/quizzes/QuizCard";
import quizService from "../../services/quizService";

const QuizListPage = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        const data = await quizService.getAllQuizzes();
        setQuizzes(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } catch (error) {
        toast.error(error.message || "Failed to load quizzes");
      } finally {
        setLoading(false);
      }
    };

    loadQuizzes();
  }, []);

  const handleDelete = async () => {
    if (!selectedQuiz) return;

    try {
      setDeleting(true);
      await quizService.deleteQuiz(selectedQuiz._id);
      setQuizzes((prev) => prev.filter((quiz) => quiz._id !== selectedQuiz._id));
      toast.success("Quiz deleted");
      setSelectedQuiz(null);
    } catch (error) {
      toast.error(error.message || "Failed to delete quiz");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        badge="Quiz Center"
        title="All generated quizzes"
        description="Review every generated quiz here. Open a quiz to attempt it or revisit the result breakdown after submission."
      />

      {loading ? <Spinner label="Loading quizzes..." /> : null}

      {!loading && quizzes.length === 0 ? (
        <EmptyState
          title="No quizzes yet"
          description="Generate quizzes from any document to see them here."
        />
      ) : null}

      {!loading && quizzes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((quiz) => (
            <QuizCard key={quiz._id} quiz={quiz} onDelete={setSelectedQuiz} />
          ))}
        </div>
      ) : null}

      <Modal
        isOpen={Boolean(selectedQuiz)}
        onClose={() => setSelectedQuiz(null)}
        title="Delete Quiz"
      >
        <div className="space-y-5">
          <p className="text-sm leading-7 text-slate-600">
            Delete <span className="font-semibold text-slate-900">{selectedQuiz?.title || "this quiz"}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setSelectedQuiz(null)}
              disabled={deleting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
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

export default QuizListPage;
