import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import toast from "../../utils/notify";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import PasswordField from "../../components/common/PasswordField";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setErrorMessage("");
      await login(formData);
      toast.success("Welcome back");
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (error) {
      setErrorMessage(error.message || "Login failed");
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#e0f2fe_100%)] p-4 dark:bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden rounded-[36px] bg-[linear-gradient(160deg,#082f49,#0f172a,#065f46)] p-8 text-white shadow-2xl lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">
              AI Learning Assistant
            </p>
            <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-tight">
              One workspace for documents, AI chat, summaries, flashcards, and quizzes.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-slate-300">
              Upload PDFs, study inside the app, generate revision material instantly, and track your progress from one dashboard.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/8 p-6">
            <p className="text-sm text-slate-300">Secure access</p>
            <p className="mt-2 text-lg font-semibold">Use your registered credentials</p>
            <p className="text-slate-300">Create an account first if this is your first visit.</p>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-2xl shadow-slate-300/30 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/90 dark:shadow-slate-950/40">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Secure Login
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">Continue learning</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Sign in to access your document library, AI tools, flashcards, and quizzes.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
                <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-800">
                  <Mail size={18} className="text-slate-400 dark:text-slate-500" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className="w-full bg-transparent outline-none dark:text-white"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Password</span>
                <PasswordField
                  icon={LockKeyhole}
                  value={formData.password}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, password: event.target.value }))
                  }
                  variant="auth"
                  textColor="#f8fafc"
                  placeholderColor="#64748b"
                  className="border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                  iconClassName="text-slate-400 dark:text-slate-500"
                  toggleClassName="text-slate-500 hover:bg-slate-200/70 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                  inputClassName="auth-password-input"
                  required
                  autoComplete="current-password"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Login"}
                <ArrowRight size={16} />
              </button>

              {errorMessage ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </p>
              ) : null}
            </form>

            <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
              New here?{" "}
              <Link to="/register" className="font-semibold text-emerald-700">
                Create an account
              </Link>
            </p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Forgot your password?{" "}
              <Link to="/forgot-password" className="font-semibold text-emerald-700">
                Reset it here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
