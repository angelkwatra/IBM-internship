/**
 * SharedPage.tsx — Fully interactive list/grid manager for files shared with the user.
 * Features: custom shared badges, view toggles, sort options, context menus,
 * search filters, bulk actions toolbar, and inline previews/discussion feeds.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Grid,
  List,
  Search,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Download,
  Star,
  Eye,
  Trash2,
  Share2,
  X,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useToast } from "../../components/ui/ToastProvider";
import PageHeader from "../../components/layout/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { Modal } from "../../components/ui/Modal";
import { Checkbox } from "../../components/ui/Checkbox";
import { DropdownMenu } from "../../components/ui/DropdownMenu";
import { FileTypeIconInline, FileTypeIcon } from "../../components/files/FileTypeIcon";
import { FilePreview } from "../../components/files/FilePreview";
import { ShareModal } from "../../components/files/ShareModal";
import {
  getAllFiles,
  starItem,
  deleteItems,
  renameItem,
  formatBytes,
  formatDate,
  type FileSystemItem,
  type SortField,
  type SortDirection,
} from "../../services/fileService";

type ViewMode = "grid" | "list";

export default function SharedPage() {
  const { currentWorkspace, refreshStorageUsed } = useWorkspace();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Layout preference
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem("cv_shared_view") as ViewMode) || "list"
  );

  // Sorting
  const [sortBy, setSortBy] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  // Modals state
  const [previewItem, setPreviewItem] = useState<FileSystemItem | null>(null);
  const [shareItem, setShareItem] = useState<FileSystemItem | null>(null);

  // Fetch shared files from workspace
  const fetchSharedFiles = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllFiles(currentWorkspace.id);
      // Filter only files shared with the user
      setItems(all.filter((item) => item.sharedWithMe));
    } catch {
      toast.error("Failed to load shared files");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace.id, toast]);

  useEffect(() => {
    fetchSharedFiles();
  }, [fetchSharedFiles]);

  const handleToggleView = () => {
    const next = viewMode === "list" ? "grid" : "list";
    setViewMode(next);
    localStorage.setItem("cv_shared_view", next);
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  // ── Multi-select ─────────────────────────────────────────────────────────

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleRowClick = (id: string, e: React.MouseEvent) => {
    const next = new Set(selectedIds);
    if (e.ctrlKey || e.metaKey) {
      if (next.has(id)) next.delete(id);
      else next.add(id);
    } else {
      if (next.has(id) && next.size === 1) next.delete(id);
      else {
        next.clear();
        next.add(id);
      }
    }
    setSelectedIds(next);
  };

  const handleCheckboxChange = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };

  // ── Action Handlers ──────────────────────────────────────────────────────

  const handleToggleStar = async (item: FileSystemItem) => {
    try {
      await starItem(currentWorkspace.id, item.id);
      fetchSharedFiles();
      toast.success(item.isStarred ? "Removed star" : "Starred file");
    } catch {
      toast.error("Failed to update star");
    }
  };

  const handleDeleteRequest = async (itemIds: string[]) => {
    try {
      await deleteItems(currentWorkspace.id, itemIds);
      setSelectedIds(new Set());
      fetchSharedFiles();
      refreshStorageUsed();
      toast.success("Removed shared link", `Removed ${itemIds.length} link(s) from shared list.`);
    } catch {
      toast.error("Failed to remove link");
    }
  };

  const handleDownload = (item: FileSystemItem) => {
    toast.info("Download started", `Downloading "${item.name}"`);
  };

  const handleFileRename = async (newName: string) => {
    if (!previewItem) return;
    try {
      await renameItem(currentWorkspace.id, previewItem.id, newName);
      setPreviewItem((prev) => (prev ? { ...prev, name: newName } : null));
      fetchSharedFiles();
      toast.success("Renamed shared file");
    } catch (err) {
      toast.error("Failed to rename file", err instanceof Error ? err.message : undefined);
    }
  };

  // ── Filtering & Sorting Logic ────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q));
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
          break;
        case "size":
          cmp = a.size - b.size;
          break;
        case "modifiedAt":
          cmp = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
          break;
        case "type":
          cmp = a.type.localeCompare(b.type);
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [items, searchQuery, sortBy, sortDir]);

  return (
    <>
      <PageHeader
        title="Shared with me"
        breadcrumb={<span>Home / Shared with me</span>}
        actions={
          items.length > 0 ? (
            <div className="flex items-center gap-2">
              {/* Search Bar */}
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-2.5 text-[var(--cv-text-muted)]"
                />
                <input
                  type="text"
                  placeholder="Search shared files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "h-8 rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] pl-8 pr-3 text-xs text-[var(--cv-text)] placeholder:text-[var(--cv-text-muted)]",
                    "transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 w-44 md:w-56"
                  )}
                />
              </div>

              {/* Layout view toggle */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleToggleView}
                iconOnly
                title={viewMode === "grid" ? "Switch to list" : "Switch to grid"}
              >
                {viewMode === "grid" ? <List size={16} /> : <Grid size={16} />}
              </Button>
            </div>
          ) : undefined
        }
      />

      {loading ? (
        <div className="grid gap-3 cv-file-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" className="h-[140px] rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No shared files yet"
          description="Files and folders shared with you by teammates will appear here."
        />
      ) : (
        <div className="space-y-4">
          {/* ── LIST VIEW ──────────────────────────────────────────────────── */}
          {viewMode === "list" && (
            <Card className="overflow-hidden border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--cv-border)] bg-[var(--cv-bg-subtle)]/40 text-left text-xs font-semibold uppercase tracking-wider text-[var(--cv-text-muted)]">
                      {/* Checkbox select all */}
                      <th className="w-12 px-4 py-3">
                        <Checkbox
                          checked={
                            filteredItems.length > 0 &&
                            selectedIds.size === filteredItems.length
                          }
                          onChange={handleSelectAll}
                          aria-label="Select all shared files"
                        />
                      </th>
                      <th className="px-3 py-3 font-semibold">
                        <button
                          onClick={() => handleSort("name")}
                          className="flex items-center gap-1 hover:text-[var(--cv-text)]"
                        >
                          <span>Name</span>
                          {sortBy === "name" && (sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                        </button>
                      </th>
                      <th className="hidden px-3 py-3 font-semibold sm:table-cell">
                        <button
                          onClick={() => handleSort("size")}
                          className="flex items-center gap-1 hover:text-[var(--cv-text)]"
                        >
                          <span>Size</span>
                          {sortBy === "size" && (sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                        </button>
                      </th>
                      <th className="hidden px-3 py-3 font-semibold md:table-cell">
                        <button
                          onClick={() => handleSort("modifiedAt")}
                          className="flex items-center gap-1 hover:text-[var(--cv-text)]"
                        >
                          <span>Shared Info</span>
                          {sortBy === "modifiedAt" && (sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                        </button>
                      </th>
                      <th className="px-3 py-3 font-semibold text-center">Permission</th>
                      <th className="w-20 px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--cv-border)]">
                    {filteredItems.map((item) => {
                      const isSelected = selectedIds.has(item.id);
                      const role = item.sharedRole || "viewer";

                      return (
                        <tr
                          key={item.id}
                          onClick={(e) => handleRowClick(item.id, e)}
                          onDoubleClick={() => setPreviewItem(item)}
                          className={cn(
                            "group cursor-pointer transition-colors hover:bg-[var(--cv-bg-muted)]/40",
                            isSelected && "bg-primary-500/5 dark:bg-primary-500/10"
                          )}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onChange={(checked) => handleCheckboxChange(item.id, checked)}
                              aria-label={`Select ${item.name}`}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3">
                              <FileTypeIconInline type={item.type} size={18} />
                              <span className="font-semibold text-sm text-[var(--cv-text)] truncate max-w-xs md:max-w-md">
                                {item.name}
                              </span>
                              {item.isStarred && (
                                <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
                              )}
                            </div>
                          </td>
                          <td className="hidden px-3 py-3 text-xs text-[var(--cv-text-secondary)] sm:table-cell">
                            {formatBytes(item.size)}
                          </td>
                          <td className="hidden px-3 py-3 text-xs md:table-cell">
                            <div className="flex flex-col">
                              <span className="font-medium text-[var(--cv-text)]">
                                Shared by {item.sharedBy || item.owner}
                              </span>
                              <span className="text-[10px] text-[var(--cv-text-muted)] mt-0.5">
                                {item.sharedDate ? formatDate(item.sharedDate) : formatDate(item.modifiedAt)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={cn(
                              "rounded-full px-2 py-0.5 font-bold text-[9px] uppercase tracking-wide border",
                              role === "editor"
                                ? "bg-green-500/10 text-green-600 border-green-500/20"
                                : role === "commenter"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                            )}>
                              {role}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setPreviewItem(item)}
                                className="p-1 rounded hover:bg-[var(--cv-bg-muted)] text-[var(--cv-text-secondary)]"
                                title="Preview file"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => handleDownload(item)}
                                className="p-1 rounded hover:bg-[var(--cv-bg-muted)] text-[var(--cv-text-secondary)]"
                                title="Download"
                              >
                                <Download size={14} />
                              </button>

                              <DropdownMenu
                                trigger={
                                  <button className="p-1 rounded hover:bg-[var(--cv-bg-muted)] text-[var(--cv-text-secondary)]">
                                    <MoreVertical size={14} />
                                  </button>
                                }
                                items={[
                                  {
                                    label: item.isStarred ? "Remove Star" : "Add Star",
                                    icon: Star,
                                    onClick: () => handleToggleStar(item),
                                  },
                                  {
                                    label: "Share Info",
                                    icon: Share2,
                                    onClick: () => setShareItem(item),
                                  },
                                  { label: "", isDivider: true },
                                  {
                                    label: "Remove link",
                                    icon: Trash2,
                                    onClick: () => handleDeleteRequest([item.id]),
                                  },
                                ]}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── GRID VIEW ──────────────────────────────────────────────────── */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const role = item.sharedRole || "viewer";

                return (
                  <Card
                    key={item.id}
                    onClick={(e) => handleRowClick(item.id, e)}
                    onDoubleClick={() => setPreviewItem(item)}
                    className={cn(
                      "group relative flex flex-col border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] p-4 cursor-pointer hover:shadow-sm transition-all duration-100",
                      isSelected && "ring-1 ring-primary-500"
                    )}
                  >
                    {/* Header: checkbox, icon, and actions */}
                    <div className="flex items-start justify-between">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={(checked) => handleCheckboxChange(item.id, checked)}
                          aria-label={`Select ${item.name}`}
                        />
                      </div>
                      <FileTypeIcon type={item.type} size={32} />
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu
                          trigger={
                            <button className="p-1 rounded hover:bg-[var(--cv-bg-muted)] text-[var(--cv-text-muted)] hover:text-[var(--cv-text)]">
                              <MoreVertical size={14} />
                            </button>
                          }
                          items={[
                            {
                              label: "Open / Preview",
                              icon: Eye,
                              onClick: () => setPreviewItem(item),
                            },
                            {
                              label: "Download",
                              icon: Download,
                              onClick: () => handleDownload(item),
                            },
                            {
                              label: item.isStarred ? "Remove Star" : "Add Star",
                              icon: Star,
                              onClick: () => handleToggleStar(item),
                            },
                            {
                              label: "Share Settings",
                              icon: Share2,
                              onClick: () => setShareItem(item),
                            },
                            { label: "", isDivider: true },
                            {
                              label: "Remove link",
                              icon: Trash2,
                              onClick: () => handleDeleteRequest([item.id]),
                            },
                          ]}
                        />
                      </div>
                    </div>

                    {/* File info */}
                    <div className="flex-1 mt-4 space-y-1 pr-6">
                      <p className="font-bold text-sm text-[var(--cv-text)] truncate" title={item.name}>
                        {item.name}
                      </p>
                      <div className="flex justify-between items-center text-[10px] text-[var(--cv-text-muted)] pt-0.5">
                        <span>{formatBytes(item.size)}</span>
                        <span className={cn(
                          "rounded-full px-1.5 py-0.2 border text-[8px] font-bold uppercase",
                          role === "editor"
                            ? "bg-green-500/10 text-green-600 border-green-500/15"
                            : role === "commenter"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/15"
                            : "bg-blue-500/10 text-blue-600 border-blue-500/15"
                        )}>
                          {role}
                        </span>
                      </div>
                    </div>

                    {/* Shared source info */}
                    <div className="mt-4 pt-3 border-t border-[var(--cv-border)] flex items-center gap-2 text-[10px] text-[var(--cv-text-secondary)]">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-950/40 text-primary-650 dark:text-primary-405 font-bold uppercase text-[9px]">
                        {(item.sharedBy || item.owner).slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--cv-text)] truncate">
                          {item.sharedBy || item.owner}
                        </p>
                        <p className="text-[9px] text-[var(--cv-text-muted)] mt-0.2">
                          Shared {item.sharedDate ? formatDate(item.sharedDate) : formatDate(item.modifiedAt)}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ── Selection Bulk Actions Toolbar ───────────────────────────────── */}
          {selectedIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]/90 px-4 py-2.5 shadow-2xl backdrop-blur-md">
              <span className="pr-3 text-xs font-bold text-[var(--cv-text)] border-r border-[var(--cv-border)]">
                {selectedIds.size} selected
              </span>
              <div className="flex items-center gap-1.5 pl-1.5">
                {selectedIds.size === 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const sel = items.find((i) => selectedIds.has(i.id));
                      if (sel) setPreviewItem(sel);
                    }}
                    leftIcon={<Eye size={12} />}
                  >
                    Preview
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const sel = items.filter((i) => selectedIds.has(i.id));
                    sel.forEach(handleDownload);
                  }}
                  leftIcon={<Download size={12} />}
                >
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const sel = items.filter((i) => selectedIds.has(i.id));
                    sel.forEach(handleToggleStar);
                  }}
                  leftIcon={<Star size={12} />}
                >
                  Star
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteRequest(Array.from(selectedIds))}
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  leftIcon={<Trash2 size={12} />}
                >
                  Remove Links
                </Button>
              </div>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="ml-2 rounded-full p-1 text-[var(--cv-text-muted)] hover:bg-[var(--cv-bg-muted)]"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── File Preview Dialog Modal ────────────────────────────────────── */}
      <Modal
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        title="Shared File View"
        size="lg"
      >
        {previewItem && (
          <FilePreview
            item={previewItem}
            accessLevel={previewItem.sharedRole || "viewer"}
            onRename={previewItem.sharedRole === "editor" ? handleFileRename : undefined}
          />
        )}
      </Modal>

      {/* ── Share Modal Settings ─────────────────────────────────────────── */}
      <ShareModal
        isOpen={!!shareItem}
        onClose={() => setShareItem(null)}
        item={shareItem}
        workspaceId={currentWorkspace.id}
      />
    </>
  );
}

