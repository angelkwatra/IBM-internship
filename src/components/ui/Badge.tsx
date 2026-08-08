import type { ReactNode, ElementType } from "react";
import { cn } from "../../lib/cn";

// ── Types ────────────────────────────────────────────────────────

type BadgeVariant = "default" | "primary" | "success" | "warning" | "error";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Show a small coloured dot before the text */
  dot?: boolean;
  /** Optional leading icon component */
  icon?: ElementType;
  children: ReactNode;
  className?: string;
}

// ── Variant styles ───────────────────────────────────────────────

const variantStyles: Record<BadgeVariant, { badge: string; dot: string }> = {
  default: {
    badge: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    dot: "bg-neutral-500",
  },
  primary: {
    badge: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
    dot: "bg-primary-500",
  },
  success: {
    badge:
      "bg-[var(--color-success-light)] text-[var(--color-success-dark)] dark:bg-emerald-900/30 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  warning: {
    badge:
      "bg-[var(--color-warning-light)] text-[var(--color-warning-dark)] dark:bg-amber-900/30 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  error: {
    badge:
      "bg-[var(--color-error-light)] text-[var(--color-error-dark)] dark:bg-rose-900/30 dark:text-rose-300",
    dot: "bg-rose-500",
  },
};

// ── Size styles ──────────────────────────────────────────────────

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-xs px-2 py-1",
};

// ── Component ────────────────────────────────────────────────────

export function Badge({
  variant = "default",
  size = "md",
  dot = false,
  icon: Icon,
  children,
  className,
}: BadgeProps) {
  const v = variantStyles[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium leading-none",
        sizeStyles[size],
        v.badge,
        className
      )}
    >
      {/* Dot indicator */}
      {dot && (
        <span
          className={cn("inline-block size-1.5 shrink-0 rounded-full", v.dot)}
          aria-hidden
        />
      )}

      {/* Leading icon */}
      {Icon && (
        <Icon
          className="size-3 shrink-0"
          aria-hidden
        />
      )}

      {children}
    </span>
  );
}

export default Badge;
