/**
 * UploadContext.tsx — Cross-route upload state manager for CloudVault.
 *
 * Provided at the AppShell level so the UploadManager panel
 * persists across route navigation.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  type UploadItem,
  type UploadStatus,
  MAX_CONCURRENT,
  simulateUpload,
  createUploadItem,
  isBlockedType,
  STORAGE_QUOTA_BYTES,
} from "../services/uploadService";
import { getStorageUsed, addUploadedFile, getPreviewStorageSize } from "../services/fileService";
import { useToast } from "../components/ui/ToastProvider";
import { useWorkspace } from "./WorkspaceContext";
import {
  isAWSEnabled,
  uploadFileToS3,
  deleteFileFromS3,
  invokeSecurityScan,
} from "../services/awsService";

// Helper to read browser File as data URL
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ── Context types ────────────────────────────────────────────────

interface UploadContextValue {
  /** All upload items (active, waiting, completed, failed). */
  uploads: UploadItem[];
  /** Start uploading files. Returns { blocked, quotaExceeded, quotaOverageBytes, started }. */
  startUpload: (
    files: (File | { name: string; size: number })[],
    folderId: string | null,
    workspaceId: string,
    batchFolder?: string
  ) => Promise<StartUploadResult>;
  /** Cancel an active or waiting upload. */
  cancelUpload: (id: string) => void;
  /** Retry a failed upload. */
  retryUpload: (id: string) => void;
  /** Remove all completed uploads from the list. */
  clearCompleted: () => void;
  /** Dismiss the entire panel (only when no active uploads). */
  dismissPanel: () => void;
  /** Whether any upload is active. */
  hasActive: boolean;
  /** Whether the panel is visible. */
  isPanelVisible: boolean;
  /** Whether the panel is expanded. */
  isPanelExpanded: boolean;
  /** Toggle panel expansion. */
  togglePanel: () => void;
  /** Total progress across all active uploads (0-100). */
  totalProgress: number;
  /** Count of active (uploading/preparing/scanning) uploads. */
  activeCount: number;
  /** Count of all uploads including waiting. */
  totalCount: number;
}

export interface StartUploadResult {
  blocked: string[];
  quotaExceeded: boolean;
  quotaOverageBytes: number;
  started: number;
}

// ── Context ──────────────────────────────────────────────────────

const UploadContext = createContext<UploadContextValue | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────────

