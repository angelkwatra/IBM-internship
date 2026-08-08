/**
 * UploadManager.tsx — Persistent floating panel for upload progress.
 *
 * Bottom-right floating panel that persists across route navigation.
 * Collapsed: summary bar with progress. Expanded: full upload list.
 * Below 768px: full-width bottom sheet.
 */

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  Shield,
  Minus,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useUpload } from "../../context/UploadContext";
import { ProgressBar } from "../ui/ProgressBar";
import { FileTypeIconInline } from "../files/FileTypeIcon";
import { formatBytes } from "../../services/fileService";
import type { UploadStatus } from "../../services/uploadService";
import type { FileItemType } from "../../services/fileService";

// ── Status config ────────────────────────────────────────────────

const statusConfig: Record<
  UploadStatus,
  { label: string; icon: React.ElementType; color: string }
> = {
  waiting: { label: "Waiting...", icon: Clock, color: "text-[var(--cv-text-muted)]" },
  preparing: { label: "Preparing", icon: Loader2, color: "text-sky-500" },
  uploading: { label: "Uploading", icon: Loader2, color: "text-primary-500" },
  scanning: { label: "Scanning", icon: Shield, color: "text-violet-500" },
  complete: { label: "Complete", icon: CheckCircle, color: "text-emerald-500" },
  failed: { label: "Failed", icon: AlertCircle, color: "text-rose-500" },
  cancelled: { label: "Cancelled", icon: X, color: "text-neutral-400" },
};

// ── Component ────────────────────────────────────────────────────

