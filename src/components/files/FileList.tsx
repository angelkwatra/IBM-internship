/**
 * FileList.tsx — Table/list view for the file manager.
 *
 * Features: sortable column headers, row hover quick actions,
 * checkbox selection, inline rename, context menu.
 * Default view below 768px.
 */

import { useCallback } from "react";
import { useNavigate } from "react-router";
import {
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Share2,
  Download,
  Star,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { Checkbox } from "../ui/Checkbox";
import { FileTypeIconInline } from "./FileTypeIcon";
import { InlineRename } from "./InlineRename";
import type { FileSystemItem, SortField, SortDirection } from "../../services/fileService";
import { formatBytes, formatDate } from "../../services/fileService";

interface FileListProps {
  items: FileSystemItem[];
  selectedIds: Set<string>;
  renamingId: string | null;
  sortBy: SortField;
  sortDir: SortDirection;
  onSort: (field: SortField) => void;
  onSelect: (id: string, event: React.MouseEvent) => void;
  onCheckboxChange: (id: string, checked: boolean) => void;
  onContextMenu: (e: React.MouseEvent, item: FileSystemItem) => void;
  onDoubleClick: (item: FileSystemItem) => void;
  onRenameConfirm: (id: string, newName: string) => Promise<void>;
  onRenameCancel: () => void;
  onKebabClick: (e: React.MouseEvent, item: FileSystemItem) => void;
  onSelectAll: (checked: boolean) => void;
  isTrash?: boolean;
}

export function FileList({
  items,
  selectedIds,
  renamingId,
  sortBy,
  sortDir,
  onSort,
  onSelect,
  onCheckboxChange,
  onContextMenu,
  onDoubleClick,
  onRenameConfirm,
  onRenameCancel,
  onKebabClick,
  onSelectAll,
  isTrash = false,
}: FileListProps) {
  const navigate = useNavigate();

  const handleRowClick = useCallback(
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

  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));
  const someSelected = items.some((i) => selectedIds.has(i.id)) && !allSelected;

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]">
      <table className="w-full text-sm" role="grid">
        <thead>
          <tr className="border-b border-[var(--cv-border)] bg-[var(--cv-bg-muted)]">
            {/* Checkbox column */}
            <th className="w-10 px-3 py-2.5">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={onSelectAll}
                aria-label="Select all files"
              />
            </th>

            {/* Name */}
            <th className="px-3 py-2.5 text-left">
              <SortableHeader
                label="Name"
                field="name"
                currentSort={sortBy}
                currentDir={sortDir}
                onSort={onSort}
              />
            </th>

            {/* Size — hidden on mobile */}
            <th className="hidden px-3 py-2.5 text-left sm:table-cell">
              <SortableHeader
                label="Size"
                field="size"
                currentSort={sortBy}
                currentDir={sortDir}
                onSort={onSort}
              />
            </th>

            {/* Modified / Deleted Columns */}
            {isTrash ? (
              <>
                <th className="hidden px-3 py-2.5 text-left md:table-cell text-xs font-semibold uppercase tracking-wider text-[var(--cv-text-muted)]">
                  Deleted Info
                </th>
                <th className="hidden px-3 py-2.5 text-left sm:table-cell text-xs font-semibold uppercase tracking-wider text-[var(--cv-text-muted)]">
                  Auto-deletes
                </th>
              </>
            ) : (
              <th className="hidden px-3 py-2.5 text-left md:table-cell">
                <SortableHeader
                  label="Modified"
                  field="modifiedAt"
                  currentSort={sortBy}
                  currentDir={sortDir}
                  onSort={onSort}
                />
              </th>
            )}

            {/* Actions column */}
            <th className="w-24 px-3 py-2.5" />
          </tr>
        </thead>

        <tbody>
          {items.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isRenaming = renamingId === item.id;

            return (
              <tr
                key={item.id}
                className={cn(
                  "group border-b border-[var(--cv-border)] last:border-b-0",
                  "cursor-pointer transition-colors duration-100",
                  isSelected
                    ? "bg-primary-50/50 dark:bg-primary-950/20"
                    : "hover:bg-[var(--cv-bg-muted)]"
                )}
                onClick={(e) => handleRowClick(item, e)}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDoubleClick(item);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onContextMenu(e, item);
                }}
              >
                {/* Checkbox */}
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onChange={(checked) => onCheckboxChange(item.id, checked)}
                    aria-label={`Select ${item.name}`}
                  />
                </td>

                {/* Name + icon */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <FileTypeIconInline type={item.type} size={18} />
                    {isRenaming ? (
                      <div onClick={(e) => e.stopPropagation()} className="flex-1 min-w-0">
                        <InlineRename
                          currentName={item.name}
                          isFolder={item.type === "folder"}
                          onConfirm={(newName) =>
                            onRenameConfirm(item.id, newName)
                          }
                          onCancel={onRenameCancel}
                        />
                      </div>
                    ) : (
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate font-medium text-[var(--cv-text)]">
                          {item.name}
                        </span>
                        {!isTrash && item.isStarred && (
                          <Star
                            size={12}
                            className="shrink-0 fill-amber-400 text-amber-400"
                          />
                        )}
                      </span>
                    )}
                  </div>
                </td>

                {/* Size */}
                <td className="hidden px-3 py-2 text-[var(--cv-text-secondary)] sm:table-cell">
                  {item.type === "folder" ? "—" : formatBytes(item.size)}
                </td>

                {/* Modified / Deleted Columns */}
                {isTrash ? (
                  <>
                    <td className="hidden px-3 py-2 text-[var(--cv-text-secondary)] md:table-cell text-xs">
                      Deleted by {(item as any).deletedBy} · {formatDate((item as any).deletedAt)}
                    </td>
                    <td className="hidden px-3 py-2 sm:table-cell text-xs">
                      {(() => {
                        const deletedDate = new Date((item as any).deletedAt);
                        const purgeDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                        const now = new Date();
                        const diffMs = purgeDate.getTime() - now.getTime();
                        const daysLeft = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

                        let badgeColorClass = "bg-[var(--cv-bg-muted)] text-[var(--cv-text-muted)]";
                        if (daysLeft <= 3) {
                          badgeColorClass = "bg-red-500/10 text-red-500 border border-red-500/20";
                        } else if (daysLeft <= 7) {
                          badgeColorClass = "bg-amber-500/10 text-amber-500 border border-amber-500/20";
                        } else {
                          badgeColorClass = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
                        }
                        return (
                          <span className={cn("rounded-full px-2 py-0.5 font-semibold text-[10px]", badgeColorClass)}>
                            {daysLeft}d left
                          </span>
                        );
                      })()}
                    </td>
                  </>
                ) : (
                  <td className="hidden px-3 py-2 text-[var(--cv-text-secondary)] md:table-cell">
                    {formatDate(item.modifiedAt)}
                  </td>
                )}

                {/* Quick actions — visible on hover */}
                <td className="px-3 py-2">
                  <div
                    className={cn(
                      "flex items-center justify-end gap-1",
                      "opacity-0 transition-opacity group-hover:opacity-100"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!isTrash && (
                      <>
                        <button
                          className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--cv-text-muted)] transition-colors hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)]"
                          aria-label={`Share ${item.name}`}
                        >
                          <Share2 size={14} />
                        </button>
                        <button
                          className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--cv-text-muted)] transition-colors hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)]"
                          aria-label={`Download ${item.name}`}
                        >
                          <Download size={14} />
                        </button>
                      </>
                    )}
                    <button
                      className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--cv-text-muted)] transition-colors hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)]"
                      onClick={(e) => onKebabClick(e, item)}
                      aria-label={`More actions for ${item.name}`}
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Sortable header ──────────────────────────────────────────────

function SortableHeader({
  label,
  field,
  currentSort,
  currentDir,
  onSort,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDir: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSort === field;

  return (
    <button
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider",
        "transition-colors",
        isActive
          ? "text-[var(--cv-text)]"
          : "text-[var(--cv-text-muted)] hover:text-[var(--cv-text)]"
      )}
      onClick={() => onSort(field)}
    >
      {label}
      {isActive &&
        (currentDir === "asc" ? (
          <ArrowUp size={12} />
        ) : (
          <ArrowDown size={12} />
        ))}
    </button>
  );
}

export default FileList;
