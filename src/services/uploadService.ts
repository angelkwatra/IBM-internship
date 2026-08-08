/**
 * uploadService.ts — Mock upload simulation for CloudVault.
 *
 * Simulates realistic progress through status stages with
 * configurable concurrency and occasional failures.
 */

// ── Types ────────────────────────────────────────────────────────

export type UploadStatus =
  | "waiting"
  | "preparing"
  | "uploading"
  | "scanning"
  | "complete"
  | "failed"
  | "cancelled";

export interface UploadItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: UploadStatus;
  /** 0-100 */
  progress: number;
  transferredBytes: number;
  totalBytes: number;
  errorReason?: string;
  parentFolderId: string | null;
  workspaceId: string;
  /** For folder uploads: the folder name containing these files */
  batchFolder?: string;
  /** Batch ID for grouping folder uploads */
  batchId?: string;
  startedAt?: number;
  previewDataUrl?: string;
}

// ── Constants ────────────────────────────────────────────────────

export const MAX_CONCURRENT = 3;
export const BLOCKED_EXTENSIONS = [".exe", ".bat", ".sh"];
export const STORAGE_QUOTA_BYTES = 15 * 1024 * 1024 * 1024; // 15 GB

const FAILURE_REASONS = [
  "Network timeout — please check your connection",
  "Server error (503) — service temporarily unavailable",
  "Connection reset by remote host",
  "Upload interrupted — server did not respond",
  "Rate limit exceeded — too many requests",
];

// ── Helpers ──────────────────────────────────────────────────────

function uid(): string {
  return "upload_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

/** Check if a file extension is blocked. */
export function isBlockedType(fileName: string): boolean {
  const ext = getExtension(fileName);
  return BLOCKED_EXTENSIONS.includes(ext);
}

/** Infer a file type string from filename for the type icon. */
export function inferFileType(fileName: string): string {
  const ext = getExtension(fileName).replace(".", "");
  const map: Record<string, string> = {
    png: "image", jpg: "image", jpeg: "image", gif: "image", svg: "image", webp: "image",
    pdf: "pdf",
    doc: "document", docx: "document", txt: "document", md: "document", rtf: "document",
    xls: "spreadsheet", xlsx: "spreadsheet", csv: "spreadsheet",
    mp4: "video", mov: "video", avi: "video", mkv: "video", webm: "video",
    zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive",
  };
  return map[ext] ?? "other";
}

// ── Simulation Engine ────────────────────────────────────────────

export type ProgressCallback = (item: UploadItem) => void;

interface SimulationController {
  cancel: () => void;
}

/**
 * Simulate a single file upload through all status stages.
 * Calls `onProgress` at each meaningful state change.
 * Returns a controller that can cancel the simulation.
 */
export function simulateUpload(
  item: UploadItem,
  onProgress: ProgressCallback
): SimulationController {
  let cancelled = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    cancelled = true;
    if (timerId) clearTimeout(timerId);
  };

  const run = async () => {
    // ── Preparing stage (500-1000ms) ──
    item.status = "preparing";
    item.progress = 0;
    item.startedAt = Date.now();
    onProgress({ ...item });

    await wait(500 + Math.random() * 500);
    if (cancelled) { item.status = "cancelled"; onProgress({ ...item }); return; }

    // ── Uploading stage (2-8s with progress ticks) ──
    item.status = "uploading";
    onProgress({ ...item });

    const uploadDuration = 2000 + Math.random() * 6000;
    const tickInterval = 150;
    const totalTicks = Math.ceil(uploadDuration / tickInterval);
    const shouldFail = Math.random() < 0.1; // ~1 in 10 failure rate
    const failAtTick = shouldFail ? Math.floor(totalTicks * (0.3 + Math.random() * 0.5)) : -1;

    for (let tick = 0; tick <= totalTicks; tick++) {
      if (cancelled) { item.status = "cancelled"; onProgress({ ...item }); return; }

      if (tick === failAtTick) {
        item.status = "failed";
        item.errorReason = FAILURE_REASONS[Math.floor(Math.random() * FAILURE_REASONS.length)];
        onProgress({ ...item });
        return;
      }

      const rawProgress = Math.min(100, Math.round((tick / totalTicks) * 100));
      item.progress = rawProgress;
      item.transferredBytes = Math.round((rawProgress / 100) * item.totalBytes);
      onProgress({ ...item });

      if (tick < totalTicks) {
        await wait(tickInterval);
      }
    }

    if (cancelled) { item.status = "cancelled"; onProgress({ ...item }); return; }

    // ── Scanning stage (500-1500ms) ──
    item.status = "scanning";
    item.progress = 100;
    item.transferredBytes = item.totalBytes;
    onProgress({ ...item });

    await wait(500 + Math.random() * 1000);
    if (cancelled) { item.status = "cancelled"; onProgress({ ...item }); return; }

    // ── Complete ──
    item.status = "complete";
    onProgress({ ...item });
  };

  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      timerId = setTimeout(resolve, ms);
    });
  }

  // Start the simulation
  run();

  return { cancel };
}

/**
 * Create an UploadItem from a File object.
 */
export function createUploadItem(
  file: { name: string; size: number; previewDataUrl?: string },
  parentFolderId: string | null,
  workspaceId: string,
  batchFolder?: string,
  batchId?: string
): UploadItem {
  return {
    id: uid(),
    fileName: file.name,
    fileSize: file.size,
    fileType: inferFileType(file.name),
    status: "waiting",
    progress: 0,
    transferredBytes: 0,
    totalBytes: file.size,
    parentFolderId,
    workspaceId,
    batchFolder,
    batchId,
    previewDataUrl: file.previewDataUrl,
  };
}
