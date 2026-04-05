import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  RotateCcw,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";
import quizService from "../../services/quizService";
import Spinner from "../../components/common/Spinner";

const QuizResultPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [quiz, setQuiz] = useState(state?.quiz || null);
  const [result, setResult] = useState(state?.result || null);
  const [loading, setLoading] = useState(!state?.quiz || !state?.result);
  const [openWhyWrong, setOpenWhyWrong] = useState({});

  useEffect(() => {
    if (quiz && result) {
      setLoading(false);
      return;
    }

    const loadResult = async () => {
      try {
        setLoading(true);
        const data = await quizService.getQuizResult(quizId);
        setQuiz(data.quiz);
        setResult(data.result);
      } catch {
        setQuiz(null);
        setResult(null);
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      loadResult();
    }
  }, [quiz, quizId, result]);

  if (loading) {
    return <Spinner label="Loading quiz result..." />;
  }

  if (!quiz || !result) {
    return <div className="max-w-4xl mx-auto p-6 text-slate-900 dark:text-slate-100">Quiz result not found</div>;
  }

  const totalQuestions = quiz.questions?.length || 0;
  const correctAnswers = result.correctAnswers ?? result.correct ?? 0;
  const wrongAnswers = Math.max(totalQuestions - correctAnswers, 0);
  const score = result.score ?? correctAnswers;
  const accuracy = totalQuestions
    ? Math.round((correctAnswers / totalQuestions) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto p-6 text-slate-900 dark:text-slate-100">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {quiz.title || 'Quiz Result'}
        </h1>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
            <Trophy className="text-emerald-600" size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Quiz Completed</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Here&apos;s your final performance</p>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Accuracy</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">{accuracy}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/80">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{score}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Score</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/80">
            <p className="text-2xl font-bold text-emerald-600">{correctAnswers}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Correct</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/80">
            <p className="text-2xl font-bold text-red-500">{wrongAnswers}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Wrong</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/80">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalQuestions}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <button
            type="button"
          onClick={() => navigate(`/quizzes/${quiz._id}`)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <RotateCcw size={16} />
          Retake Quiz
        </button>

          {quiz?.document?._id || quiz?.documentId ? (
            <Link
              to={`/documents/${quiz?.document?._id || quiz?.documentId}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Target size={16} />
              Return to Document
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Target size={16} />
              Back to Quiz
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {quiz.questions?.map((question, index) => {
          const answerData =
            result.answers?.[question._id] ||
            result.answers?.find?.((item) => item.questionId === question._id) ||
            {};

          const userAnswer =
            answerData.userAnswer ||
            result.userAnswers?.[question._id] ||
            "Not answered";

          const correctAnswer =
            question.correctAnswer || answerData.correctAnswer || "N/A";

          const isCorrect = userAnswer === correctAnswer;

          return (
            <div
              key={question._id || index}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <span className="mb-3 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Question {index + 1}
                  </span>
                  <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {question.difficulty || answerData.difficulty || "medium"}
                  </span>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {question.question}
                  </h3>
                </div>

                {isCorrect ? (
                  <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
                ) : (
                  <XCircle className="text-red-500 shrink-0" size={20} />
                )}
              </div>

              <div className="space-y-3">
                {question.options?.map((option, optionIndex) => {
                  const optionValue =
                    typeof option === 'string' ? option : option.text || option.label;

                  const isUserAnswer = userAnswer === optionValue;
                  const isCorrectOption = correctAnswer === optionValue;

                  return (
                    <div
                      key={optionIndex}
                      className={`rounded-xl border px-4 py-3 ${
                        isCorrectOption
                          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-500/15"
                          : isUserAnswer
                            ? "border-rose-300 bg-rose-50 dark:border-rose-500/50 dark:bg-rose-500/15"
                            : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`text-sm ${
                            isCorrectOption
                              ? "text-emerald-900 dark:text-emerald-100"
                              : isUserAnswer
                                ? "text-rose-900 dark:text-rose-100"
                                : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {optionValue}
                        </span>

                        <div className="flex items-center gap-2">
                          {isCorrectOption && (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                              Correct
                            </span>
                          )}
                          {isUserAnswer && !isCorrectOption && (
                            <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">
                              Your Answer
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {question.explanation && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/80">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                        <FileText size={16} className="text-slate-500 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Explanation
                        </p>
                        <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
                          {question.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!isCorrect ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/40 dark:bg-rose-500/10">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenWhyWrong((prev) => ({
                          ...prev,
                          [question._id || index]: !prev[question._id || index],
                        }))
                      }
                      className="text-sm font-semibold text-rose-700 dark:text-rose-200"
                    >
                      Why was my answer wrong?
                    </button>
                    {openWhyWrong[question._id || index] ? (
                      <p className="mt-3 text-sm leading-7 text-rose-800 dark:text-rose-100">
                        {answerData.whyWrong ||
                          `Your answer was "${userAnswer}". The correct answer is "${correctAnswer}". ${question.explanation || ""}`}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuizResultPage;
