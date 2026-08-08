import React, { useId } from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/cn";
import { useReducedMotion } from "../../hooks/useReducedMotion";

// ── Types ────────────────────────────────────────────────────────
export interface ToggleProps {
  /** Controlled checked state */
  checked?: boolean;
  /** Change handler */
  onChange?: (checked: boolean) => void;
  /** Optional label rendered to the right */
  label?: string;
  /** Disable interaction */
  disabled?: boolean;
  /** HTML id attribute */
  id?: string;
  /** Additional class names */
  className?: string;
}

// ── Component ────────────────────────────────────────────────────
export const Toggle: React.FC<ToggleProps> = ({
  checked = false,
  onChange,
  label,
  disabled = false,
  id: idProp,
  className,
}) => {
  const autoId = useId();
  const id = idProp ?? autoId;
  const prefersReduced = useReducedMotion();

  const handleToggle = () => {
    if (!disabled) {
      onChange?.(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {/* Track */}
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative inline-flex items-center shrink-0",
          "w-11 h-6 rounded-full",
          "transition-colors duration-200 ease-out",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500",
          "cursor-pointer",
          checked
            ? "bg-primary-600"
            : "bg-neutral-300 dark:bg-neutral-700",
          disabled && "cursor-not-allowed",
        )}
      >
        {/* Knob */}
        <motion.span
          className="inline-block w-5 h-5 bg-white rounded-full shadow-sm"
          initial={false}
          animate={{
            x: checked ? 22 : 2,
          }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 500, damping: 30 }
          }
          aria-hidden="true"
        />
      </button>

      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className={cn(
            "text-sm text-[var(--cv-text)] select-none",
            disabled ? "cursor-not-allowed" : "cursor-pointer",
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
};

Toggle.displayName = "Toggle";
export default Toggle;
