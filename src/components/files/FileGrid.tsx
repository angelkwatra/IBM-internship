/**
 * FileGrid.tsx — Card-tile grid view for the file manager.
 *
 * Features: staggered entrance animation, hover overlay with metadata,
 * checkbox selection (appears on hover/selection), double-click rename,
 * right-click context menu.
 */

import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { MoreVertical, Star } from "lucide-react";
import { cn } from "../../lib/cn";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { Tooltip } from "../ui/Tooltip";
import { Checkbox } from "../ui/Checkbox";
import { FileTypeIcon } from "./FileTypeIcon";
import { InlineRename } from "./InlineRename";
import type { FileSystemItem } from "../../services/fileService";
import { formatBytes, formatDate } from "../../services/fileService";

interface FileGridProps {
  items: FileSystemItem[];
  selectedIds: Set<string>;
  renamingId: string | null;
  onSelect: (id: string, event: React.MouseEvent) => void;
  onCheckboxChange: (id: string, checked: boolean) => void;
  onContextMenu: (e: React.MouseEvent, item: FileSystemItem) => void;
  onDoubleClick: (item: FileSystemItem) => void;
  onRenameConfirm: (id: string, newName: string) => Promise<void>;
  onRenameCancel: () => void;
  onKebabClick: (e: React.MouseEvent, item: FileSystemItem) => void;
  isTrash?: boolean;
}

export function FileGrid({
  items,
  selectedIds,
  renamingId,
  onSelect,
  onCheckboxChange,
  onContextMenu,
  onDoubleClick,
  onRenameConfirm,
  onRenameCancel,
  onKebabClick,
  isTrash = false,
}: FileGridProps) {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  // Cap total animation time at 400ms regardless of item count
  const staggerDelay = useMemo(() => {
    if (prefersReduced || items.length === 0) return 0;
    return Math.min(0.04, 0.4 / items.length);
  }, [items.length, prefersReduced]);

  const handleItemClick = useCallback(
    (item: FileSystemItem, e: React.MouseEvent) => {
      if (isTrash) {
        onSelect(item.id, e);
      } else if (item.type === "folder" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        navigate(`/app/files/${item.id}`);
      } else {
        onSelect(item.id, e);
      }
    },
    [navigate, onSelect, isTrash]
  );

  const handleDoubleClick = useCallback(
    (item: FileSystemItem, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDoubleClick(item);
    },
    [onDoubleClick]
  );

  return (
    <motion.div
      className="grid gap-3 cv-file-grid"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
    >
      {items.map((item) => {
        const isSelected = selectedIds.has(item.id);
        const isRenaming = renamingId === item.id;

        // Calculate days left for trash countdown
        let daysLeft = 30;
        let badgeColorClass = "bg-[var(--cv-bg-muted)] text-[var(--cv-text-muted)]";
        if (isTrash && (item as any).deletedAt) {
          const deletedDate = new Date((item as any).deletedAt);
          const purgeDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
          const now = new Date();
          const diffMs = purgeDate.getTime() - now.getTime();
          daysLeft = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

          if (daysLeft <= 3) {
            badgeColorClass = "bg-red-500/10 text-red-500 border border-red-500/20";
          } else if (daysLeft <= 7) {
            badgeColorClass = "bg-amber-500/10 text-amber-500 border border-amber-500/20";
          } else {
            badgeColorClass = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
          }
        }

        return (
          <motion.div
            key={item.id}
            variants={
              prefersReduced
                ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
                : {
                    hidden: { opacity: 0, scale: 0.95, y: 8 },
                    visible: { opacity: 1, scale: 1, y: 0 },
                  }
            }
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-xl border",
                "bg-[var(--cv-bg-elevated)] transition-all duration-150 cursor-pointer",
                isSelected
                  ? "border-primary-500 ring-1 ring-primary-500/30 shadow-[var(--cv-shadow-md)]"
                  : "border-[var(--cv-border)] hover:border-[var(--cv-border-strong)] hover:shadow-[var(--cv-shadow-md)]"
              )}
              onClick={(e) => handleItemClick(item, e)}
              onDoubleClick={(e) => handleDoubleClick(item, e)}
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(e, item);
              }}
            >
              {/* Thumbnail / Icon area */}
              <div className="relative flex items-center justify-center bg-[var(--cv-bg-muted)] px-4 py-6">
                {item.type === "image" && item.previewDataUrl ? (
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[var(--cv-bg-subtle)]">
                    <img
                      src={item.previewDataUrl}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <FileTypeIcon type={item.type} size={28} />
                )}

                {/* Starred indicator / Trashed countdown badge */}
                {isTrash && (item as any).deletedAt ? (
                  <span className={cn("absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold", badgeColorClass)}>
                    {daysLeft}d left
                  </span>
                ) : (
                  item.isStarred && (
                    <Star
                      size={14}
                      className="absolute right-2 top-2 fill-amber-400 text-amber-400"
                    />
                  )
                )}

                {/* Checkbox — appears on hover or when selected */}
                <div
                  className={cn(
                    "absolute left-2 top-2 transition-opacity",
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={(checked) => onCheckboxChange(item.id, checked)}
                    aria-label={`Select ${item.name}`}
                  />
                </div>

                {/* Kebab button for touch */}
                <button
                  className={cn(
                    "absolute right-2 bottom-2 flex h-6 w-6 items-center justify-center rounded-md",
                    "bg-[var(--cv-bg-elevated)]/80 text-[var(--cv-text-muted)] backdrop-blur-sm",
                    "opacity-0 transition-opacity group-hover:opacity-100",
                    "hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)]"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onKebabClick(e, item);
                  }}
                  aria-label={`More actions for ${item.name}`}
                >
                  <MoreVertical size={14} />
                </button>

                {/* Hover overlay with size + date or deleted info */}
                <div
                  className={cn(
                    "absolute inset-0 flex items-end justify-between px-3 pb-2",
                    "bg-gradient-to-t from-black/40 to-transparent",
                    "opacity-0 transition-opacity duration-200 group-hover:opacity-100",
                    "pointer-events-none"
                  )}
                >
                  {isTrash ? (
                    <div className="flex flex-col text-left w-full text-white/95 text-[10px] leading-tight">
                      <span className="font-semibold truncate">Deleted by {(item as any).deletedBy}</span>
                      <span className="text-white/80">Deleted {formatDate((item as any).deletedAt)}</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-[10px] font-medium text-white/90">
                        {item.type === "folder" ? "Folder" : formatBytes(item.size)}
                      </span>
                      <span className="text-[10px] text-white/70">
                        {formatDate(item.modifiedAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Filename */}
              <div className="px-3 py-2.5">
                {isRenaming ? (
                  <InlineRename
                    currentName={item.name}
                    isFolder={item.type === "folder"}
                    onConfirm={(newName) => onRenameConfirm(item.id, newName)}
                    onCancel={onRenameCancel}
                  />
                ) : (
                  <Tooltip content={item.name} placement="bottom" delay={500}>
                    <p className="truncate text-xs font-medium text-[var(--cv-text)]">
                      {item.name}
                    </p>
                  </Tooltip>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export default FileGrid;
