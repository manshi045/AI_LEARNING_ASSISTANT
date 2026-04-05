import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";

const PasswordField = ({
  value,
  onChange,
  placeholder = "",
  className = "",
  inputClassName = "",
  iconClassName = "",
  toggleClassName = "",
  icon: Icon,
  required = false,
  name,
  autoComplete,
  variant = "default",
  textColor,
  placeholderColor,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const { isDark } = useTheme();
  const variantIsDark = variant === "auth" ? true : isDark;
  const resolvedTextColor = textColor || (variantIsDark ? "#f8fafc" : "#0f172a");
  const resolvedPlaceholderColor = placeholderColor || (variantIsDark ? "#64748b" : "#94a3b8");
  const shellStyle = {
    borderColor: variantIsDark ? "#334155" : "#e2e8f0",
    backgroundColor: variantIsDark ? "#1e293b" : "#f8fafc",
  };
  const iconStyle = {
    color: variantIsDark ? "#64748b" : "#94a3b8",
  };
  const toggleStyle = {
    color: variantIsDark ? "#94a3b8" : "#64748b",
  };

  return (
    <div
      className={`app-password-shell app-password-shell--${variant} relative flex h-12 items-center rounded-2xl border ${className}`}
      style={shellStyle}
    >
      {Icon ? (
        <Icon
          size={18}
          className={`app-password-icon absolute left-4 top-1/2 -translate-y-1/2 ${iconClassName}`}
          style={iconStyle}
        />
      ) : null}
      <input
        type={isVisible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        name={name}
        autoComplete={autoComplete}
        className={`app-password-input app-password-input--${variant} w-full bg-transparent outline-none ${Icon ? "pl-11" : "pl-4"} pr-12 ${inputClassName}`}
        style={{
          color: resolvedTextColor,
          caretColor: resolvedTextColor,
          WebkitTextFillColor: resolvedTextColor,
          "--placeholder-color": resolvedPlaceholderColor,
        }}
      />
      <button
        type="button"
        onClick={() => setIsVisible((current) => !current)}
        className={`app-password-toggle absolute right-3 inline-flex h-8 w-8 items-center justify-center rounded-full transition ${toggleClassName}`}
        style={toggleStyle}
        aria-label={isVisible ? "Hide password" : "Show password"}
      >
        {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

export default PasswordField;
