import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  AlertTriangle,
  Trash,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
} from "recharts";
import { cn } from "../../lib/cn";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useToast } from "../../components/ui/ToastProvider";
import PageHeader from "../../components/layout/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { FileTypeIconInline } from "../../components/files/FileTypeIcon";
import {
  getStorageAnalytics,
  deleteItems,
  formatBytes,
} from "../../services/fileService";
import type {
  StorageAnalytics,
  FileSystemItem,
} from "../../services/fileService";

// Colors mapped to Tailwind theme palettes for breakdown
const CATEGORY_COLORS: Record<string, string> = {
  Documents: "#3b82f6", // blue
  Images: "#8b5cf6",    // violet
  Videos: "#f59e0b",    // amber
  Audio: "#10b981",    // emerald
  Other: "#6b7280",    // gray
};

export default function StoragePage() {
  const { currentWorkspace, refreshStorageUsed } = useWorkspace();
  const { toast } = useToast();

  const [data, setData] = useState<StorageAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Toggles
  const [timeRange, setTimeRange] = useState<"30" | "90" | "365">("90");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  // Table Accessibility Toggles
  const [showBreakdownTable, setShowBreakdownTable] = useState(false);
  const [showHistoryTable, setShowHistoryTable] = useState(false);

  // Preview state
  const [previewFile, setPreviewFile] = useState<FileSystemItem | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await getStorageAnalytics(currentWorkspace.id);
      setData(res);
    } catch {
      toast.error("Failed to load storage analytics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    setActiveCategoryFilter(null);
  }, [currentWorkspace.id]);

  // Calculate percentage used
  const usedPercent = useMemo(() => {
    if (!data) return 0;
    return (data.totalUsed / data.totalQuota) * 100;
  }, [data]);

  // Determine warning status based on quota utilization
  const quotaStatus = useMemo(() => {
    if (usedPercent >= 100) return "critical";
    if (usedPercent >= 90) return "warning";
    return "normal";
  }, [usedPercent]);

  // Summary Pie Data
  const summaryPieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Used", value: data.totalUsed },
      { name: "Free", value: Math.max(0, data.totalQuota - data.totalUsed) },
    ];
  }, [data]);

  // History Chart points based on range
  const filteredHistory = useMemo(() => {
    if (!data) return [];
    const pointsCount = timeRange === "30" ? 30 : 90;
    return data.usageHistory.slice(-pointsCount);
  }, [data, timeRange]);

  // Client-side category filtering of top largest files list
  const filteredLargestFiles = useMemo(() => {
    if (!data) return [];
    if (!activeCategoryFilter) return data.largestFiles;

    return data.largestFiles.filter((file) => {
      let category = "Other";
      if (file.type === "document" || file.type === "pdf" || file.type === "spreadsheet") {
        category = "Documents";
      } else if (file.type === "image") {
        category = "Images";
      } else if (file.type === "video") {
        category = "Videos";
      } else if ((file.type as string) === "audio") {
        category = "Audio";
      }
      return category === activeCategoryFilter;
    });
  }, [data, activeCategoryFilter]);

  // Handle Delete (Move to Trash)
  const handleDeleteFile = async (id: string) => {
    try {
      await deleteItems(currentWorkspace.id, [id]);
      toast.success("File moved to Trash", "The file is now in the Trash page.");
      refreshStorageUsed();
      fetchAnalytics();
    } catch {
      toast.error("Failed to delete file");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Storage Analytics" breadcrumb={<span>Home / Storage</span>} />
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="h-64 animate-pulse bg-[var(--cv-bg-subtle)]" />
          <Card className="col-span-2 h-64 animate-pulse bg-[var(--cv-bg-subtle)]" />
        </div>
        <Card className="h-96 animate-pulse bg-[var(--cv-bg-subtle)]" />
      </div>
    );
  }

  // Edge case: Not enough data yet
  if (!data || data.largestFiles.length < 3) {
    return (
      <>
        <PageHeader title="Storage Analytics" breadcrumb={<span>Home / Storage</span>} />
        <EmptyState
          icon={BarChart3}
          title="Not enough data yet"
          description="Upload more files in My Files to generate storage breakdown and historical usage reports."
        />
      </>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Storage Analytics" breadcrumb={<span>Home / Storage</span>} />

      {/* ── Top Summary Grid ────────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Quota Ring Card */}
        <Card className="flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-sm font-semibold text-[var(--cv-text-muted)] self-start mb-4">
            Storage Quota
          </h2>

          <div className="relative flex items-center justify-center h-40 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summaryPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={76}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                >
                  <Cell
                    fill={
                      quotaStatus === "critical"
                        ? "#ef4444" // red
                        : quotaStatus === "warning"
                        ? "#f59e0b" // amber
                        : "var(--cv-primary, #3b82f6)"
                    }
                  />
                  <Cell fill="var(--cv-bg-muted)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Inner Text info */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-[var(--cv-text)]">
                {usedPercent.toFixed(1)}%
              </span>
              <span className="text-[10px] text-[var(--cv-text-secondary)] mt-0.5 uppercase tracking-wide">
                Used
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <p className="text-sm font-medium text-[var(--cv-text)]">
              {formatBytes(data.totalUsed)} used of {formatBytes(data.totalQuota)}
            </p>
            {quotaStatus === "critical" && (
              <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                <AlertTriangle size={12} /> Storage full. Free up space or upgrade.
              </p>
            )}
            {quotaStatus === "warning" && (
              <p className="text-xs text-amber-500 font-medium flex items-center gap-1">
                <AlertTriangle size={12} /> Running low on space.
              </p>
            )}
          </div>

          {/* Upgrade Plan Promo */}
          <div className="mt-6 w-full border-t border-[var(--cv-border)] pt-4 flex items-center justify-between">
            <div className="text-left">
              <p className="text-xs font-semibold text-[var(--cv-text)]">{data.planName}</p>
              <p className="text-[10px] text-[var(--cv-text-secondary)]">Free storage plan tier</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400 text-white rounded-lg"
            >
              Upgrade
            </Button>
          </div>
        </Card>

        {/* Breakdown Card */}
        <Card className="col-span-2 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--cv-text)]">
                Breakdown by File Type
              </h2>
              <p className="text-xs text-[var(--cv-text-muted)] mt-0.5">
                Click a category below to filter the largest files list.
              </p>
            </div>
            <button
              onClick={() => setShowBreakdownTable(!showBreakdownTable)}
              className="text-xs text-primary-500 hover:underline"
            >
              {showBreakdownTable ? "View Chart" : "View as Table"}
            </button>
          </div>

          {showBreakdownTable ? (
            /* Accessible Table View */
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--cv-border)] text-[var(--cv-text-muted)]">
                    <th className="py-2">Category</th>
                    <th className="py-2 text-right">Items Count</th>
                    <th className="py-2 text-right">Total Size</th>
                    <th className="py-2 text-right">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdown.map((row) => (
                    <tr
                      key={row.type}
                      onClick={() => setActiveCategoryFilter(activeCategoryFilter === row.type ? null : row.type)}
                      className={cn(
                        "border-b border-[var(--cv-border)] last:border-b-0 cursor-pointer hover:bg-[var(--cv-bg-muted)]",
                        activeCategoryFilter === row.type && "bg-primary-50/55 dark:bg-primary-950/20 font-semibold"
                      )}
                    >
                      <td className="py-2 flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[row.type] }}
                        />
                        {row.type}
                      </td>
                      <td className="py-2 text-right">{row.count}</td>
                      <td className="py-2 text-right">{formatBytes(row.size)}</td>
                      <td className="py-2 text-right">
                        {((row.size / (data.totalUsed || 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Visual Chart View */
            <div className="flex flex-col sm:flex-row items-center gap-6 flex-1">
              <div className="h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.breakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={64}
                      dataKey="size"
                      onClick={(pieNode: any) => {
                        const type = pieNode?.payload?.type || pieNode?.type;
                        if (type) {
                          setActiveCategoryFilter(activeCategoryFilter === type ? null : type);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {data.breakdown.map((entry) => (
                        <Cell
                          key={entry.type}
                          fill={CATEGORY_COLORS[entry.type]}
                          stroke="var(--cv-bg-elevated)"
                          strokeWidth={2}
                          className={cn(
                            "opacity-100 transition-opacity duration-150",
                            activeCategoryFilter && activeCategoryFilter !== entry.type && "opacity-40"
                          )}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legends & Details */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 flex-1 w-full text-xs">
                {data.breakdown.map((cat) => {
                  const percent = ((cat.size / (data.totalUsed || 1)) * 100).toFixed(1);
                  const isFiltered = activeCategoryFilter === cat.type;
                  return (
                    <button
                      key={cat.type}
                      onClick={() => setActiveCategoryFilter(isFiltered ? null : cat.type)}
                      className={cn(
                        "flex items-start gap-2.5 p-2 rounded-lg transition-all text-left",
                        "hover:bg-[var(--cv-bg-muted)]",
                        isFiltered && "ring-1 ring-primary-500/50 bg-primary-500/5 dark:bg-primary-500/10"
                      )}
                    >
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded"
                        style={{ backgroundColor: CATEGORY_COLORS[cat.type] }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[var(--cv-text)] truncate">{cat.type}</p>
                        <p className="text-[10px] text-[var(--cv-text-secondary)] mt-0.5">
                          {formatBytes(cat.size)} · {percent}%
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Usage Over Time ───────────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-sm font-semibold text-[var(--cv-text)]">
              Usage History
            </h2>
            <p className="text-xs text-[var(--cv-text-muted)] mt-0.5">
              Historical storage capacity used in gigabytes over time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistoryTable(!showHistoryTable)}
              className="text-xs text-primary-500 hover:underline mr-2"
            >
              {showHistoryTable ? "View Chart" : "View as Table"}
            </button>
            <div className="flex rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-muted)] p-0.5">
              <button
                onClick={() => setTimeRange("30")}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                  timeRange === "30"
                    ? "bg-[var(--cv-bg-elevated)] text-[var(--cv-text)] shadow-sm"
                    : "text-[var(--cv-text-muted)] hover:text-[var(--cv-text)]"
                )}
              >
                30 Days
              </button>
              <button
                onClick={() => setTimeRange("90")}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                  timeRange === "90"
                    ? "bg-[var(--cv-bg-elevated)] text-[var(--cv-text)] shadow-sm"
                    : "text-[var(--cv-text-muted)] hover:text-[var(--cv-text)]"
                )}
              >
                90 Days
              </button>
              <button
                disabled
                className="px-2.5 py-1 text-xs font-semibold rounded-md text-[var(--cv-text-muted)] opacity-40 cursor-not-allowed"
                title="Only 90 days of history simulated"
              >
                1 Year
              </button>
            </div>
          </div>
        </div>

        {showHistoryTable ? (
          /* Accessible Table view for history */
          <div className="h-64 overflow-y-auto border border-[var(--cv-border)] rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="sticky top-0 bg-[var(--cv-bg-muted)] border-b border-[var(--cv-border)] text-[var(--cv-text-muted)]">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2 text-right">Capacity Used (GB)</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((pt, idx) => (
                  <tr key={idx} className="border-b border-[var(--cv-border)] last:border-b-0">
                    <td className="px-4 py-2 text-[var(--cv-text-secondary)]">{pt.date}</td>
                    <td className="px-4 py-2 text-right font-medium">{pt.totalGB} GB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Visual Area Chart */
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredHistory}>
                <defs>
                  <linearGradient id="historyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--cv-primary, #3b82f6)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--cv-primary, #3b82f6)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--cv-text-secondary)", fontSize: 10 }}
                  axisLine={{ stroke: "var(--cv-border)" }}
                  tickLine={{ stroke: "var(--cv-border)" }}
                />
                <YAxis
                  tickFormatter={(val) => `${val} GB`}
                  tick={{ fill: "var(--cv-text-secondary)", fontSize: 10 }}
                  axisLine={{ stroke: "var(--cv-border)" }}
                  tickLine={{ stroke: "var(--cv-border)" }}
                />
                <ChartTooltip
                  contentStyle={{
                    backgroundColor: "var(--cv-bg-elevated)",
                    borderColor: "var(--cv-border)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "var(--cv-text)", fontWeight: "bold" }}
                  itemStyle={{ color: "var(--cv-text)" }}
                  formatter={(value: any) => [`${value} GB`, "Total Size"]}
                />
                <Area
                  type="monotone"
                  dataKey="totalGB"
                  stroke="var(--cv-primary, #3b82f6)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#historyGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* ── Largest Files Section ─────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--cv-text)]">
              Largest Files
            </h2>
            <p className="text-xs text-[var(--cv-text-muted)] mt-0.5">
              Review your top capacity consuming files.
              {activeCategoryFilter && (
                <span>
                  {" "}Filtering by: <span className="font-semibold text-primary-500">{activeCategoryFilter}</span>.{" "}
                  <button onClick={() => setActiveCategoryFilter(null)} className="text-xs text-primary-500 underline ml-1">
                    Clear filter
                  </button>
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[var(--cv-border)]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--cv-bg-muted)] border-b border-[var(--cv-border)] text-[var(--cv-text-muted)]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLargestFiles.map((file) => (
                <tr key={file.id} className="border-b border-[var(--cv-border)] last:border-b-0 hover:bg-[var(--cv-bg-muted)]">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <FileTypeIconInline type={file.type} size={16} />
                      <span className="font-medium text-[var(--cv-text)] truncate max-w-xs">{file.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--cv-text-secondary)]">{formatBytes(file.size)}</td>
                  <td className="px-4 py-2.5 text-[var(--cv-text-secondary)]">{file.owner}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-primary-500"
                        onClick={() => setPreviewFile(file)}
                      >
                        Preview
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        iconOnly
                        aria-label={`Move ${file.name} to Trash`}
                        onClick={() => handleDeleteFile(file.id)}
                      >
                        <Trash size={12} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLargestFiles.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[var(--cv-text-muted)]">
                    No files found in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Preview Modal Stub */}
      <Modal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        title="File Preview (Stub)"
        size="sm"
      >
        <div className="space-y-3 text-center">
          <div className="flex justify-center py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--cv-bg-muted)]">
              {previewFile && <FileTypeIconInline type={previewFile.type} size={28} />}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--cv-text)] break-all">
              {previewFile?.name}
            </p>
            <p className="text-xs text-[var(--cv-text-secondary)] mt-1">
              File type: {previewFile?.type} · Size: {previewFile && formatBytes(previewFile.size)}
            </p>
          </div>
          <p className="text-xs text-[var(--cv-text-muted)] pt-2 leading-relaxed">
            Detailed interactive previews will be available after installing the File Preview module.
          </p>
          <div className="flex justify-end pt-3">
            <Button variant="primary" size="sm" onClick={() => setPreviewFile(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
