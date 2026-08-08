/**
 * UploadConflictModal.tsx — Handles upload-related modal dialogs:
 * - Duplicate filename conflicts (Keep Both / Replace / Cancel)
 * - Quota exceeded warning
 * - Skipped files notice
 */

import { useState } from "react";
import { AlertTriangle, HardDrive, FileX } from "lucide-react";
import { cn } from "../../lib/cn";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { formatBytes } from "../../services/fileService";

// ── Duplicate Conflict Modal ────────────────────────────────────

export interface DuplicateConflictInfo {
  fileName: string;
  existingSize?: number;
}

interface DuplicateConflictModalProps {
  isOpen: boolean;
  conflicts: DuplicateConflictInfo[];
  onKeepBoth: (applyToAll: boolean) => void;
  onReplace: (applyToAll: boolean) => void;
  onCancel: () => void;
}

export function DuplicateConflictModal({
  isOpen,
  conflicts,
  onKeepBoth,
  onReplace,
  onCancel,
}: DuplicateConflictModalProps) {
  const [applyToAll, setApplyToAll] = useState(false);
  const hasMultiple = conflicts.length > 1;
  const current = conflicts[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="File already exists"
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-[var(--cv-text)]">
              A file named{" "}
              <span className="font-semibold">"{current?.fileName}"</span>
              {" "}already exists in this folder.
            </p>
            {hasMultiple && (
              <p className="mt-1 text-xs text-[var(--cv-text-muted)]">
                {conflicts.length} files have naming conflicts.
              </p>
            )}
          </div>
        </div>

        {hasMultiple && (
          <Checkbox
            checked={applyToAll}
            onChange={setApplyToAll}
            label="Apply to all conflicts"
          />
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onKeepBoth(applyToAll)}
          >
            Keep Both
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onReplace(applyToAll)}
          >
            Replace
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Quota Exceeded Modal ────────────────────────────────────────

interface QuotaExceededModalProps {
  isOpen: boolean;
  overageBytes: number;
  onClose: () => void;
}

export function QuotaExceededModal({
  isOpen,
  overageBytes,
  onClose,
}: QuotaExceededModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Storage limit exceeded"
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/30">
            <HardDrive size={18} className="text-rose-500" />
          </div>
          <p className="text-sm text-[var(--cv-text)]">
            This upload would exceed your storage limit by{" "}
            <span className="font-semibold">{formatBytes(overageBytes)}</span>.
            Free up space or upgrade your plan.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Upgrade Plan
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Skipped Files Notice Modal ──────────────────────────────────

interface SkippedFilesModalProps {
  isOpen: boolean;
  skippedFiles: string[];
  onClose: () => void;
}

export function SkippedFilesModal({
  isOpen,
  skippedFiles,
  onClose,
}: SkippedFilesModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Some files were skipped"
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30">
            <FileX size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-[var(--cv-text)]">
              {skippedFiles.length} file{skippedFiles.length !== 1 ? "s were" : " was"} skipped
              because the file type is not allowed (.exe, .bat, .sh).
            </p>
          </div>
        </div>

        <div className="max-h-32 overflow-y-auto rounded-lg bg-[var(--cv-bg-muted)] p-2">
          {skippedFiles.map((name) => (
            <p
              key={name}
              className="truncate py-0.5 text-xs text-[var(--cv-text-secondary)]"
            >
              {name}
            </p>
          ))}
        </div>

        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Delete Confirmation Modal ───────────────────────────────────

interface DeleteConfirmModalProps {
  isOpen: boolean;
  itemCount: number;
  childrenCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  isOpen,
  itemCount,
  childrenCount,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  const totalItems = itemCount + childrenCount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Move to Trash"
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--cv-text)]">
          Are you sure you want to move{" "}
          <span className="font-semibold">
            {itemCount} item{itemCount !== 1 ? "s" : ""}
          </span>{" "}
          to Trash?
          {childrenCount > 0 && (
            <>
              {" "}This includes{" "}
              <span className="font-semibold">
                {childrenCount} nested item{childrenCount !== 1 ? "s" : ""}
              </span>{" "}
              ({totalItems} items total).
            </>
          )}
        </p>

        <div className={cn(
          "flex justify-end gap-2"
        )}>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Move to Trash
          </Button>
        </div>
      </div>
    </Modal>
  );
}
