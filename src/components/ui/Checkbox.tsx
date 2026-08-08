import React, { useId, useRef, useEffect } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "../../lib/cn";

// ── Types ────────────────────────────────────────────────────────
export interface CheckboxProps {
  /** Controlled checked state */
  checked?: boolean;
  /** Change handler */
  onChange?: (checked: boolean) => void;
  /** Label text rendered beside the checkbox */
  label?: string;
  /** Disable interaction */
  disabled?: boolean;
  /** Indeterminate state (partial selection) */
  indeterminate?: boolean;
  /** HTML id attribute */
  id?: string;
  /** Additional class names */
  className?: string;
}

// ── Component ────────────────────────────────────────────────────
export const Checkbox: React.FC<CheckboxProps> = ({
  checked = false,
  onChange,
  label,
  disabled = false,
  indeterminate = false,
  id: idProp,
  className,
}) => {
  const autoId = useId();
  const id = idProp ?? autoId;
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync indeterminate property (not available as HTML attribute)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const isActive = checked || indeterminate;

  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex items-center gap-2 select-none",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
    >
      {/* Hidden native checkbox */}
      <input
        ref={inputRef}
        type="checkbox"
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="sr-only peer"
        aria-checked={indeterminate ? "mixed" : checked}
      />

      {/* Custom visual checkbox */}
      <div
        className={cn(
          "relative flex items-center justify-center w-4 h-4 rounded shrink-0",
          "border transition-colors duration-150 ease-out",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-500",
          isActive
            ? "bg-primary-600 border-primary-600"
            : "bg-[var(--cv-bg-subtle)] border-[var(--cv-border-strong)]",
        )}
        aria-hidden="true"
      >
        {checked && !indeterminate && (
          <Check size={12} className="text-white" strokeWidth={3} />
        )}
        {indeterminate && (
          <Minus size={12} className="text-white" strokeWidth={3} />
        )}
      </div>

      {/* Label text */}
      {label && (
        <span className="text-sm text-[var(--cv-text)]">{label}</span>
      )}
    </label>
  );
};

Checkbox.displayName = "Checkbox";
export default Checkbox;
