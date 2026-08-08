/**
 * InlineRename.tsx — Inline text input for renaming files/folders.
 *
 * Activated by double-clicking a filename.
 * Enter confirms, Esc cancels.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "../../lib/cn";

interface InlineRenameProps {
  currentName: string;
  onConfirm: (newName: string) => Promise<void>;
  onCancel: () => void;
  isFolder?: boolean;
  className?: string;
}

export function InlineRename({
  currentName,
  onConfirm,
  onCancel,
  isFolder = false,
  className,
}: InlineRenameProps) {
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Select filename without extension on mount
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.focus();

    if (isFolder) {
      input.select();
    } else {
      const dot = currentName.lastIndexOf(".");
      if (dot > 0) {
        input.setSelectionRange(0, dot);
      } else {
        input.select();
      }
    }
  }, [currentName, isFolder]);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === currentName) {
      onCancel();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
      setIsSubmitting(false);
    }
  }, [value, currentName, onConfirm, onCancel]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
    // Stop propagation to prevent parent keyboard handlers
    e.stopPropagation();
  };

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleSubmit}
        disabled={isSubmitting}
        className={cn(
          "w-full rounded border px-1.5 py-0.5 text-sm outline-none",
          "bg-[var(--cv-bg-subtle)] text-[var(--cv-text)]",
          "transition-colors duration-150",
          error
            ? "border-error focus:ring-1 focus:ring-error"
            : "border-primary-500 focus:ring-1 focus:ring-primary-500",
          isSubmitting && "opacity-60"
        )}
        aria-label={`Rename ${currentName}`}
      />
      {error && (
        <span className="text-[10px] text-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default InlineRename;
