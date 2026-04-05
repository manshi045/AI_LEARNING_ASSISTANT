import { Component } from "react";

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Unexpected frontend error",
    };
  }

  componentDidCatch(error) {
    console.error("App crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-white/5 p-8 text-white backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
              Frontend Error
            </p>
            <h1 className="mt-4 text-3xl font-semibold">The app hit a runtime issue.</h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950"
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
