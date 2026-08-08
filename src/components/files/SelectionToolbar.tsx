/**
 * SelectionToolbar.tsx — Replaces PageHeader actions when items are selected.
 *
 * Shows selection count + bulk action buttons.
 */

import {
  ArrowRightLeft,
  Copy,
  Download,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "../ui/Button";

interface SelectionToolbarProps {
  count: number;
  onMove: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onDeselect: () => void;
  className?: string;
}

export function SelectionToolbar({
  count,
  onMove,
  onCopy,
  onDownload,
  onDelete,
  onDeselect,
  className,
}: SelectionToolbarProps) {
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="toolbar"
      aria-label="Selected items actions"
    >
      <span className="mr-1 text-sm font-medium text-[var(--cv-text)]">
        {count} selected
      </span>

      <Button
        variant="ghost"
        size="sm"
        leftIcon={<ArrowRightLeft size={14} />}
        onClick={onMove}
      >
        <span className="hidden sm:inline">Move</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        leftIcon={<Copy size={14} />}
        onClick={onCopy}
      >
        <span className="hidden sm:inline">Copy</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        leftIcon={<Download size={14} />}
        onClick={onDownload}
      >
        <span className="hidden sm:inline">Download</span>
      </Button>

      <Button
        variant="destructive"
        size="sm"
        leftIcon={<Trash2 size={14} />}
        onClick={onDelete}
      >
        <span className="hidden sm:inline">Delete</span>
      </Button>

      <div className="mx-1 h-5 w-px bg-[var(--cv-border)]" />

      <Button
        variant="ghost"
        size="sm"
        iconOnly
        onClick={onDeselect}
        aria-label="Deselect all"
      >
        <X size={16} />
      </Button>
    </div>
  );
}

export default SelectionToolbar;
