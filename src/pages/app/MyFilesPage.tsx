/**
 * MyFilesPage.tsx — Full-featured file manager page for CloudVault.
 *
 * Features: grid/list toggle, sort/filter, multi-select, context menu,
 * inline rename, details panel, breadcrumb navigation, drag-drop uploads,
 * empty/error states. URL-driven folder navigation & state persistence.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router";
import {
  FolderPlus,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Upload,
  FolderOpen,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useUpload } from "../../context/UploadContext";
import { useToast } from "../../components/ui/ToastProvider";
import PageHeader from "../../components/layout/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { DropdownMenu } from "../../components/ui/DropdownMenu";
import { Skeleton } from "../../components/ui/Skeleton";
import { Breadcrumb } from "../../components/files/Breadcrumb";
import { FileGrid } from "../../components/files/FileGrid";
import { FileList } from "../../components/files/FileList";
import { FileContextMenu } from "../../components/files/FileContextMenu";
import type { ContextMenuAction } from "../../components/files/FileContextMenu";
import { SelectionToolbar } from "../../components/files/SelectionToolbar";
import { DetailsPanel } from "../../components/files/DetailsPanel";
import { DragDropOverlay } from "../../components/upload/DragDropOverlay";
import {
  QuotaExceededModal,
  SkippedFilesModal,
  DeleteConfirmModal,
} from "../../components/upload/UploadConflictModal";
import { ShareModal } from "../../components/files/ShareModal";
import { FilePreview } from "../../components/files/FilePreview";
import {
  getFiles,
  renameItem,
  createFolder,
  deleteItems,
  starItem,
  countChildren,
  formatBytes,
} from "../../services/fileService";
import type {
  FileSystemItem,
  SortField,
  SortDirection,
  FileItemType,
  BreadcrumbSegment,
} from "../../services/fileService";

// ── View mode type ───────────────────────────────────────────────
type ViewMode = "grid" | "list";

const filterOptions: { value: string; label: string }[] = [
  { value: "", label: "All types" },
  { value: "folder", label: "Folders" },
  { value: "image", label: "Images" },
  { value: "pdf", label: "PDFs" },
  { value: "document", label: "Documents" },
  { value: "spreadsheet", label: "Spreadsheets" },
  { value: "video", label: "Videos" },
  { value: "archive", label: "Archives" },
];

const sortOptions: { value: SortField; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "modifiedAt", label: "Date modified" },
  { value: "size", label: "Size" },
  { value: "type", label: "Type" },
];

// ── Component ────────────────────────────────────────────────────

export default function MyFilesPage() {
  const { folderId } = useParams<{ folderId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentWorkspace, refreshStorageUsed } = useWorkspace();
  const { startUpload } = useUpload();
  const { toast } = useToast();

  // ── State ──
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbSegment[]>([{ id: null, name: "Home" }]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<FileSystemItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const lastSelectedRef = useRef<string | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    item: FileSystemItem | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, item: null });

  // Modal state
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareItem, setShareItem] = useState<FileSystemItem | null>(null);
  const [previewItem, setPreviewItem] = useState<FileSystemItem | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    itemIds: string[];
    childrenCount: number;
  }>({ isOpen: false, itemIds: [], childrenCount: 0 });
  const [quotaModal, setQuotaModal] = useState<{
    isOpen: boolean;
    overageBytes: number;
  }>({ isOpen: false, overageBytes: 0 });
  const [skippedModal, setSkippedModal] = useState<{
    isOpen: boolean;
    files: string[];
  }>({ isOpen: false, files: [] });

  // ── URL-derived state ──
  const viewMode: ViewMode = (searchParams.get("view") as ViewMode) || (localStorage.getItem("cv_default_view") as ViewMode) || "grid";
  const sortBy: SortField = (searchParams.get("sort") as SortField) || "name";
  const sortDir: SortDirection =
    (searchParams.get("dir") as SortDirection) || "asc";
  const filterType: FileItemType | undefined =
    (searchParams.get("filter") as FileItemType) || undefined;

  // ── Auto-switch to list below 768px ──
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const effectiveView: ViewMode = isMobile ? "list" : viewMode;

  // ── Fetch files ──
  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getFiles(
        currentWorkspace.id,
        folderId ?? null,
        sortBy,
        sortDir,
        filterType
      );
      setItems(data.items);
      setBreadcrumb(data.breadcrumb);
    } catch {
      toast.error("Failed to load files");
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace.id, folderId, sortBy, sortDir, filterType, toast]);

  useEffect(() => {
    fetchFiles();
    // Clear selection on folder change
    setSelectedIds(new Set());
    setRenamingId(null);
  }, [fetchFiles]);

  // ── URL state helpers ──
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

  const handleViewChange = useCallback(
    (mode: ViewMode) => updateParam("view", mode),
    [updateParam]
  );

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

  const handleFilterChange = useCallback(
    (type: string) => updateParam("filter", type),
    [updateParam]
  );

  const clearFilters = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("filter");
      return next;
    });
  }, [setSearchParams]);

  // ── Selection ──
  const handleSelect = useCallback(
    (id: string, event: React.MouseEvent) => {
      if (event.shiftKey && lastSelectedRef.current) {
        // Range select
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
        // Toggle individual
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
        // Single select
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

  // ── Context menu ──
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: FileSystemItem) => {
      e.preventDefault();
      setContextMenu({
        isOpen: true,
        position: { x: e.clientX, y: e.clientY },
        item,
      });
    },
    []
  );

  const handleKebabClick = useCallback(
    (e: React.MouseEvent, item: FileSystemItem) => {
      e.stopPropagation();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setContextMenu({
        isOpen: true,
        position: { x: rect.right, y: rect.bottom },
        item,
      });
    },
    []
  );

  const handleContextAction = useCallback(
    async (action: ContextMenuAction) => {
      const { type, item } = action;

      switch (type) {
        case "open":
          if (item.type === "folder") {
            navigate(`/app/files/${item.id}`);
          } else {
            setPreviewItem(item);
          }
          break;

        case "rename":
          setRenamingId(item.id);
          break;

        case "star":
          try {
            await starItem(currentWorkspace.id, item.id);
            fetchFiles();
            toast.success(
              item.isStarred ? "Star removed" : "Star added"
            );
          } catch {
            toast.error("Failed to update star");
          }
          break;

        case "details":
          setDetailItem(item);
          setIsDetailOpen(true);
          break;

        case "trash":
          await handleDeleteRequest([item.id]);
          break;

        case "share":
          setShareItem(item);
          setShareModalOpen(true);
          break;

        case "move":
          toast.info("Move feature", "Coming in the next update");
          break;

        case "copy":
          toast.info("Copy feature", "Coming in the next update");
          break;

        case "download":
          toast.info("Download started", `Downloading ${item.name}`);
          break;
      }
    },
    [currentWorkspace.id, fetchFiles, navigate, toast]
  );

  // ── Double click (folder open or rename/preview) ──
  const handleDoubleClick = useCallback(
    (item: FileSystemItem) => {
      if (item.type === "folder") {
        navigate(`/app/files/${item.id}`);
      } else {
        setPreviewItem(item);
      }
    },
    [navigate]
  );

  // ── Inline rename ──
  const handleRenameConfirm = useCallback(
    async (id: string, newName: string) => {
      await renameItem(currentWorkspace.id, id, newName);
      setRenamingId(null);
      fetchFiles();
      toast.success("Renamed", `File renamed to "${newName}"`);
    },
    [currentWorkspace.id, fetchFiles, toast]
  );

  const handleRenameCancel = useCallback(() => {
    setRenamingId(null);
  }, []);

  // ── Create folder ──
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder(
        currentWorkspace.id,
        folderId ?? null,
        newFolderName.trim()
      );
      setNewFolderModalOpen(false);
      setNewFolderName("");
      fetchFiles();
      toast.success("Folder created", `"${newFolderName.trim()}" created`);
    } catch (err) {
      toast.error(
        "Failed to create folder",
        err instanceof Error ? err.message : undefined
      );
    }
  }, [newFolderName, currentWorkspace.id, folderId, fetchFiles, toast]);

  // ── Delete ──
  const handleDeleteRequest = useCallback(
    async (ids: string[]) => {
      const children = await countChildren(currentWorkspace.id, ids);
      setDeleteModal({ isOpen: true, itemIds: ids, childrenCount: children });
    },
    [currentWorkspace.id]
  );

  const handleDeleteConfirm = useCallback(async () => {
    try {
      const result = await deleteItems(
        currentWorkspace.id,
        deleteModal.itemIds
      );
      setDeleteModal({ isOpen: false, itemIds: [], childrenCount: 0 });
      setSelectedIds(new Set());
      fetchFiles();
      refreshStorageUsed();
      toast.success(
        "Moved to Trash",
        `${result.deletedCount} item${result.deletedCount !== 1 ? "s" : ""} moved to Trash`
      );
    } catch {
      toast.error("Failed to delete items");
    }
  }, [currentWorkspace.id, deleteModal.itemIds, fetchFiles, refreshStorageUsed, toast]);

  // ── File upload (drag-drop + button) ──
  const handleFileDrop = useCallback(
    async (files: File[]) => {
      const result = await startUpload(
        files,
        folderId ?? null,
        currentWorkspace.id
      );

      if (result.blocked.length > 0) {
        setSkippedModal({ isOpen: true, files: result.blocked });
      }
      if (result.quotaExceeded) {
        setQuotaModal({
          isOpen: true,
          overageBytes: result.quotaOverageBytes,
        });
      }
    },
    [startUpload, folderId, currentWorkspace.id]
  );

  const handleUploadClick = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = () => {
      if (input.files) {
        const files = Array.from(input.files);
        handleFileDrop(files);
      }
    };
    input.click();
  }, [handleFileDrop]);

  // ── Bulk actions ──
  const handleBulkDelete = useCallback(() => {
    handleDeleteRequest(Array.from(selectedIds));
  }, [selectedIds, handleDeleteRequest]);

  // ── Determine current title ──
  const currentFolder = breadcrumb[breadcrumb.length - 1];
  const pageTitle = folderId ? currentFolder?.name ?? "Files" : "My Files";

  // ── Has active filter producing no results ──
  const isFiltered = !!filterType;
  const noResults = !isLoading && items.length === 0;

  // ── Build actions slot ──
  const hasSelection = selectedIds.size > 0;

  const actionsSlot = hasSelection ? (
    <SelectionToolbar
      count={selectedIds.size}
      onMove={() => toast.info("Move", "Coming in the next update")}
      onCopy={() => toast.info("Copy", "Coming in the next update")}
      onDownload={() => toast.info("Download as ZIP", "Coming in the next update")}
      onDelete={handleBulkDelete}
      onDeselect={() => setSelectedIds(new Set())}
    />
  ) : (
    <div className="flex items-center gap-2">
      {/* New Folder */}
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<FolderPlus size={14} />}
        onClick={() => setNewFolderModalOpen(true)}
      >
        <span className="hidden sm:inline">New Folder</span>
      </Button>

      {/* Upload button (button-based alternative to DnD) */}
      <Button
        variant="primary"
        size="sm"
        leftIcon={<Upload size={14} />}
        onClick={handleUploadClick}
      >
        <span className="hidden sm:inline">Upload</span>
      </Button>

      {/* View toggle */}
      {!isMobile && (
        <div className="flex rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]">
          <button
            onClick={() => handleViewChange("grid")}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-l-lg transition-colors",
              effectiveView === "grid"
                ? "bg-[var(--cv-bg-muted)] text-[var(--cv-text)]"
                : "text-[var(--cv-text-muted)] hover:text-[var(--cv-text)]"
            )}
            aria-label="Grid view"
            aria-pressed={effectiveView === "grid"}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => handleViewChange("list")}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-r-lg transition-colors",
              effectiveView === "list"
                ? "bg-[var(--cv-bg-muted)] text-[var(--cv-text)]"
                : "text-[var(--cv-text-muted)] hover:text-[var(--cv-text)]"
            )}
            aria-label="List view"
            aria-pressed={effectiveView === "list"}
          >
            <List size={15} />
          </button>
        </div>
      )}

      {/* Sort dropdown */}
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

      {/* Filter dropdown */}
      <DropdownMenu
        trigger={
          <Button
            variant={filterType ? "secondary" : "ghost"}
            size="sm"
            iconOnly
            aria-label="Filter by type"
          >
            <Filter size={15} />
          </Button>
        }
        items={filterOptions.map((opt) => ({
          label:
            opt.value === (filterType ?? "")
              ? `✓ ${opt.label}`
              : opt.label,
          onClick: () => handleFilterChange(opt.value),
        }))}
        align="right"
      />
    </div>
  );

  return (
    <>
      <PageHeader
        title={pageTitle}
        breadcrumb={<Breadcrumb segments={breadcrumb} />}
        actions={actionsSlot}
      />

      <DragDropOverlay onDrop={handleFileDrop}>
        {/* ── Loading state ─────────────────────────────────────── */}
        {isLoading && (
          <div className="grid gap-3 cv-file-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                className="h-[140px] rounded-xl"
              />
            ))}
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────── */}
        {noResults && !isFiltered && (
          <EmptyState
            icon={FolderOpen}
            title="This folder is empty"
            description="Upload files or create a new folder to get started."
            actionLabel="Upload Files"
            onAction={handleUploadClick}
          />
        )}

        {/* ── No filter results ──────────────────────────────────── */}
        {noResults && isFiltered && (
          <EmptyState
            icon={Search}
            title="No files match your filter"
            description={`No ${filterType} files found in this folder.`}
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        )}

        {/* ── File grid / list ──────────────────────────────────── */}
        {!isLoading && items.length > 0 && (
          <>
            {effectiveView === "grid" ? (
              <FileGrid
                items={items}
                selectedIds={selectedIds}
                renamingId={renamingId}
                onSelect={handleSelect}
                onCheckboxChange={handleCheckboxChange}
                onContextMenu={handleContextMenu}
                onDoubleClick={handleDoubleClick}
                onRenameConfirm={handleRenameConfirm}
                onRenameCancel={handleRenameCancel}
                onKebabClick={handleKebabClick}
              />
            ) : (
              <FileList
                items={items}
                selectedIds={selectedIds}
                renamingId={renamingId}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={handleSortChange}
                onSelect={handleSelect}
                onCheckboxChange={handleCheckboxChange}
                onContextMenu={handleContextMenu}
                onDoubleClick={handleDoubleClick}
                onRenameConfirm={handleRenameConfirm}
                onRenameCancel={handleRenameCancel}
                onKebabClick={handleKebabClick}
                onSelectAll={handleSelectAll}
              />
            )}
          </>
        )}

        {/* ── Item count footer ──────────────────────────────────── */}
        {!isLoading && items.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-xs text-[var(--cv-text-muted)]">
            <span>
              {items.length} item{items.length !== 1 ? "s" : ""}
              {hasSelection && ` · ${selectedIds.size} selected`}
            </span>
            <span>
              {formatBytes(items.reduce((s, i) => s + i.size, 0))}
            </span>
          </div>
        )}
      </DragDropOverlay>

      {/* ── Context menu ────────────────────────────────────────── */}
      <FileContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        item={contextMenu.item}
        onClose={() =>
          setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, item: null })
        }
        onAction={handleContextAction}
      />

      {/* ── Details panel ───────────────────────────────────────── */}
      <DetailsPanel
        isOpen={isDetailOpen}
        item={detailItem}
        onClose={() => {
          setIsDetailOpen(false);
          setDetailItem(null);
        }}
      />

      {/* ── Share modal (stub) ──────────────────────────────────── */}
      <Modal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title="Share"
        size="md"
      >
        <div className="py-8 text-center">
          <p className="text-sm text-[var(--cv-text-muted)]">
            Share functionality coming soon.
          </p>
        </div>
      </Modal>

      {/* ── New Folder modal ────────────────────────────────────── */}
      <Modal
        isOpen={newFolderModalOpen}
        onClose={() => {
          setNewFolderModalOpen(false);
          setNewFolderName("");
        }}
        title="New Folder"
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="new-folder-name"
              className="block text-sm font-medium text-[var(--cv-text)]"
            >
              Folder name
            </label>
            <input
              id="new-folder-name"
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Project Assets"
              autoFocus
              className={cn(
                "flex h-9 w-full rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)]",
                "px-3 text-sm text-[var(--cv-text)] placeholder:text-[var(--cv-text-muted)]",
                "transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNewFolderModalOpen(false);
                setNewFolderName("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirmation ─────────────────────────────────── */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        itemCount={deleteModal.itemIds.length}
        childrenCount={deleteModal.childrenCount}
        onConfirm={handleDeleteConfirm}
        onCancel={() =>
          setDeleteModal({ isOpen: false, itemIds: [], childrenCount: 0 })
        }
      />

      {/* ── Quota exceeded ──────────────────────────────────────── */}
      <QuotaExceededModal
        isOpen={quotaModal.isOpen}
        overageBytes={quotaModal.overageBytes}
        onClose={() => setQuotaModal({ isOpen: false, overageBytes: 0 })}
      />

      {/* ── Skipped files ───────────────────────────────────────── */}
      <SkippedFilesModal
        isOpen={skippedModal.isOpen}
        skippedFiles={skippedModal.files}
        onClose={() => setSkippedModal({ isOpen: false, files: [] })}
      />

      {/* ── Share Modal ────────────────────────────────────────── */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setShareItem(null);
        }}
        item={shareItem}
        workspaceId={currentWorkspace.id}
      />

      {/* ── File Preview Dialog Modal ────────────────────────────────────── */}
      <Modal
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        title="File Preview"
        size="lg"
      >
        {previewItem && (
          <FilePreview
            item={previewItem}
            accessLevel="editor"
            onRename={async (newName) => {
              await renameItem(currentWorkspace.id, previewItem.id, newName);
              setPreviewItem((prev) => prev ? { ...prev, name: newName } : null);
              fetchFiles();
            }}
          />
        )}
      </Modal>
    </>
  );
}
