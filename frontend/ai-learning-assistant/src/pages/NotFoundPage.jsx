import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const NotFoundPage = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
    <div className="w-full max-w-xl rounded-[36px] border border-white/10 bg-white/5 p-10 text-center text-white backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">404</p>
      <h1 className="mt-4 text-4xl font-semibold">This page stepped out of the study session.</h1>
      <p className="mt-4 text-base leading-8 text-slate-300">
        The route you opened does not exist in the current frontend workspace.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
      >
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>
    </div>
  </div>
);

export default NotFoundPage;
