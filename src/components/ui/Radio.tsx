import React, { createContext, useContext, useId } from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/cn";
import { useReducedMotion } from "../../hooks/useReducedMotion";

// ── Context ──────────────────────────────────────────────────────
interface RadioContextValue {
  value: string;
  onChange: (value: string) => void;
  name: string;
  disabled?: boolean;
}

const RadioContext = createContext<RadioContextValue | null>(null);

function useRadioContext() {
  const ctx = useContext(RadioContext);
  if (!ctx) {
    throw new Error("RadioItem must be used within a RadioGroup");
  }
  return ctx;
}

// ── RadioGroup ───────────────────────────────────────────────────
export interface RadioGroupProps {
  /** Currently selected value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Accessible group label */
  label?: string;
  /** Layout direction */
  direction?: "row" | "column";
  /** Disable all items */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
  children: React.ReactNode;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onChange,
  label,
  direction = "column",
  disabled = false,
  className,
  children,
}) => {
  const autoId = useId();
  const name = `radio-group-${autoId}`;

  return (
    <RadioContext.Provider value={{ value, onChange, name, disabled }}>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          "flex gap-3",
          direction === "column" ? "flex-col" : "flex-row flex-wrap",
          className,
        )}
      >
        {label && (
          <span className="text-sm font-medium text-[var(--cv-text)] mb-1">
            {label}
          </span>
        )}
        {children}
      </div>
    </RadioContext.Provider>
  );
};

RadioGroup.displayName = "RadioGroup";

// ── RadioItem ────────────────────────────────────────────────────
export interface RadioItemProps {
  /** Value for this option */
  value: string;
  /** Label text */
  label?: string;
  /** Disable this option */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

export const RadioItem: React.FC<RadioItemProps> = ({
  value,
  label,
  disabled: itemDisabled = false,
  className,
}) => {
  const { value: groupValue, onChange, name, disabled: groupDisabled } = useRadioContext();
  const autoId = useId();
  const id = `${name}-${value}-${autoId}`;
  const isSelected = groupValue === value;
  const isDisabled = itemDisabled || groupDisabled;
  const prefersReduced = useReducedMotion();

  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex items-center gap-2 select-none",
        isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
    >
      {/* Hidden native radio */}
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={isSelected}
        disabled={isDisabled}
        onChange={() => onChange(value)}
        className="sr-only peer"
      />

      {/* Custom visual radio */}
      <div
        className={cn(
          "relative flex items-center justify-center w-4 h-4 rounded-full shrink-0",
          "border-2 transition-colors duration-150 ease-out",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-500",
          isSelected
            ? "border-primary-600 bg-white dark:bg-neutral-900"
            : "border-[var(--cv-border-strong)] bg-[var(--cv-bg-subtle)]",
        )}
        aria-hidden="true"
      >
        {/* Inner dot */}
        <motion.div
          className="w-2 h-2 rounded-full bg-primary-600"
          initial={false}
          animate={{
            scale: isSelected ? 1 : 0,
            opacity: isSelected ? 1 : 0,
          }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 500, damping: 30 }
          }
        />
      </div>

      {/* Label text */}
      {label && (
        <span className="text-sm text-[var(--cv-text)]">{label}</span>
      )}
    </label>
  );
};

RadioItem.displayName = "RadioItem";
