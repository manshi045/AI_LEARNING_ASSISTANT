import { ArrowRight, LockKeyhole, Mail, User2 } from "lucide-react";
import { useState } from "react";
import toast from "../../utils/notify";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import PasswordField from "../../components/common/PasswordField";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
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
      await register(formData);
      toast.success("Account created");
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(error.message || "Could not create account");
      toast.error(error.message || "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.18),_transparent_28%),linear-gradient(180deg,#fff7ed_0%,#eff6ff_100%)] p-4 dark:bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.15),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[36px] border border-white/70 bg-white/90 shadow-2xl shadow-slate-300/30 backdrop-blur lg:grid-cols-[0.95fr_1.05fr]">
          <div className="bg-[linear-gradient(160deg,#7c2d12,#ea580c,#f59e0b)] p-8 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-100">
              JWT-ready onboarding
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight">
              Build your personal AI study workspace.
            </h1>
            <p className="mt-5 text-base leading-8 text-amber-50/90">
              Create an account to manage documents, generate summaries, review flashcards, and track quiz performance in one place.
            </p>
          </div>

          <div className="p-8 dark:bg-slate-900/90">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-700">
              Sign Up
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">Create your account</h2>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Full Name</span>
                <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-800">
                  <User2 size={18} className="text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="w-full bg-transparent outline-none dark:text-white"
                    required
                  />
                </div>
              </label>

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
                  autoComplete="new-password"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Account"}
                <ArrowRight size={16} />
              </button>

              {errorMessage ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </p>
              ) : null}
            </form>

            <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-orange-700">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