export function UploadProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const { refreshStorageUsed } = useWorkspace();
  const { toast } = useToast();

  // Track simulation controllers for cancellation
  const controllersRef = useRef<Map<string, { cancel: () => void }>>(new Map());
  // Cache raw File objects
  const fileObjectsRef = useRef<Map<string, File>>(new Map());

  const processQueueRef = useRef<() => void>(() => {});

  const runAWSS3Upload = useCallback(async (item: UploadItem, file: File) => {
    let cancelled = false;
    let uploadInstance: any = null;

    const controller = {
      cancel: () => {
        cancelled = true;
        if (uploadInstance) {
          try {
            uploadInstance.abort();
          } catch (e) {
            console.error("Failed to abort S3 upload:", e);
          }
        }
      }
    };
    controllersRef.current.set(item.id, controller);

    try {
      // 1. Start upload state
      setUploads((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, status: "uploading", progress: 0 } : u))
      );

      // 2. Perform S3 Upload
      const s3Key = await uploadFileToS3(item.id, file, (progress) => {
        if (cancelled) return;
        setUploads((prev) =>
          prev.map((u) =>
            u.id === item.id
              ? {
                  ...u,
                  progress,
                  transferredBytes: Math.round((progress / 100) * u.totalBytes),
                }
              : u
          )
        );
      });

      if (cancelled) {
        setUploads((prev) =>
          prev.map((u) => (u.id === item.id ? { ...u, status: "cancelled" } : u))
        );
        fileObjectsRef.current.delete(item.id);
        controllersRef.current.delete(item.id);
        setTimeout(() => processQueueRef.current(), 0);
        return;
      }

      // 3. Scanning state
      setUploads((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, status: "scanning", progress: 100 } : u))
      );

      let scanResult = "CLEAN";
      let scanReason = "";
      try {
        const scan = await invokeSecurityScan(item.fileName, item.fileSize);
        if (scan.scanResult === "INFECTED") {
          scanResult = "INFECTED";
          scanReason = `AWS Malware Scanner blocked: ${scan.threatsFound?.join(", ") || "Malicious file structure"}`;
        }
      } catch (err) {
        console.warn("Lambda security scan skipped/failed:", err);
      }

      if (cancelled) return;

      if (scanResult === "INFECTED") {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === item.id ? { ...u, status: "failed", errorReason: scanReason } : u
          )
        );
        try {
          await deleteFileFromS3(item.id, item.fileName);
        } catch (e) {
          console.error("Failed to delete infected S3 file:", e);
        }
      } else {
        // Success: write file metadata
        await addUploadedFile(
          item.workspaceId,
          item.parentFolderId,
          item.fileName,
          item.fileSize,
          item.previewDataUrl,
          s3Key
        );

        setUploads((prev) =>
          prev.map((u) => (u.id === item.id ? { ...u, status: "complete" } : u))
        );
        await refreshStorageUsed();
      }
    } catch (err: any) {
      console.error("AWS Upload process failed:", err);
      if (!cancelled) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === item.id
              ? {
                  ...u,
                  status: "failed",
                  errorReason: err.message || "S3 Upload failed. Please check AWS configuration.",
                }
              : u
          )
        );
      }
    } finally {
      fileObjectsRef.current.delete(item.id);
      controllersRef.current.delete(item.id);
      setTimeout(() => processQueueRef.current(), 0);
    }
  }, [refreshStorageUsed]);

  // ── Process queue: start waiting uploads when a slot opens ──
  const processQueue = useCallback(() => {
    setUploads((prev) => {
      const activeStatuses: UploadStatus[] = ["preparing", "uploading", "scanning"];
      const activeCount = prev.filter((u) => activeStatuses.includes(u.status)).length;
      const slotsAvailable = MAX_CONCURRENT - activeCount;

      if (slotsAvailable <= 0) return prev;

      const waiting = prev.filter((u) => u.status === "waiting");
      const toStart = waiting.slice(0, slotsAvailable);

      if (toStart.length === 0) return prev;

      // Start uploading files
      setTimeout(() => {
        for (const item of toStart) {
          if (isAWSEnabled()) {
            const rawFile = fileObjectsRef.current.get(item.id);
            if (rawFile) {
              runAWSS3Upload(item, rawFile);
              continue;
            }
          }

          // Fallback to mock simulation
          const controller = simulateUpload({ ...item }, (updated) => {
            setUploads((prevUploads) =>
              prevUploads.map((u) => (u.id === updated.id ? { ...updated } : u))
            );

            if (
              updated.status === "complete" ||
              updated.status === "failed" ||
              updated.status === "cancelled"
            ) {
              controllersRef.current.delete(updated.id);

              if (updated.status === "complete") {
                addUploadedFile(
                  updated.workspaceId,
                  updated.parentFolderId,
                  updated.fileName,
                  updated.fileSize,
                  updated.previewDataUrl
                ).then(() => {
                  refreshStorageUsed();
                }).catch(() => {});
              }
              setTimeout(() => processQueueRef.current(), 0);
            }
          });
          controllersRef.current.set(item.id, controller);
        }
      }, 0);

      // Mark them as preparing
      return prev.map((u) =>
        toStart.some((t) => t.id === u.id) ? { ...u, status: "preparing" as const } : u
      );
    });
  }, [refreshStorageUsed, runAWSS3Upload]);

  // Keep ref updated
  processQueueRef.current = processQueue;

  // ── Start uploads ──
  const startUpload = useCallback(
    async (
      files: (File | { name: string; size: number })[],
      folderId: string | null,
      workspaceId: string,
      batchFolder?: string
    ): Promise<StartUploadResult> => {
      // 1. Check for blocked types
      const blocked: string[] = [];
      const allowed: (File | { name: string; size: number })[] = [];
      for (const f of files) {
        if (isBlockedType(f.name)) {
          blocked.push(f.name);
        } else {
          allowed.push(f);
        }
      }

      if (allowed.length === 0) {
        return { blocked, quotaExceeded: false, quotaOverageBytes: 0, started: 0 };
      }

      // 2. Quota check
      const currentUsage = await getStorageUsed(workspaceId);
      const totalNewSize = allowed.reduce((s, f) => s + f.size, 0);
      if (currentUsage + totalNewSize > STORAGE_QUOTA_BYTES) {
        const overage = currentUsage + totalNewSize - STORAGE_QUOTA_BYTES;
        return { blocked, quotaExceeded: true, quotaOverageBytes: overage, started: 0 };
      }

      // 3. Process and read images under 3MB
      let currentPreviewUsage = getPreviewStorageSize();
      const previewBudgetLimit = 4 * 1024 * 1024; // 4MB characters

      const processedFiles = await Promise.all(
        allowed.map(async (f) => {
          let previewDataUrl: string | undefined = undefined;
          
          const isImg = (f instanceof File && f.type.startsWith("image/")) ||
                        (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name));
          
          if (isImg) {
            if (f.size > 3 * 1024 * 1024) {
              toast.warning(
                "Live Preview Unavailable",
                `"${f.name}" is over 3MB. Live preview won't be available until real cloud storage is connected.`
              );
            } else if (f instanceof File) {
              try {
                const dataUrl = await readFileAsDataURL(f);
                if (currentPreviewUsage + dataUrl.length > previewBudgetLimit) {
                  toast.warning(
                    "Preview Budget Reached",
                    `Storage preview budget reached. Live preview won't be available for "${f.name}".`
                  );
                } else {
                  previewDataUrl = dataUrl;
                  currentPreviewUsage += dataUrl.length;
                }
              } catch (err) {
                console.error("Failed to read file as data URL:", err);
              }
            }
          }
          
          return {
            name: f.name,
            size: f.size,
            previewDataUrl,
          };
        })
      );

      // 4. Create upload items
      const batchId = batchFolder
        ? "batch_" + Math.random().toString(36).slice(2, 8)
        : undefined;

      const newItems = processedFiles.map((f, idx) => {
        const item = createUploadItem(f, folderId, workspaceId, batchFolder, batchId);
        const rawFile = allowed[idx];
        if (rawFile instanceof File) {
          fileObjectsRef.current.set(item.id, rawFile);
        }
        return item;
      });

      setUploads((prev) => [...prev, ...newItems]);
      setIsPanelVisible(true);
      setIsPanelExpanded(true);

      // Kick off the queue
      setTimeout(() => processQueue(), 50);

      return { blocked, quotaExceeded: false, quotaOverageBytes: 0, started: newItems.length };
    },
    [processQueue, toast]
  );

  // ── Cancel upload ──
  const cancelUpload = useCallback((id: string) => {
    const controller = controllersRef.current.get(id);
    if (controller) {
      controller.cancel();
      controllersRef.current.delete(id);
    }
    setUploads((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: "cancelled" as const } : u))
    );
    setTimeout(() => processQueue(), 0);
  }, [processQueue]);

  // ── Retry upload ──
  const retryUpload = useCallback(
    (id: string) => {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                status: "waiting" as const,
                progress: 0,
                transferredBytes: 0,
                errorReason: undefined,
              }
            : u
        )
      );
      setTimeout(() => processQueue(), 50);
    },
    [processQueue]
  );

  // ── Clear completed ──
  const clearCompleted = useCallback(() => {
    setUploads((prev) =>
      prev.filter((u) => u.status !== "complete" && u.status !== "cancelled")
    );
  }, []);

  // ── Dismiss panel ──
  const dismissPanel = useCallback(() => {
    const activeStatuses: UploadStatus[] = ["preparing", "uploading", "scanning", "waiting"];
    setUploads((prev) => {
      const hasActive = prev.some((u) => activeStatuses.includes(u.status));
      if (hasActive) return prev; // Can't dismiss while active
      return [];
    });
    setIsPanelVisible(false);
    setIsPanelExpanded(false);
  }, []);

  // ── Toggle panel ──
  const togglePanel = useCallback(() => {
    setIsPanelExpanded((prev) => !prev);
  }, []);

  // ── Derived values ──
  const activeStatuses: UploadStatus[] = ["preparing", "uploading", "scanning"];
  const activeUploads = uploads.filter((u) => activeStatuses.includes(u.status));
  const allInProgress = uploads.filter((u) =>
    [...activeStatuses, "waiting" as const].includes(u.status)
  );
  const hasActive = allInProgress.length > 0;

  const totalProgress =
    activeUploads.length > 0
      ? Math.round(
          activeUploads.reduce((s, u) => s + u.progress, 0) / activeUploads.length
        )
      : uploads.length > 0 && uploads.every((u) => u.status === "complete")
        ? 100
        : 0;

  return (
    <UploadContext.Provider
      value={{
        uploads,
        startUpload,
        cancelUpload,
        retryUpload,
        clearCompleted,
        dismissPanel,
        hasActive,
        isPanelVisible,
        isPanelExpanded,
        togglePanel,
        totalProgress,
        activeCount: activeUploads.length,
        totalCount: uploads.length,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────

export function useUpload(): UploadContextValue {
  const ctx = useContext(UploadContext);
  if (!ctx) {
    throw new Error("useUpload must be used within an <UploadProvider>");
  }
  return ctx;
}
