import { createElement } from "react";

const styles = {
  primary:
    "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10",
  secondary:
    "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50",
  outline:
    "bg-transparent text-slate-700 border border-slate-300 hover:bg-slate-50",
  success:
    "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20",
  danger:
    "bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20",
};

const Button = ({
  as = "button",
  variant = "primary",
  className = "",
  children,
  ...props
}) => {
  if (as === "button") {
    return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant] || styles.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
    );
  }

  return createElement(as, {
    className: `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant] || styles.primary} ${className}`,
    ...props,
  }, children);
};

export default Button;
