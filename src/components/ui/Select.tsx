import React, { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { Skeleton } from "./Skeleton";

// ── Types ────────────────────────────────────────────────────────
export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  /** Label displayed above the select */
  label?: string;
  /** Helper text displayed below the select */
  helperText?: string;
  /** Error message; triggers error state styling */
  error?: string;
  /** Available options */
  options: SelectOption[];
  /** Placeholder text shown when no value is selected */
  placeholder?: string;
  /** Render a loading skeleton instead of the select */
  isLoading?: boolean;
  /** Additional class names applied to the root wrapper */
  className?: string;
}

// ── Component ────────────────────────────────────────────────────
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      error,
      options,
      placeholder,
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

        {/* Select wrapper */}
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
          <select
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
              "w-full h-full bg-transparent text-sm text-[var(--cv-text)]",
              "appearance-none outline-none",
              "pl-3 pr-9",
              disabled && "cursor-not-allowed",
              // Placeholder style when default option is selected
              !rest.value && placeholder && "text-[var(--cv-text-muted)]",
            )}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Custom chevron */}
          <ChevronDown
            size={16}
            className="absolute right-3 pointer-events-none text-[var(--cv-text-muted)]"
            aria-hidden="true"
          />
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

Select.displayName = "Select";
export default Select;
