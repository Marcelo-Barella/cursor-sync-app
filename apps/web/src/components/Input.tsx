import { forwardRef, useState, type InputHTMLAttributes } from "react";
import "./Input.css";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", type, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    const [passwordRevealed, setPasswordRevealed] = useState(false);
    const isPassword = type === "password";
    const inputClasses = [
      "field-input",
      error ? "field-input--error" : "",
      isPassword ? "field-input--revealable" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={`field ${className}`.trim()}>
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
        <div className="field-control">
          <input
            ref={ref}
            id={inputId}
            type={isPassword && passwordRevealed ? "text" : type}
            className={inputClasses}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              className="field-reveal"
              aria-label={passwordRevealed ? `Hide ${label}` : `Show ${label}`}
              aria-pressed={passwordRevealed}
              onClick={() => setPasswordRevealed((revealed) => !revealed)}
            >
              {passwordRevealed ? "Hide" : "Show"}
            </button>
          ) : null}
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </div>
    );
  }
);

Input.displayName = "Input";
