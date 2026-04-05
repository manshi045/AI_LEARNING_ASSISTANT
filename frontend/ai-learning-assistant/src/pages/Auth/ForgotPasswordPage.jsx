import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PasswordField from "../../components/common/PasswordField";
import axiosInstance from "../../utils/axiosInstance";
import API_PATHS from "../../utils/apiPaths";
import toast from "../../utils/notify";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSendOtp = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setMessage("");
      const response = await axiosInstance.post(API_PATHS.auth.forgotPasswordSendOtp, { email: formData.email });
      const debugOtp = response?.data?.debugOtp;
      setStep(2);
      setMessage(
        debugOtp
          ? `OTP sent. Development preview OTP: ${debugOtp}`
          : "OTP sent to your registered email. Enter it below to reset your password."
      );
      toast.success("OTP sent successfully");
    } catch (error) {
      setMessage(error.message || "Could not send OTP");
      toast.error(error.message || "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      const mismatchMessage = "Passwords do not match";
      setMessage(mismatchMessage);
      toast.error(mismatchMessage);
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      await axiosInstance.post(API_PATHS.auth.forgotPasswordVerifyOtp, {
        email: formData.email,
        otp: String(formData.otp || "").replace(/\D/g, ""),
        newPassword: formData.newPassword,
      });
      setMessage("Password reset successfully. Please log in with your new password.");
      toast.success("Password reset successful");
      navigate("/login", { replace: true });
    } catch (error) {
      setMessage(error.message || "Could not reset password");
      toast.error(error.message || "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#e0f2fe_100%)] p-4">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-4xl items-center justify-center">
        <div className="w-full max-w-md rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-2xl shadow-slate-300/30 backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Reset Access
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Forgot password</h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {step === 1
              ? "Enter your registered email to receive a password reset OTP."
              : "Enter the OTP from your email and set a new password."}
          </p>

          <form onSubmit={step === 1 ? handleSendOtp : handleVerifyOtp} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                <Mail size={18} className="text-slate-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full bg-transparent outline-none"
                  disabled={step === 2}
                  required
                />
              </div>
            </label>

            {step === 2 ? (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">OTP</span>
                  <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                    <Mail size={18} className="text-slate-400" />
                    <input
                      type="text"
                      value={formData.otp}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          otp: event.target.value.replace(/\D/g, "").slice(0, 6),
                        }))
                      }
                      className="w-full bg-transparent tracking-[0.35em] outline-none"
                      maxLength={6}
                      inputMode="numeric"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">New Password</span>
                  <PasswordField
                    icon={LockKeyhole}
                    value={formData.newPassword}
                    onChange={(event) => setFormData((prev) => ({ ...prev, newPassword: event.target.value }))}
                    variant="default"
                    textColor="#0f172a"
                    placeholderColor="#64748b"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</span>
                  <PasswordField
                    icon={LockKeyhole}
                    value={formData.confirmPassword}
                    onChange={(event) => setFormData((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                    variant="default"
                    textColor="#0f172a"
                    placeholderColor="#64748b"
                    required
                  />
                </label>
              </>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Please wait..." : step === 1 ? "Send OTP" : "Verify OTP & Reset"}
              <ArrowRight size={16} />
            </button>

            {step === 2 ? (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Resend OTP
              </button>
            ) : null}

            {message ? (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {message}
              </p>
            ) : null}
          </form>

          <p className="mt-6 text-sm text-slate-600">
            Back to{" "}
            <Link to="/login" className="font-semibold text-emerald-700">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
