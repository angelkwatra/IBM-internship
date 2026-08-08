import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X, FileText, Share2, MessageSquare, Inbox } from "lucide-react";
import { cn } from "../../lib/cn";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { EmptyState } from "../ui/EmptyState";

// ── Component ────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  iconType: "share" | "message" | "file" | "inbox";
  read: boolean;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
}

const iconMap = {
  share: Share2,
  message: MessageSquare,
  file: FileText,
  inbox: Inbox,
};

export function NotificationPanel({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
}: NotificationPanelProps) {
  const prefersReduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      const raf = requestAnimationFrame(() => {
        const close = panelRef.current?.querySelector<HTMLElement>(
          "button[aria-label='Close notifications']"
        );
        close?.focus();
      });
      return () => cancelAnimationFrame(raf);
    } else {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Mark all read when panel opens
  useEffect(() => {
    if (isOpen) {
      onMarkAllRead();
    }
  }, [isOpen, onMarkAllRead]);

  // Escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose]
  );

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  const showEmpty = notifications.length === 0;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm dark:bg-black/50"
          initial={{ opacity: prefersReduced ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReduced ? 0 : 0.15 }}
          onClick={handleOverlayClick}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            initial={prefersReduced ? undefined : { x: "100%" }}
            animate={{ x: 0 }}
            exit={prefersReduced ? undefined : { x: "100%" }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 35,
              ...(prefersReduced ? { duration: 0 } : {}),
            }}
            className={cn(
              "flex h-full w-full max-w-sm flex-col",
              "border-l border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]",
              "shadow-2xl"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--cv-border)] px-5 py-4">
              <h2 className="text-base font-semibold text-[var(--cv-text)]">
                Notifications
              </h2>
              <button
                onClick={onClose}
                aria-label="Close notifications"
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-md",
                  "text-[var(--cv-text-muted)] transition-colors",
                  "hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)]",
                  "focus-visible:outline-2 focus-visible:outline-[var(--cv-ring)]"
                )}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {showEmpty ? (
                <EmptyState
                  icon={Inbox}
                  title="All caught up"
                  description="No new notifications right now."
                />
              ) : (
                <ul className="divide-y divide-[var(--cv-border)]">
                  {notifications.map((n) => {
                    const Icon = iconMap[n.iconType] || Inbox;
                    return (
                      <li
                        key={n.id}
                        className={cn(
                          "flex gap-3 px-5 py-4 transition-colors hover:bg-[var(--cv-bg-muted)]",
                          !n.read && "bg-primary-50/50 dark:bg-primary-950/10"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            "bg-[var(--cv-bg-muted)] text-[var(--cv-text-secondary)]"
                          )}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "text-sm",
                              n.read
                                ? "text-[var(--cv-text-secondary)]"
                                : "font-medium text-[var(--cv-text)]"
                            )}
                          >
                            {n.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-[var(--cv-text-muted)]">
                            {n.description}
                          </p>
                          <p className="mt-1 text-[10px] text-[var(--cv-text-muted)]">
                            {n.time}
                          </p>
                        </div>
                        {!n.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default NotificationPanel;
