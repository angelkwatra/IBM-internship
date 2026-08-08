import React, { useId } from "react";
import { cn } from "../../lib/cn";
import { Skeleton } from "./Skeleton";

// ── Types ────────────────────────────────────────────────────────
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  /** Label displayed above the input */
  label?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Error message; triggers error state styling */
  error?: string;
  /** Icon rendered inside the input on the left */
  prefixIcon?: React.ReactNode;
  /** Icon rendered inside the input on the right */
  suffixIcon?: React.ReactNode;
  /** Render a loading skeleton instead of the input */
  isLoading?: boolean;
  /** Additional class names applied to the root wrapper */
  className?: string;
}

// ── Component ────────────────────────────────────────────────────
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      prefixIcon,
      suffixIcon,
      isLoading = false,
      className,
      id: idProp,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const hasError = Boolean(error);

    // Loading state
    if (isLoading) {
      return (
        <div className={cn("flex flex-col gap-1.5", className)}>
          {label && <Skeleton variant="text" width="30%" className="h-3.5" />}
          <Skeleton variant="rectangular" className="h-9 w-full rounded-lg" />
          {helperText && <Skeleton variant="text" width="50%" className="h-3" />}
        </div>
      );
    }

    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-[var(--cv-text)]"
          >
            {label}
          </label>
        )}

        {/* Input wrapper */}
        <div
          className={cn(
            "relative flex items-center h-9 rounded-lg",
            "border bg-[var(--cv-bg-subtle)]",
            "transition-colors duration-150 ease-out",
            hasError
              ? "border-error focus-within:border-error focus-within:ring-1 focus-within:ring-error"
              : "border-[var(--cv-border)] focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          {/* Prefix icon */}
          {prefixIcon && (
            <span className="pl-3 text-[var(--cv-text-muted)] shrink-0">
              {prefixIcon}
            </span>
          )}

          {/* Input element */}
          <input
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            aria-describedby={
              [hasError && errorId, helperText && helperId]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className={cn(
              "flex-1 h-full bg-transparent text-sm text-[var(--cv-text)] placeholder:text-[var(--cv-text-muted)]",
              "outline-none",
              prefixIcon ? "pl-2" : "pl-3",
              suffixIcon ? "pr-2" : "pr-3",
              disabled && "cursor-not-allowed",
            )}
            {...rest}
          />

          {/* Suffix icon */}
          {suffixIcon && (
            <span className="pr-3 text-[var(--cv-text-muted)] shrink-0">
              {suffixIcon}
            </span>
          )}
        </div>

        {/* Error message */}
        {hasError && (
          <p
            id={errorId}
            role="alert"
            aria-live="polite"
            className="text-xs text-error"
          >
            {error}
          </p>
        )}

        {/* Helper text */}
        {!hasError && helperText && (
          <p
            id={helperId}
            className="text-xs text-[var(--cv-text-muted)]"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
export default Input;
