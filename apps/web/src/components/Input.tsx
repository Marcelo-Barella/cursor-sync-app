import { forwardRef, type InputHTMLAttributes } from "react";
import "./Input.css";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={`field ${className}`.trim()}>
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`field-input ${error ? "field-input--error" : ""}`.trim()}
          {...props}
        />
        {error ? <p className="error-text">{error}</p> : null}
      </div>
    );
  }
);

Input.displayName = "Input";