export function UploadManager() {
  const {
    uploads,
    cancelUpload,
    retryUpload,
    clearCompleted,
    dismissPanel,
    hasActive,
    isPanelVisible,
    isPanelExpanded,
    togglePanel,
    totalProgress,
    activeCount,
    totalCount,
  } = useUpload();

  const prefersReduced = useReducedMotion();
  const ariaRef = useRef<HTMLDivElement>(null);
  const lastAnnouncedRef = useRef(0);

  // Track completed items for auto-fade (2s after completion)
  const [fadedIds, setFadedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const completedItems = uploads.filter(
      (u) => u.status === "complete" && !fadedIds.has(u.id)
    );

    if (completedItems.length === 0) return;

    // Only auto-fade completed items when other uploads are still active
    if (!hasActive) return;

    const timers = completedItems.map((item) =>
      setTimeout(() => {
        setFadedIds((prev) => new Set([...prev, item.id]));
      }, 2000)
    );

    return () => timers.forEach(clearTimeout);
  }, [uploads, hasActive, fadedIds]);

  // aria-live announcements at 25%, 50%, 75%, 100%
  useEffect(() => {
    const milestones = [25, 50, 75, 100];
    const currentMilestone = milestones.find(
      (m) => totalProgress >= m && lastAnnouncedRef.current < m
    );
    if (currentMilestone) {
      lastAnnouncedRef.current = currentMilestone;
    }
  }, [totalProgress]);

  // Reset announced milestone when a new batch starts
  useEffect(() => {
    if (totalCount === 0) {
      lastAnnouncedRef.current = 0;
      setFadedIds(new Set());
    }
  }, [totalCount]);

  if (!isPanelVisible || totalCount === 0) return null;

  const completedCount = uploads.filter((u) => u.status === "complete").length;
  const failedCount = uploads.filter((u) => u.status === "failed").length;
  const fadedCompletedCount = uploads.filter(
    (u) => u.status === "complete" && fadedIds.has(u.id)
  ).length;

  // Compute which items to display
  const visibleUploads = uploads.filter((u) => {
    // Don't show cancelled
    if (u.status === "cancelled") return false;
    // Don't show faded completed items (when hasActive)
    if (u.status === "complete" && fadedIds.has(u.id) && hasActive) return false;
    return true;
  });

  const ariaMessage =
    hasActive
      ? `Uploading ${activeCount} of ${totalCount} files. ${totalProgress}% complete.`
      : `Upload complete. ${completedCount} succeeded, ${failedCount} failed.`;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={prefersReduced ? undefined : { y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
          ...(prefersReduced ? { duration: 0 } : {}),
        }}
        className={cn(
          "fixed z-50 overflow-hidden",
          "rounded-t-xl border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]",
          "shadow-[var(--cv-shadow-xl)]",
          // Responsive: full-width bottom sheet below 768px, floating panel above
          "bottom-0 right-0 w-full md:bottom-4 md:right-4 md:w-[380px] md:rounded-xl"
        )}
      >
        {/* ── Header / Collapsed bar ────────────────────────────── */}
        <button
          onClick={togglePanel}
          className={cn(
            "flex w-full items-center gap-3 px-4 py-3",
            "bg-[var(--cv-bg-muted)] transition-colors hover:bg-[var(--cv-bg-muted)]"
          )}
          aria-expanded={isPanelExpanded}
        >
          <div className="flex-1 min-w-0 text-left">
            {hasActive ? (
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="shrink-0 animate-spin text-primary-500" />
                <span className="truncate text-sm font-medium text-[var(--cv-text)]">
                  Uploading {activeCount} file{activeCount !== 1 ? "s" : ""}… {totalProgress}%
                </span>
              </div>
            ) : (
              <span className="text-sm font-medium text-[var(--cv-text)]">
                {completedCount > 0 && `${completedCount} complete`}
                {failedCount > 0 && (completedCount > 0 ? `, ` : "") + `${failedCount} failed`}
                {completedCount === 0 && failedCount === 0 && "Uploads"}
              </span>
            )}

            {/* Mini progress bar in collapsed state */}
            {!isPanelExpanded && hasActive && (
              <div className="mt-1.5">
                <ProgressBar value={totalProgress} size="sm" color="primary" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Minimize / Expand toggle */}
            {isPanelExpanded ? (
              <ChevronDown size={16} className="text-[var(--cv-text-muted)]" />
            ) : (
              <ChevronUp size={16} className="text-[var(--cv-text-muted)]" />
            )}

            {/* Close / Dismiss — disabled while active */}
            {!hasActive && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  dismissPanel();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    dismissPanel();
                  }
                }}
                className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-[var(--cv-text-muted)] transition-colors hover:bg-[var(--cv-bg-elevated)] hover:text-[var(--cv-text)]"
                aria-label="Close upload panel"
              >
                <X size={14} />
              </span>
            )}

            {hasActive && (
              <span
                className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-[var(--cv-text-muted)] opacity-30 cursor-not-allowed"
                title="Cannot close while uploads are active"
              >
                <Minus size={14} />
              </span>
            )}
          </div>
        </button>

        {/* ── Expanded list ──────────────────────────────────────── */}
        <AnimatePresence>
          {isPanelExpanded && (
            <motion.div
              initial={prefersReduced ? undefined : { height: 0 }}
              animate={{ height: "auto" }}
              exit={prefersReduced ? undefined : { height: 0 }}
              transition={{ duration: prefersReduced ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="max-h-[320px] overflow-y-auto">
                {/* Completed summary line */}
                {fadedCompletedCount > 0 && hasActive && (
                  <div className="flex items-center gap-2 border-b border-[var(--cv-border)] px-4 py-2">
                    <CheckCircle size={14} className="text-emerald-500" />
                    <span className="text-xs text-[var(--cv-text-secondary)]">
                      {fadedCompletedCount} completed
                    </span>
                  </div>
                )}

                {/* Upload items */}
                {visibleUploads.map((item) => (
                  <UploadRow
                    key={item.id}
                    item={item}
                    onCancel={cancelUpload}
                    onRetry={retryUpload}
                    prefersReduced={prefersReduced}
                  />
                ))}

                {/* Actions footer */}
                {completedCount > 0 && !hasActive && (
                  <div className="border-t border-[var(--cv-border)] px-4 py-2">
                    <button
                      onClick={clearCompleted}
                      className="text-xs text-primary-500 transition-colors hover:text-primary-600"
                    >
                      Clear completed
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Aria live region ───────────────────────────────────── */}
        <div
          ref={ariaRef}
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {ariaMessage}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ── Upload Row ───────────────────────────────────────────────────

function UploadRow({
  item,
  onCancel,
  onRetry,
  prefersReduced,
}: {
  item: {
    id: string;
    fileName: string;
    fileType: string;
    status: UploadStatus;
    progress: number;
    transferredBytes: number;
    totalBytes: number;
    errorReason?: string;
    batchFolder?: string;
  };
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  prefersReduced: boolean;
}) {
  const config = statusConfig[item.status];
  const StatusIcon = config.icon;
  const isActive = ["preparing", "uploading", "scanning"].includes(item.status);
  const isSpinning = item.status === "preparing" || item.status === "uploading";

  return (
    <motion.div
      layout={!prefersReduced}
      initial={prefersReduced ? undefined : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReduced ? 0 : 0.15 }}
      className="border-b border-[var(--cv-border)] px-4 py-2.5 last:border-b-0"
    >
      <div className="flex items-center gap-2.5">
        {/* File icon */}
        <FileTypeIconInline type={item.fileType as FileItemType} size={16} />

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-xs font-medium text-[var(--cv-text)]">
            {item.batchFolder
              ? `${item.batchFolder}/${item.fileName}`
              : item.fileName}
          </p>

          <div className="flex items-center gap-2 mt-0.5">
            <StatusIcon
              size={11}
              className={cn(config.color, isSpinning && "animate-spin")}
            />
            <span className={cn("text-[10px]", config.color)}>
              {config.label}
            </span>

            {item.status === "uploading" && (
              <span className="text-[10px] text-[var(--cv-text-muted)]">
                {formatBytes(item.transferredBytes)} / {formatBytes(item.totalBytes)}
              </span>
            )}
          </div>

          {/* Error reason */}
          {item.status === "failed" && item.errorReason && (
            <p className="mt-0.5 text-[10px] text-rose-500 truncate">
              {item.errorReason}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isActive && (
            <button
              onClick={() => onCancel(item.id)}
              className="flex h-5 w-5 items-center justify-center rounded text-[var(--cv-text-muted)] transition-colors hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)]"
              aria-label={`Cancel upload of ${item.fileName}`}
            >
              <X size={12} />
            </button>
          )}

          {item.status === "failed" && (
            <button
              onClick={() => onRetry(item.id)}
              className="flex h-5 w-5 items-center justify-center rounded text-primary-500 transition-colors hover:bg-primary-50 dark:hover:bg-primary-950/20"
              aria-label={`Retry upload of ${item.fileName}`}
            >
              <RotateCcw size={12} />
            </button>
          )}

          {item.status === "complete" && (
            <CheckCircle size={14} className="text-emerald-500" />
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="mt-1.5">
          <ProgressBar value={item.progress} size="sm" color="primary" />
        </div>
      )}
    </motion.div>
  );
}

export default UploadManager;
