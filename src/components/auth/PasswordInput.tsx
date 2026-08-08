import { useState, forwardRef, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  evaluatePasswordStrength,
  passwordRequirements,
  type PasswordStrength,
} from "../../lib/validation";

interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  showStrength?: boolean;
  showRequirements?: boolean;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label,
      error,
      showStrength = false,
      showRequirements = false,
      className,
      id,
      value,
      ...props
    },
    ref
  ) => {
    const [visible, setVisible] = useState(false);
    const password = typeof value === "string" ? value : "";
    const strength: PasswordStrength = evaluatePasswordStrength(password);
    const inputId = id || "password-input";

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--cv-text)]"
          >
            {label}
          </label>
        )}

        {/* Input wrapper */}
        <div
          className={cn(
            "flex h-9 items-center rounded-lg border bg-[var(--cv-bg-subtle)] transition-colors",
            error
              ? "border-error focus-within:border-error focus-within:ring-1 focus-within:ring-error"
              : "border-[var(--cv-border)] focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500",
            className
          )}
        >
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            value={value}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className="h-full flex-1 bg-transparent px-3 text-sm text-[var(--cv-text)] placeholder:text-[var(--cv-text-muted)] focus:outline-none"
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="flex h-full items-center px-3 text-[var(--cv-text-muted)] transition-colors hover:text-[var(--cv-text)]"
            aria-label={visible ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Error */}
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            aria-live="polite"
            className="text-xs text-error"
          >
            {error}
          </p>
        )}

        {/* Strength meter */}
        {showStrength && password.length > 0 && (
          <div className="space-y-1.5">
            {/* Bar */}
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor:
                      i <= strength.score
                        ? strength.color
                        : "var(--cv-bg-muted)",
                  }}
                />
              ))}
            </div>
            <p
              className="text-xs font-medium"
              style={{ color: strength.color }}
            >
              {strength.label}
            </p>
          </div>
        )}

        {/* Requirements checklist */}
        {showRequirements && password.length > 0 && (
          <ul className="space-y-1 pt-1">
            {passwordRequirements.map((req) => {
              const met = req.test(password);
              return (
                <li
                  key={req.key}
                  className={cn(
                    "flex items-center gap-1.5 text-xs transition-colors",
                    met
                      ? "text-[var(--color-success)]"
                      : "text-[var(--cv-text-muted)]"
                  )}
                >
                  {met ? (
                    <Check size={12} className="shrink-0" />
                  ) : (
                    <X size={12} className="shrink-0" />
                  )}
                  {req.label}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
export default PasswordInput;
