import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "../../utils/notify";
import { useNavigate, useParams } from "react-router-dom";
import quizService from "../../services/quizService";

const QuizTakePage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const data = await quizService.getQuizById(quizId);
        if (data?.completedAt) {
          navigate(`/quizzes/${quizId}/result`, { replace: true });
          return;
        }
        setQuiz(data);
      } catch {
        toast.error("Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      fetchQuiz();
    }
  }, [navigate, quizId]);

  const handleAnswerSelect = (questionId, option) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const data = await quizService.submitQuiz(quizId, answers);
      toast.success("Quiz submitted successfully");
      navigate(`/quizzes/${quizId}/result`, {
        state: { result: data, quiz },
      });
    } catch (error) {
      toast.error(error.message || "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto p-6 text-slate-900 dark:text-slate-100">Loading...</div>;
  }

  if (!quiz || !quiz.questions?.length) {
    return <div className="max-w-4xl mx-auto p-6 text-slate-900 dark:text-slate-100">Quiz not found</div>;
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-4xl mx-auto p-6 text-slate-900 dark:text-slate-100">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ChevronLeft size={16} />
          Back
        </button>

        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {quiz.title || 'Take Quiz'}
        </h1>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">{answeredCount} answered</span>
        </div>

        <div className="relative h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{
              width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">
            Question {currentQuestionIndex + 1}
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {currentQuestion.difficulty || "medium"}
            </span>
          </div>
          <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
            {currentQuestion.question}
          </h2>
        </div>

        <div className="space-y-3">
          {currentQuestion.options?.map((option, index) => {
            const optionValue = typeof option === 'string' ? option : option.text || option.label;
            const isSelected = answers[currentQuestion._id] === optionValue;

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleAnswerSelect(currentQuestion._id, optionValue)}
                className={`w-full text-left p-4 rounded-xl border transition ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-500/15'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-500 dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={isSelected ? "text-emerald-900 dark:text-emerald-100" : "text-slate-800 dark:text-slate-200"}>{optionValue}</span>
                  {isSelected && <CheckCircle2 size={18} className="text-emerald-600" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-8">
          <button
            type="button"
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0))}
            disabled={currentQuestionIndex === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          {currentQuestionIndex === quiz.questions.length - 1 ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setCurrentQuestionIndex((prev) =>
                  Math.min(prev + 1, quiz.questions.length - 1)
                )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Next
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizTakePage;
