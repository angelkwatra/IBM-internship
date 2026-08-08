import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import {
  Clock,
  HardDrive,
  Upload,
  FolderPlus,
  Link as LinkIcon,
  BarChart3,
  ChevronRight,
  Trash,
  LayoutDashboard,
  Calendar,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useAuth } from "../../context/AuthContext";
import { useUpload } from "../../context/UploadContext";
import { useToast } from "../../components/ui/ToastProvider";
import PageHeader from "../../components/layout/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { FileTypeIcon } from "../../components/files/FileTypeIcon";
import {
  getAllFiles,
  getStorageAnalytics,
  createFolder,
  deleteItems,
  formatBytes,
  formatDate,
} from "../../services/fileService";
import type { FileSystemItem, StorageAnalytics } from "../../services/fileService";

// Helper hook for animating numbers counting up on mount
function useCountUp(targetValue: number, duration = 800) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * targetValue));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [targetValue, duration]);

  return count;
}

const CATEGORY_COLORS: Record<string, string> = {
  Documents: "bg-blue-500",
  Images: "bg-violet-500",
  Videos: "bg-amber-500",
  Audio: "bg-emerald-500",
  Other: "bg-gray-500",
};

export default function DashboardPage() {
  const { currentWorkspace, refreshStorageUsed } = useWorkspace();
  const { user } = useAuth();
  const { startUpload } = useUpload();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Data state
  const [files, setFiles] = useState<FileSystemItem[]>([]);
  const [analytics, setAnalytics] = useState<StorageAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const firstName = useMemo(() => {
    if (!user?.name) return "User";
    return user.name.split(" ")[0];
  }, [user]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allFiles, storageInfo] = await Promise.all([
        getAllFiles(currentWorkspace.id),
        getStorageAnalytics(currentWorkspace.id),
      ]);
      setFiles(allFiles);
      setAnalytics(storageInfo);
    } catch {
      toast.error("Failed to load dashboard metrics");
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace.id, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived metrics
  const activeFiles = useMemo(() => files.filter((f) => f.type !== "folder"), [files]);
  const activeFolders = useMemo(() => files.filter((f) => f.type === "folder"), [files]);

  // Recent files (8 most recently modified)
  const recentFiles = useMemo(() => {
    return [...activeFiles]
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
      .slice(0, 8);
  }, [activeFiles]);

  // Count modified in the last 7 days for recent activity count
  const recentActivityCount = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return files.filter((f) => new Date(f.modifiedAt).getTime() > sevenDaysAgo.getTime()).length;
  }, [files]);

  // Generate dynamic activity items from actual mock files
  const dynamicActivityFeed = useMemo(() => {
    const sorted = [...files]
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
      .slice(0, 5);

    return sorted.map((file) => {
      const isFolder = file.type === "folder";
      const relativeTime = formatDate(file.modifiedAt);
      
      let description = "";
      if (isFolder) {
        description = `Created folder "${file.name}"`;
      } else if (file.createdAt === file.modifiedAt) {
        description = `Uploaded file "${file.name}"`;
      } else {
        description = `Modified file "${file.name}"`;
      }

      return {
        id: file.id + "_act",
        description,
        time: relativeTime,
      };
    });
  }, [files]);

  // Storage data
  const storageUsedGB = useMemo(() => {
    if (!analytics) return 0;
    return analytics.totalUsed / (1024 * 1024 * 1024);
  }, [analytics]);

  const storageLimitGB = 15;
  const storagePercent = useMemo(() => {
    return Math.min(100, (storageUsedGB / storageLimitGB) * 100);
  }, [storageUsedGB]);

  // Stats Counters
  const animatedFilesCount = useCountUp(activeFiles.length);
  const animatedRecentActivityCount = useCountUp(recentActivityCount);

  // Trigger file picker
  const handleUploadShortcut = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = async () => {
      if (input.files) {
        const fileList = Array.from(input.files);
        const res = await startUpload(
          fileList,
          null, // root
          currentWorkspace.id
        );
        if (res.started > 0) {
          toast.success("Upload started", `Uploading ${res.started} files.`);
          // Reload metrics after a delay to match mock upload simulation
          setTimeout(() => {
            loadData();
            refreshStorageUsed();
          }, 2000);
        }
      }
    };
    input.click();
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder(currentWorkspace.id, null, newFolderName.trim());
      toast.success("Folder created", `Created "${newFolderName}" folder.`);
      setNewFolderOpen(false);
      setNewFolderName("");
      loadData();
    } catch {
      toast.error("Failed to create folder");
    }
  };

  const handleDeleteRecent = async (id: string) => {
    try {
      await deleteItems(currentWorkspace.id, [id]);
      toast.success("Item moved to Trash");
      loadData();
      refreshStorageUsed();
    } catch {
      toast.error("Failed to delete item");
    }
  };

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const hasFiles = files.length > 0;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        breadcrumb={<span>Home / Dashboard</span>}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Upload size={14} />}
            onClick={handleUploadShortcut}
          >
            Upload Files
          </Button>
        }
      />

      {/* Sub-header Date row */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--cv-text-muted)] -mt-4">
        <Calendar size={13} />
        <span>{todayStr}</span>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-28 animate-pulse bg-[var(--cv-bg-subtle)]" />
          ))}
        </div>
      ) : !hasFiles ? (
        /* Empty Drive State */
        <div className="flex flex-col items-center">
          <EmptyState
            icon={LayoutDashboard}
            title="Your drive is empty"
            description="Get started by creating a folder or uploading your files."
          />
          <div className="flex gap-3 -mt-6">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FolderPlus size={14} />}
              onClick={() => setNewFolderOpen(true)}
            >
              Create Folder
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Upload size={14} />}
              onClick={handleUploadShortcut}
            >
              Upload Files
            </Button>
          </div>
        </div>
      ) : (
        /* Dashboard main grid view */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* ── Stat Cards ─────────────────────────────────────────── */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
            {/* Storage metric */}
            <Card className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--cv-text-muted)]">Storage Used</p>
                <p className="text-lg font-bold text-[var(--cv-text)] mt-1">
                  {storageUsedGB.toFixed(1)} GB
                </p>
                <p className="text-[10px] text-[var(--cv-text-secondary)] mt-0.5">
                  of {storageLimitGB} GB limit
                </p>
              </div>

              {/* Miniature Circular gauge */}
              <div className="relative h-12 w-12 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="var(--cv-bg-muted)" strokeWidth="3.5" fill="transparent" />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke={storagePercent > 90 ? "var(--color-warning)" : "var(--cv-primary, #3b82f6)"}
                    strokeWidth="3.5"
                    fill="transparent"
                    strokeDasharray={125.6}
                    strokeDashoffset={125.6 - (125.6 * storagePercent) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[9px] font-bold text-[var(--cv-text)]">
                  {Math.round(storagePercent)}%
                </span>
              </div>
            </Card>

            {/* Total files count */}
            <Card className="p-4 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--cv-text-muted)]">Active Files</p>
                <p className="text-2xl font-extrabold text-[var(--cv-text)] mt-1">
                  {animatedFilesCount}
                </p>
              </div>
              <p className="text-[10px] text-[var(--cv-text-secondary)] mt-2">
                across {activeFolders.length} folders
              </p>
            </Card>

            {/* Shared files count stub */}
            <Card className="p-4 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--cv-text-muted)]">Shared Items</p>
                <p className="text-2xl font-extrabold text-[var(--cv-text)] mt-1">3</p>
              </div>
              <p className="text-[10px] text-[var(--cv-text-secondary)] mt-2">
                active sharing connections
              </p>
            </Card>

            {/* Recent activity count */}
            <Card className="p-4 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--cv-text-muted)]">Weekly Updates</p>
                <p className="text-2xl font-extrabold text-[var(--cv-text)] mt-1">
                  {animatedRecentActivityCount}
                </p>
              </div>
              <p className="text-[10px] text-[var(--cv-text-secondary)] mt-2">
                files modified in last 7 days
              </p>
            </Card>
          </div>

          {/* ── Quick Actions row ──────────────────────────────────── */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <button
              onClick={() => setNewFolderOpen(true)}
              className="flex items-center gap-3 p-3 rounded-xl border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] hover:bg-[var(--cv-bg-muted)] transition-all text-left"
            >
              <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <FolderPlus size={16} />
              </div>
              <span className="text-xs font-semibold text-[var(--cv-text)]">New Folder</span>
            </button>

            <button
              onClick={handleUploadShortcut}
              className="flex items-center gap-3 p-3 rounded-xl border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] hover:bg-[var(--cv-bg-muted)] transition-all text-left"
            >
              <div className="h-8 w-8 rounded-lg bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                <Upload size={16} />
              </div>
              <span className="text-xs font-semibold text-[var(--cv-text)]">Upload Files</span>
            </button>

            <button
              onClick={() => toast.info("Sharing link", "Open files and right-click to share.")}
              className="flex items-center gap-3 p-3 rounded-xl border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] hover:bg-[var(--cv-bg-muted)] transition-all text-left"
            >
              <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <LinkIcon size={16} />
              </div>
              <span className="text-xs font-semibold text-[var(--cv-text)]">Share File</span>
            </button>

            <Link
              to="/app/storage"
              className="flex items-center gap-3 p-3 rounded-xl border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] hover:bg-[var(--cv-bg-muted)] transition-all text-left"
            >
              <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <BarChart3 size={16} />
              </div>
              <span className="text-xs font-semibold text-[var(--cv-text)]">Analytics</span>
            </Link>
          </div>

          {/* ── Recent Files row ───────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[var(--cv-text)]">Recent Files</h3>
              <Link
                to="/app/files"
                className="text-xs font-semibold text-primary-500 hover:text-primary-600 flex items-center gap-0.5"
              >
                View all <ChevronRight size={13} />
              </Link>
            </div>

            {/* Horizontally scrollable container */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {recentFiles.map((file) => (
                <div
                  key={file.id}
                  className="group relative flex flex-col justify-between w-40 h-32 p-3 rounded-xl border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] hover:border-[var(--cv-border-strong)] transition-all shrink-0 cursor-pointer"
                  onClick={() => navigate(`/app/files`)}
                >
                  <div className="flex justify-between items-start">
                    <FileTypeIcon type={file.type} size={22} />
                    {/* Quick hover action delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRecent(file.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[var(--cv-text-muted)] hover:text-red-500 rounded bg-[var(--cv-bg-muted)] transition-opacity shrink-0"
                      aria-label="Delete"
                    >
                      <Trash size={12} />
                    </button>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--cv-text)] truncate">{file.name}</p>
                    <p className="text-[9px] text-[var(--cv-text-secondary)] mt-0.5">
                      {formatBytes(file.size)} · {formatDate(file.modifiedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Main Activity Feed & Breakdown Grid ────────────────── */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Feed block */}
            <Card className="col-span-2 p-5 space-y-4">
              <div className="flex items-center gap-1.5 border-b border-[var(--cv-border)] pb-3">
                <Clock size={15} className="text-[var(--cv-text-muted)]" />
                <h3 className="text-sm font-bold text-[var(--cv-text)]">Recent Activity</h3>
              </div>

              <div className="relative border-l border-[var(--cv-border)] pl-4 ml-2.5 space-y-4 py-1">
                {dynamicActivityFeed.map((act) => (
                  <div key={act.id} className="relative">
                    {/* Timeline bullet */}
                    <span className="absolute -left-[21.5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary-500 bg-[var(--cv-bg-elevated)]" />
                    <div>
                      <p className="text-xs text-[var(--cv-text)] font-medium leading-relaxed">
                        {act.description}
                      </p>
                      <p className="text-[10px] text-[var(--cv-text-secondary)] mt-0.5">
                        {act.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Breakdown block */}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 border-b border-[var(--cv-border)] pb-3 mb-4">
                  <HardDrive size={15} className="text-[var(--cv-text-muted)]" />
                  <h3 className="text-sm font-bold text-[var(--cv-text)]">Storage Breakdown</h3>
                </div>

                {/* Stacked Horizontal Bar */}
                {analytics && (
                  <div className="w-full h-3 rounded-full overflow-hidden flex bg-[var(--cv-bg-muted)]">
                    {analytics.breakdown.map((cat) => {
                      const pct = (cat.size / (analytics.totalUsed || 1)) * 100;
                      if (pct <= 0) return null;
                      return (
                        <div
                          key={cat.type}
                          className={cn("h-full", CATEGORY_COLORS[cat.type])}
                          style={{ width: `${pct}%` }}
                          title={`${cat.type}: ${pct.toFixed(1)}%`}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Legend list */}
                {analytics && (
                  <div className="mt-5 space-y-2">
                    {analytics.breakdown.map((cat) => {
                      const pct = (cat.size / (analytics.totalUsed || 1)) * 100;
                      return (
                        <div key={cat.type} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={cn("h-2 w-2 rounded-full", CATEGORY_COLORS[cat.type])} />
                            <span className="font-medium text-[var(--cv-text)]">{cat.type}</span>
                          </div>
                          <span className="text-[10px] text-[var(--cv-text-secondary)] font-semibold">
                            {formatBytes(cat.size)} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* View Breakdown CTA */}
              <Link
                to="/app/storage"
                className="mt-6 block text-center text-xs font-semibold text-primary-500 hover:underline border-t border-[var(--cv-border)] pt-3"
              >
                View Detailed Analytics
              </Link>
            </Card>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      <Modal
        isOpen={newFolderOpen}
        onClose={() => {
          setNewFolderOpen(false);
          setNewFolderName("");
        }}
        title="Create New Folder"
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="folder-name-input" className="block text-xs font-semibold text-[var(--cv-text-secondary)]">
              Folder Name
            </label>
            <input
              id="folder-name-input"
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Invoices"
              className="flex h-9 w-full rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
              }}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
