import React, { useEffect, useRef, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import {
  modalOverlayVariants,
  modalContentVariants,
  modalTransition,
  getTransition,
} from "../../lib/motion";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/* ─── Size map ────────────────────────────────────────────────── */
const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
} as const;

/* ─── Focusable selector ──────────────────────────────────────── */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* ─── Props ───────────────────────────────────────────────────── */
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: keyof typeof sizeClasses;
  closeOnOverlayClick?: boolean;
  className?: string;
}

/* ─── Component ───────────────────────────────────────────────── */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  closeOnOverlayClick = true,
  className,
}: ModalProps) {
  const prefersReduced = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const transition = getTransition(modalTransition, prefersReduced);

  /* ── Focus management ─────────────────────────────────────── */
  useEffect(() => {
    if (isOpen) {
      // Store the element that had focus before the modal opened
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Wait one frame for the DOM to render, then focus first focusable
      const raf = requestAnimationFrame(() => {
        const first = contentRef.current?.querySelector<HTMLElement>(FOCUSABLE);
        first?.focus();
      });

      return () => cancelAnimationFrame(raf);
    } else {
      // Restore focus on close
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  /* ── Escape key ───────────────────────────────────────────── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose]
  );

  /* ── Overlay click ────────────────────────────────────────── */
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnOverlayClick, onClose]
  );

  /* ── Render via portal ────────────────────────────────────── */
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm dark:bg-black/60"
          variants={modalOverlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={transition}
          onClick={handleOverlayClick}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={transition}
            className={cn(
              "relative w-full rounded-xl bg-[var(--cv-bg-elevated)] shadow-xl",
              "border border-[var(--cv-border)] mx-4",
              sizeClasses[size],
              className
            )}
          >
            {/* ── Close button ─────────────────────────────── */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className={cn(
                "absolute right-3 top-3 inline-flex items-center justify-center",
                "h-7 w-7 rounded-md text-[var(--cv-text-muted)]",
                "transition-colors duration-150",
                "hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)]",
                "focus-visible:outline-2 focus-visible:outline-[var(--cv-ring)] focus-visible:outline-offset-2"
              )}
            >
              <X size={16} />
            </button>

            {/* ── Title ────────────────────────────────────── */}
            {title && (
              <div className="border-b border-[var(--cv-border)] px-6 pb-4 pt-5">
                <h2
                  id={titleId}
                  className="text-base font-semibold text-[var(--cv-text)]"
                >
                  {title}
                </h2>
              </div>
            )}

            {/* ── Body ─────────────────────────────────────── */}
            <div className={cn("px-6 py-5", !title && "pt-10")}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default Modal;
