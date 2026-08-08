import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router";
import {
  Trash2,
  Undo,
  Trash,
  Info,
  AlertTriangle,
  RotateCcw,
  List,
  LayoutGrid,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useToast } from "../../components/ui/ToastProvider";
import PageHeader from "../../components/layout/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { DropdownMenu } from "../../components/ui/DropdownMenu";
import { Skeleton } from "../../components/ui/Skeleton";
import { FileGrid } from "../../components/files/FileGrid";
import { FileList } from "../../components/files/FileList";
import { DetailsPanel } from "../../components/files/DetailsPanel";
import {
  getTrashedItems,
  restoreTrashedItem,
  permanentlyDeleteItems,
  emptyTrash,
  verifyParentFolderExists,
  checkRestoreConflict,
} from "../../services/fileService";
import type { TrashedItem, FileSystemItem, SortField, SortDirection } from "../../services/fileService";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { dropdownVariants, dropdownTransition, getTransition } from "../../lib/motion";
import { useReducedMotion } from "../../hooks/useReducedMotion";

type ViewMode = "grid" | "list";

const sortOptions: { value: SortField; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "size", label: "Size" },
  { value: "modifiedAt", label: "Date deleted" },
];

export default function TrashPage() {
  const { currentWorkspace, refreshStorageUsed } = useWorkspace();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const prefersReduced = useReducedMotion();

  // URL state
  const viewMode: ViewMode = (searchParams.get("view") as ViewMode) || "grid";
  const sortBy: SortField = (searchParams.get("sort") as SortField) || "name";
  const sortDir: SortDirection = (searchParams.get("dir") as SortDirection) || "desc";

  // Data state
  const [items, setItems] = useState<TrashedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Interaction State
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    item: TrashedItem | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, item: null });

  const [detailItem, setDetailItem] = useState<FileSystemItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Modals state
  const [emptyConfirmOpen, setEmptyConfirmOpen] = useState(false);
  const [deleteConfirmationWord, setDeleteConfirmationWord] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemsToDeletePermanently, setItemsToDeletePermanently] = useState<string[]>([]);
  const [restoreOrphanedOpen, setRestoreOrphanedOpen] = useState(false);
  const [orphanedItemToRestore, setOrphanedItemToRestore] = useState<TrashedItem | null>(null);

  // Name collision state
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictItem, setConflictItem] = useState<TrashedItem | null>(null);
  const [conflictRestoreToRoot, setConflictRestoreToRoot] = useState(false);

  const lastSelectedRef = useRef<string | null>(null);

  // Fetch items
  const fetchTrashedItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getTrashedItems(currentWorkspace.id);
      
      // Sort data client side
      data.sort((a, b) => {
        if (a.type === "folder" && b.type !== "folder") return -1;
        if (a.type !== "folder" && b.type === "folder") return 1;

        let cmp = 0;
        if (sortBy === "name") {
          cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        } else if (sortBy === "size") {
          cmp = a.size - b.size;
        } else if (sortBy === "modifiedAt") {
          cmp = new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime();
        }
        return sortDir === "desc" ? -cmp : cmp;
      });

      setItems(data);
    } catch {
      toast.error("Failed to load trashed items");
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace.id, sortBy, sortDir, toast]);

  useEffect(() => {
    fetchTrashedItems();
    setSelectedIds(new Set());
  }, [fetchTrashedItems]);

  const updateParam = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      });
    },
    [setSearchParams]
  );

  const handleViewChange = useCallback((mode: ViewMode) => updateParam("view", mode), [updateParam]);

  const handleSortChange = useCallback(
    (field: SortField) => {
      if (field === sortBy) {
        updateParam("dir", sortDir === "asc" ? "desc" : "asc");
      } else {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set("sort", field);
          next.set("dir", "asc");
          return next;
        });
      }
    },
    [sortBy, sortDir, updateParam, setSearchParams]
  );

  // Checkboxes
  const handleSelect = useCallback(
    (id: string, event: React.MouseEvent) => {
      if (event.shiftKey && lastSelectedRef.current) {
        const lastIdx = items.findIndex((i) => i.id === lastSelectedRef.current);
        const currIdx = items.findIndex((i) => i.id === id);
        if (lastIdx >= 0 && currIdx >= 0) {
          const start = Math.min(lastIdx, currIdx);
          const end = Math.max(lastIdx, currIdx);
          const rangeIds = items.slice(start, end + 1).map((i) => i.id);
          setSelectedIds((prev) => new Set([...prev, ...rangeIds]));
          return;
        }
      }
      if (event.ctrlKey || event.metaKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        });
      } else {
        setSelectedIds(new Set([id]));
      }
      lastSelectedRef.current = id;
    },
    [items]
  );

  const handleCheckboxChange = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
    lastSelectedRef.current = id;
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(items.map((i) => i.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [items]
  );

  // Actions
  const handleContextMenu = useCallback((e: React.MouseEvent, item: FileSystemItem) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      item: item as TrashedItem,
    });
  }, []);

  const handleKebabClick = useCallback((e: React.MouseEvent, item: FileSystemItem) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setContextMenu({
      isOpen: true,
      position: { x: rect.right, y: rect.bottom },
      item: item as TrashedItem,
    });
  }, []);

  const handleAction = useCallback(
    async (type: "restore" | "delete" | "details", item: FileSystemItem) => {
      const trashed = item as TrashedItem;
      if (type === "details") {
        setDetailItem(trashed);
        setIsDetailOpen(true);
      } else if (type === "delete") {
        setItemsToDeletePermanently([trashed.id]);
        setDeleteConfirmOpen(true);
      } else if (type === "restore") {
        await startRestoreFlow(trashed);
      }
    },
    []
  );

  const startRestoreFlow = async (item: TrashedItem, forceRoot = false) => {
    try {
      if (!forceRoot) {
        const parentExists = await verifyParentFolderExists(currentWorkspace.id, item.id);
        if (!parentExists) {
          setOrphanedItemToRestore(item);
          setRestoreOrphanedOpen(true);
          return;
        }
      }

      const conflict = await checkRestoreConflict(currentWorkspace.id, item.id, forceRoot);
      if (conflict) {
        setConflictItem(item);
        setConflictRestoreToRoot(forceRoot);
        setConflictOpen(true);
        return;
      }

      await restoreTrashedItem(currentWorkspace.id, item.id, { restoreToRoot: forceRoot });
      toast.success("Item restored", `"${item.name}" has been restored.`);
      refreshStorageUsed();
      fetchTrashedItems();
    } catch {
      toast.error("Failed to restore item");
    }
  };

  const handleConflictResolve = async (resolution: "replace" | "keep_both") => {
    if (!conflictItem) return;
    try {
      await restoreTrashedItem(currentWorkspace.id, conflictItem.id, {
        conflictResolution: resolution,
        restoreToRoot: conflictRestoreToRoot,
      });
      toast.success("Item restored", `"${conflictItem.name}" restored with resolution.`);
      setConflictOpen(false);
      setConflictItem(null);
      refreshStorageUsed();
      fetchTrashedItems();
    } catch {
      toast.error("Failed to resolve conflict");
    }
  };

  const handleBulkRestore = async () => {
    const ids = Array.from(selectedIds);
    let restoredCount = 0;
    try {
      for (const id of ids) {
        const item = items.find((i) => i.id === id);
        if (!item) continue;
        const parentExists = await verifyParentFolderExists(currentWorkspace.id, id);
        if (!parentExists) {
          setOrphanedItemToRestore(item);
          setRestoreOrphanedOpen(true);
          return;
        }
        const conflict = await checkRestoreConflict(currentWorkspace.id, id);
        if (conflict) {
          setConflictItem(item);
          setConflictRestoreToRoot(false);
          setConflictOpen(true);
          return;
        }
        await restoreTrashedItem(currentWorkspace.id, id);
        restoredCount++;
      }
      toast.success("Restored", `${restoredCount} item${restoredCount !== 1 ? "s" : ""} restored.`);
      setSelectedIds(new Set());
      refreshStorageUsed();
      fetchTrashedItems();
    } catch {
      toast.error("Failed to restore some items");
    }
  };

  const handleBulkDeletePermanently = () => {
    setItemsToDeletePermanently(Array.from(selectedIds));
    setDeleteConfirmOpen(true);
  };

  const confirmDeletePermanently = async () => {
    try {
      await permanentlyDeleteItems(currentWorkspace.id, itemsToDeletePermanently);
      toast.success("Deleted permanently", `${itemsToDeletePermanently.length} item(s) permanently deleted.`);
      setDeleteConfirmOpen(false);
      setItemsToDeletePermanently([]);
      setSelectedIds(new Set());
      refreshStorageUsed();
      fetchTrashedItems();
    } catch {
      toast.error("Failed to delete items permanently");
    }
  };

  const confirmEmptyTrash = async () => {
    try {
      await emptyTrash(currentWorkspace.id);
      toast.success("Trash emptied", "All items permanently removed.");
      setEmptyConfirmOpen(false);
      setDeleteConfirmationWord("");
      setSelectedIds(new Set());
      refreshStorageUsed();
      fetchTrashedItems();
    } catch {
      toast.error("Failed to empty trash");
    }
  };

  const hasSelection = selectedIds.size > 0;

  const headerActions = hasSelection ? (
    <div className="flex items-center gap-2 bg-[var(--cv-bg-subtle)] px-3 py-1.5 rounded-lg border border-[var(--cv-border)]">
      <span className="text-xs font-semibold text-[var(--cv-text)] mr-1">
        {selectedIds.size} selected
      </span>
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<Undo size={14} />}
        onClick={handleBulkRestore}
      >
        Restore
      </Button>
      <Button
        variant="destructive"
        size="sm"
        leftIcon={<Trash size={14} />}
        onClick={handleBulkDeletePermanently}
      >
        Delete Forever
      </Button>
      <div className="w-px h-4 bg-[var(--cv-border)] mx-1" />
      <button
        onClick={() => setSelectedIds(new Set())}
        className="text-[var(--cv-text-muted)] hover:text-[var(--cv-text)] text-xs p-1"
        aria-label="Clear selection"
      >
        ✕
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      {items.length > 0 && (
        <Button
          variant="destructive"
          size="sm"
          leftIcon={<Trash size={14} />}
          onClick={() => setEmptyConfirmOpen(true)}
        >
          Empty Trash
        </Button>
      )}

      {/* View Mode Toggle */}
      <div className="flex rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]">
        <button
          onClick={() => handleViewChange("grid")}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-l-lg transition-colors",
            viewMode === "grid"
              ? "bg-[var(--cv-bg-muted)] text-[var(--cv-text)]"
              : "text-[var(--cv-text-muted)] hover:text-[var(--cv-text)]"
          )}
          aria-label="Grid view"
        >
          <LayoutGrid size={15} />
        </button>
        <button
          onClick={() => handleViewChange("list")}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-r-lg transition-colors",
            viewMode === "list"
              ? "bg-[var(--cv-bg-muted)] text-[var(--cv-text)]"
              : "text-[var(--cv-text-muted)] hover:text-[var(--cv-text)]"
          )}
          aria-label="List view"
        >
          <List size={15} />
        </button>
      </div>

      {/* Sort Menu */}
      <DropdownMenu
        trigger={
          <Button variant="ghost" size="sm" iconOnly aria-label="Sort files">
            <SlidersHorizontal size={15} />
          </Button>
        }
        items={sortOptions.map((opt) => ({
          label:
            opt.value === sortBy
              ? `${opt.label} ${sortDir === "asc" ? "↑" : "↓"}`
              : opt.label,
          onClick: () => handleSortChange(opt.value),
        }))}
        align="right"
      />
    </div>
  );

  return (
    <>
      <PageHeader
        title="Trash"
        breadcrumb={<span>Home / Trash</span>}
        actions={headerActions}
      />

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid gap-3 cv-file-grid">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" className="h-[140px] rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && (
        <EmptyState
          icon={Trash2}
          title="Trash is empty"
          description="Deleted files will appear here and be kept for 30 days before automatic purge."
        />
      )}

      {/* Grid or List items view */}
      {!isLoading && items.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <FileGrid
              items={items}
              selectedIds={selectedIds}
              renamingId={null}
              onSelect={handleSelect}
              onCheckboxChange={handleCheckboxChange}
              onContextMenu={handleContextMenu}
              onDoubleClick={(item) => startRestoreFlow(item as TrashedItem)}
              onRenameConfirm={async () => {}}
              onRenameCancel={() => {}}
              onKebabClick={handleKebabClick}
              isTrash={true}
            />
          ) : (
            <FileList
              items={items}
              selectedIds={selectedIds}
              renamingId={null}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSortChange}
              onSelect={handleSelect}
              onCheckboxChange={handleCheckboxChange}
              onContextMenu={handleContextMenu}
              onDoubleClick={(item) => startRestoreFlow(item as TrashedItem)}
              onRenameConfirm={async () => {}}
              onRenameCancel={() => {}}
              onKebabClick={handleKebabClick}
              onSelectAll={handleSelectAll}
              isTrash={true}
            />
          )}

          {/* Item count footer */}
          <div className="mt-4 flex items-center justify-between text-xs text-[var(--cv-text-muted)]">
            <span>
              {items.length} item{items.length !== 1 ? "s" : ""} in Trash
              {hasSelection && ` · ${selectedIds.size} selected`}
            </span>
          </div>
        </>
      )}

      {/* Positioned Context Menu */}
      <AnimatePresence>
        {contextMenu.isOpen && contextMenu.item && (
          <TrashContextMenu
            position={contextMenu.position}
            item={contextMenu.item}
            onClose={() => setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, item: null })}
            onAction={handleAction}
            prefersReduced={prefersReduced}
          />
        )}
      </AnimatePresence>

      {/* Metadata Side Details Panel */}
      <DetailsPanel
        isOpen={isDetailOpen}
        item={detailItem}
        onClose={() => {
          setIsDetailOpen(false);
          setDetailItem(null);
        }}
      />

      {/* Empty Trash confirmation Modal */}
      <Modal
        isOpen={emptyConfirmOpen}
        onClose={() => {
          setEmptyConfirmOpen(false);
          setDeleteConfirmationWord("");
        }}
        title="Empty Trash"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/30">
              <AlertTriangle size={18} className="text-rose-500" />
            </div>
            <div>
              <p className="text-sm text-[var(--cv-text)] font-semibold">
                Empty trash permanently?
              </p>
              <p className="text-xs text-[var(--cv-text-secondary)] mt-1">
                You are about to permanently delete <span className="font-semibold">{items.length} items</span> in your trash. They cannot be recovered.
              </p>
            </div>
          </div>

          {items.length > 20 && (
            <div className="space-y-1.5">
              <label htmlFor="confirm-delete-text" className="block text-xs font-semibold text-[var(--cv-text-secondary)]">
                Type <span className="text-rose-500 font-mono font-bold">DELETE</span> to confirm
              </label>
              <input
                id="confirm-delete-text"
                type="text"
                value={deleteConfirmationWord}
                onChange={(e) => setDeleteConfirmationWord(e.target.value)}
                placeholder="DELETE"
                className="flex h-9 w-full rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-3 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEmptyConfirmOpen(false);
                setDeleteConfirmationWord("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmEmptyTrash}
              disabled={items.length > 20 && deleteConfirmationWord !== "DELETE"}
            >
              Empty Trash
            </Button>
          </div>
        </div>
      </Modal>

      {/* Permanently delete item(s) confirmation modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Permanently Delete Items"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/30">
              <AlertTriangle size={18} className="text-rose-500" />
            </div>
            <div>
              <p className="text-sm text-[var(--cv-text)] font-semibold">
                Delete items permanently?
              </p>
              <p className="text-xs text-[var(--cv-text-secondary)] mt-1">
                You are about to permanently delete <span className="font-semibold">{itemsToDeletePermanently.length} item(s)</span>. This action is irreversible.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmDeletePermanently}>
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>

      {/* Orphaned parent restore flow modal */}
      <Modal
        isOpen={restoreOrphanedOpen}
        onClose={() => {
          setRestoreOrphanedOpen(false);
          setOrphanedItemToRestore(null);
        }}
        title="Original folder missing"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30">
              <AlertTriangle size={18} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-[var(--cv-text)]">
                The original parent folder for <span className="font-semibold">"{orphanedItemToRestore?.name}"</span> no longer exists.
              </p>
              <p className="text-xs text-[var(--cv-text-secondary)] mt-1">
                Would you like to restore this item to your main <span className="font-semibold">My Files (Root)</span> directory instead?
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRestoreOrphanedOpen(false);
                setOrphanedItemToRestore(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (orphanedItemToRestore) {
                  startRestoreFlow(orphanedItemToRestore, true);
                }
                setRestoreOrphanedOpen(false);
                setOrphanedItemToRestore(null);
              }}
            >
              Restore to Root
            </Button>
          </div>
        </div>
      </Modal>

      {/* Name Collision Modal */}
      <Modal
        isOpen={conflictOpen}
        onClose={() => {
          setConflictOpen(false);
          setConflictItem(null);
        }}
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
                A file named <span className="font-semibold">"{conflictItem?.name}"</span> already exists in the destination directory.
              </p>
              <p className="text-xs text-[var(--cv-text-secondary)] mt-1">
                Please select how you would like to handle this conflict.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setConflictOpen(false);
                setConflictItem(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleConflictResolve("keep_both")}>
              Keep Both
            </Button>
            <Button variant="primary" size="sm" onClick={() => handleConflictResolve("replace")}>
              Replace
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ── Positioned Context Menu for Trash ─────────────────────────────

interface TrashContextMenuProps {
  position: { x: number; y: number };
  item: TrashedItem;
  onClose: () => void;
  onAction: (type: "restore" | "delete" | "details", item: TrashedItem) => void;
  prefersReduced: boolean;
}

function TrashContextMenu({
  position,
  item,
  onClose,
  onAction,
  prefersReduced,
}: TrashContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const transition = getTransition(dropdownTransition, prefersReduced);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const menuWidth = 160;
  const menuHeight = 100;
  const adjustedX = Math.min(position.x, window.innerWidth - menuWidth - 8);
  const adjustedY = Math.min(position.y, window.innerHeight - menuHeight - 8);

  return createPortal(
    <motion.div
      ref={menuRef}
      role="menu"
      variants={dropdownVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={transition}
      className="fixed z-[100] min-w-[160px] rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] p-1 shadow-[var(--cv-shadow-lg)] animate-in fade-in zoom-in-95 duration-100"
      style={{ top: adjustedY, left: adjustedX }}
    >
      <button
        role="menuitem"
        onClick={() => {
          onAction("restore", item);
          onClose();
        }}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--cv-text)] hover:bg-[var(--cv-bg-muted)] outline-none"
      >
        <RotateCcw size={14} className="text-[var(--cv-text-muted)]" />
        <span>Restore</span>
      </button>

      <button
        role="menuitem"
        onClick={() => {
          onAction("details", item);
          onClose();
        }}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--cv-text)] hover:bg-[var(--cv-bg-muted)] outline-none"
      >
        <Info size={14} className="text-[var(--cv-text-muted)]" />
        <span>Details</span>
      </button>

      <div className="my-1 h-px bg-[var(--cv-border)]" />

      <button
        role="menuitem"
        onClick={() => {
          onAction("delete", item);
          onClose();
        }}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-error hover:bg-rose-50 dark:hover:bg-rose-950/20 outline-none"
      >
        <Trash size={14} className="text-error" />
        <span>Delete Forever</span>
      </button>
    </motion.div>,
    document.body
  );
}
