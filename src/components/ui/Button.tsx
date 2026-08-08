import React from "react";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";
import { useReducedMotion } from "../../hooks/useReducedMotion";

// ── Types ────────────────────────────────────────────────────────
export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
  > {
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Render as a square icon-only button */
  iconOnly?: boolean;
  /** Show loading spinner and disable interaction */
  isLoading?: boolean;
  /** Icon rendered before children */
  leftIcon?: React.ReactNode;
  /** Icon rendered after children */
  rightIcon?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

// ── Style maps ───────────────────────────────────────────────────
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-600 hover:bg-primary-700 text-white dark:bg-primary-500 dark:hover:bg-primary-400",
  secondary:
    "bg-[var(--cv-bg-elevated)] border border-[var(--cv-border)] text-[var(--cv-text)] hover:bg-[var(--cv-bg-muted)]",
  ghost:
    "bg-transparent text-[var(--cv-text-secondary)] hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)]",
  destructive: "bg-error hover:bg-error-dark text-white",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 text-xs px-3 gap-1.5",
  md: "h-9 text-sm px-4 gap-2",
  lg: "h-11 text-base px-6 gap-2.5",
};

const iconOnlySizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
};

// ── Component ────────────────────────────────────────────────────
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      iconOnly = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const prefersReduced = useReducedMotion();
    const isDisabled = disabled || isLoading;

    return (
      <motion.button
        ref={ref}
        disabled={isDisabled}
        whileTap={!prefersReduced && !isDisabled ? { scale: 0.97 } : undefined}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center font-medium rounded-lg",
          "transition-colors duration-150 ease-out",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500",
          "cursor-pointer select-none",
          // Variant
          variantStyles[variant],
          // Size
          iconOnly ? iconOnlySizeStyles[size] : sizeStyles[size],
          iconOnly && "aspect-square p-0",
          // Disabled
          isDisabled && "opacity-50 pointer-events-none",
          className,
        )}
        {...rest}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  },
);

Button.displayName = "Button";
export default Button;

