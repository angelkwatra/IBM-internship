import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "../../lib/cn";
import {
  toastVariants,
  toastTransition,
  getTransition,
} from "../../lib/motion";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/* ─── Types ───────────────────────────────────────────────────── */
export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration: number;
}

export interface ToastProps extends ToastData {
  onDismiss: (id: string) => void;
}

/* ─── Variant config ──────────────────────────────────────────── */
const variantConfig: Record<
  ToastVariant,
  { icon: React.ElementType; accent: string; iconColor: string }
> = {
  success: {
    icon: CheckCircle,
    accent: "bg-emerald-500",
    iconColor: "text-emerald-500",
  },
  error: {
    icon: XCircle,
    accent: "bg-rose-500",
    iconColor: "text-rose-500",
  },
  warning: {
    icon: AlertTriangle,
    accent: "bg-amber-500",
    iconColor: "text-amber-500",
  },
  info: {
    icon: Info,
    accent: "bg-sky-500",
    iconColor: "text-sky-500",
  },
};

/* ─── Component ───────────────────────────────────────────────── */
export function Toast({ id, variant, title, message, duration, onDismiss }: ToastProps) {
  const prefersReduced = useReducedMotion();
  const transition = getTransition(toastTransition, prefersReduced);
  const { icon: Icon, accent, iconColor } = variantConfig[variant];

  // Track remaining fraction for progress bar
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    const start = Date.now();
    let raf: number;

    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 1 - elapsed / duration);
      setProgress(remaining);
      if (remaining > 0) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration]);

  return (
    <motion.div
      layout
      variants={toastVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={transition}
      role="alert"
      aria-live="assertive"
      className={cn(
        "pointer-events-auto relative flex max-w-sm overflow-hidden",
        "rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]",
        "shadow-[var(--cv-shadow-lg)]"
      )}
    >
      {/* ── Accent bar ──────────────────────────────────────── */}
      <div className={cn("w-1 shrink-0 rounded-l-lg", accent)} />

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="flex flex-1 items-start gap-3 px-3 py-3">
        <Icon size={18} className={cn("mt-0.5 shrink-0", iconColor)} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--cv-text)]">{title}</p>
          {message && (
            <p className="mt-0.5 text-xs text-[var(--cv-text-secondary)] leading-snug">
              {message}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onDismiss(id)}
          aria-label="Dismiss notification"
          className={cn(
            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
            "text-[var(--cv-text-muted)] transition-colors duration-150",
            "hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)]",
            "focus-visible:outline-2 focus-visible:outline-[var(--cv-ring)] focus-visible:outline-offset-2"
          )}
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Progress bar ────────────────────────────────────── */}
      <div
        className={cn("absolute bottom-0 left-0 h-0.5", accent)}
        style={{
          width: `${progress * 100}%`,
          transition: "width 50ms linear",
          opacity: 0.6,
        }}
      />
    </motion.div>
  );
}

export default Toast;
