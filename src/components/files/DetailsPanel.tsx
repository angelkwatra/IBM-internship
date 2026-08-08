/**
 * DetailsPanel.tsx — Side-sheet showing file metadata.
 *
 * Slides in from the right, reusing Modal's motion pattern
 * but as a fixed side-panel instead of centered dialog.
 */

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X, Calendar, HardDrive, User, History, Star } from "lucide-react";
import { cn } from "../../lib/cn";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { getTransition, modalTransition } from "../../lib/motion";
import { FileTypeIcon } from "./FileTypeIcon";
import type { FileSystemItem } from "../../services/fileService";
import { formatBytes, formatDate } from "../../services/fileService";

interface DetailsPanelProps {
  isOpen: boolean;
  item: FileSystemItem | null;
  onClose: () => void;
}

export function DetailsPanel({ isOpen, item, onClose }: DetailsPanelProps) {
  const prefersReduced = useReducedMotion();
  const transition = getTransition(modalTransition, prefersReduced);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Close on click outside
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return createPortal(
    <AnimatePresence>
      {isOpen && item && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            onClick={handleOverlayClick}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Details for ${item.name}`}
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
              "fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col",
              "border-l border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]",
              "shadow-[var(--cv-shadow-xl)]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--cv-border)] px-5 py-4">
              <h2 className="text-base font-semibold text-[var(--cv-text)]">
                Details
              </h2>
              <button
                onClick={onClose}
                aria-label="Close details panel"
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-md",
                  "text-[var(--cv-text-muted)] transition-colors",
                  "hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)]"
                )}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* File icon + name */}
              <div className="flex flex-col items-center gap-3 pb-6">
                <FileTypeIcon type={item.type} size={36} />
                <div className="text-center">
                  <p className="text-sm font-semibold text-[var(--cv-text)] break-all">
                    {item.name}
                  </p>
                  {item.isStarred && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-amber-500">
                      <Star size={12} fill="currentColor" />
                      Starred
                    </span>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-4">
                <MetadataRow
                  icon={HardDrive}
                  label="Size"
                  value={
                    item.type === "folder"
                      ? "—"
                      : formatBytes(item.size)
                  }
                />
                <MetadataRow
                  icon={HardDrive}
                  label="Type"
                  value={
                    item.type === "folder"
                      ? "Folder"
                      : item.mimeType || item.type
                  }
                />
                <MetadataRow
                  icon={Calendar}
                  label="Created"
                  value={formatDate(item.createdAt)}
                />
                <MetadataRow
                  icon={Calendar}
                  label="Modified"
                  value={formatDate(item.modifiedAt)}
                />
                <MetadataRow
                  icon={User}
                  label="Owner"
                  value={item.owner}
                />
                <MetadataRow
                  icon={History}
                  label="Versions"
                  value="1 version"
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function MetadataRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={15} className="mt-0.5 shrink-0 text-[var(--cv-text-muted)]" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[var(--cv-text-muted)]">{label}</p>
        <p className="text-sm text-[var(--cv-text)] break-all">{value}</p>
      </div>
    </div>
  );
}

export default DetailsPanel;
