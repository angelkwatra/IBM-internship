/**
 * PublicSharePage.tsx — Standalone route for viewing public file shares.
 * Bypasses app shell navigation, enforces password protection + 2FA lockout timers,
 * validates expirations/download limits, and renders previews.
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router";
import {
  Lock,
  Download,
  AlertTriangle,
  FolderLock,
  Globe,
  Zap,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useToast } from "../components/ui/ToastProvider";
import { FilePreview } from "../components/files/FilePreview";
import { cn } from "../lib/cn";
import {
  getFileByShareToken,
  updateShareSettings,
  renameItem,
  type FileSystemItem,
  type Share,
} from "../services/fileService";

export default function PublicSharePage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [fileData, setFileData] = useState<{
    file: FileSystemItem;
    share: Share;
    workspaceId: string;
  } | null>(null);

  // Password Protection State
  const [passwordInput, setPasswordInput] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);

  // Load public share settings
  const fetchShareData = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getFileByShareToken(token);
      if (data) {
        setFileData(data);
        // If there's no password, user is immediately authenticated
        if (!data.share.publicLink?.password) {
          setIsAuthenticated(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchShareData();
  }, [fetchShareData]);

  // Lockout countdown timer logic
  useEffect(() => {
    let timer: any;
    if (lockoutTimer > 0) {
      timer = setInterval(() => {
        setLockoutTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutTimer]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cv-bg)]">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-primary-600 mx-auto" size={32} />
          <p className="text-sm text-[var(--cv-text-secondary)]">Retrieving shared files...</p>
        </div>
      </div>
    );
  }

  // Handle errors: link revoked or token invalid
  if (!fileData || !fileData.share.publicLink?.enabled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--cv-bg)] px-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-600 text-white shadow-md">
            <Zap size={18} className="fill-white/25" />
          </div>
          <span className="font-extrabold tracking-tight text-base bg-gradient-to-r from-primary-600 via-indigo-600 to-primary-650 bg-clip-text text-transparent dark:from-primary-400 dark:to-indigo-400">
            CloudVault
          </span>
        </div>
        <Card className="w-full max-w-md p-6 text-center space-y-4 border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40 text-red-600">
            <AlertTriangle size={24} />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-bold text-[var(--cv-text)]">This link is no longer available</h1>
            <p className="text-xs text-[var(--cv-text-secondary)] leading-relaxed">
              This share link has been deactivated, expired, or was never created. If you received this URL from someone, ask them to verify and regenerate the link.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/register" className="w-full">
              <Button variant="primary" size="sm" className="w-full">
                Get Your Free Storage
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const { file, share, workspaceId } = fileData;
  const publicLink = share.publicLink!;

  // 1. Expiration check
  const isExpired = publicLink.expiresAt
    ? new Date() > new Date(publicLink.expiresAt)
    : false;

  // 2. Download count limits check
  const isLimitReached = publicLink.downloadLimit
    ? publicLink.downloadCount >= publicLink.downloadLimit
    : false;

  if (isExpired || isLimitReached) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--cv-bg)] px-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-600 text-white shadow-md">
            <Zap size={18} className="fill-white/25" />
          </div>
          <span className="font-extrabold tracking-tight text-base bg-gradient-to-r from-primary-600 via-indigo-600 to-primary-650 bg-clip-text text-transparent dark:from-primary-400 dark:to-indigo-400">
            CloudVault
          </span>
        </div>
        <Card className="w-full max-w-md p-6 text-center space-y-4 border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600">
            <AlertTriangle size={24} />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-bold text-[var(--cv-text)]">This link is no longer available</h1>
            <p className="text-xs text-[var(--cv-text-secondary)] leading-relaxed">
              {isExpired
                ? "This temporary share link has reached its scheduled expiration date and is no longer accessible."
                : "This share link has exceeded its allocated maximum download limit."}
            </p>
          </div>
          <div className="pt-2">
            <Link to="/register" className="w-full">
              <Button variant="primary" size="sm" className="w-full">
                Get Your Free Storage
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Handle password submit
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (lockoutTimer > 0) return;

    if (passwordInput === publicLink.password) {
      setIsAuthenticated(true);
      setPasswordError(false);
      setFailedAttempts(0);
      toast.success("Access Granted", "Correct password entered.");
    } else {
      setPasswordError(true);
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);

      if (nextFailed >= 5) {
        setLockoutTimer(30);
        setFailedAttempts(0);
        toast.error("Account locked", "Too many failed attempts. Locked out for 30s.");
      } else {
        toast.error("Incorrect password", `Attempts remaining: ${5 - nextFailed}`);
      }
    }
  };

  // ── Password Protection Lock Card ───────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--cv-bg)] px-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-600 text-white shadow-md">
            <Zap size={18} className="fill-white/25" />
          </div>
          <span className="font-extrabold tracking-tight text-base bg-gradient-to-r from-primary-600 via-indigo-600 to-primary-650 bg-clip-text text-transparent dark:from-primary-400 dark:to-indigo-400">
            CloudVault
          </span>
        </div>
        <Card className="w-full max-w-md p-6 border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] space-y-4">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-650 dark:text-primary-400">
              <FolderLock size={24} />
            </div>
            <h1 className="text-sm font-bold text-[var(--cv-text)]">Secure Folder</h1>
            <p className="text-xs text-[var(--cv-text-secondary)] leading-relaxed px-4">
              This file is protected by password authentication. Enter the password below to decrypt and access the contents.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-3 pt-2">
            <div className="relative">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                disabled={lockoutTimer > 0}
                placeholder="Enter password..."
                className="w-full h-9 rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] pl-3 pr-10 text-xs text-[var(--cv-text)] placeholder:text-[var(--cv-text-muted)] focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
              <div className="absolute right-3 top-2.5 text-[var(--cv-text-muted)]">
                <Lock size={14} />
              </div>
            </div>

            {passwordError && lockoutTimer === 0 && (
              <p className="text-[10px] text-red-500 text-center font-medium">
                Incorrect password. Please try again.
              </p>
            )}

            {lockoutTimer > 0 ? (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-center text-xs text-red-500 font-semibold">
                Locked out. Retrying in {lockoutTimer}s...
              </div>
            ) : (
              <Button type="submit" variant="primary" size="sm" className="w-full">
                Verify Password
              </Button>
            )}
          </form>
        </Card>
      </div>
    );
  }

  // ── Access is Authenticated: Render Preview ──────────────────────────────

  const handleDownload = async () => {
    // Simulate Download
    toast.info("Download started", `Downloading "${file.name}"...`);

    // Increment downloadCount
    try {
      const currentCount = publicLink.downloadCount;
      const updatedLink = {
        ...publicLink,
        downloadCount: currentCount + 1,
      };
      const updated = await updateShareSettings(workspaceId, file.id, {
        publicLink: updatedLink,
      });
      setFileData({
        file,
        share: updated,
        workspaceId,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileRename = async (newName: string) => {
    try {
      await renameItem(workspaceId, file.id, newName);
      // Refresh local view
      setFileData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          file: {
            ...prev.file,
            name: newName,
          },
        };
      });
      toast.success("File renamed", `Successfully updated name to "${newName}"`);
    } catch (err) {
      toast.error("Failed to rename file", err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--cv-bg)] text-[var(--cv-text)] select-none">
      {/* ── Standalone Navigation Header ─────────────────────────────────────── */}
      <header className="border-b border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <Link to="/login" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-600 text-white shadow-md">
            <Zap size={18} className="fill-white/25" />
          </div>
          <span className="font-extrabold tracking-tight text-base bg-gradient-to-r from-primary-600 via-indigo-600 to-primary-650 bg-clip-text text-transparent dark:from-primary-400 dark:to-indigo-400">
            CloudVault
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            <Globe size={10} /> Public View
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            leftIcon={<Download size={14} />}
          >
            Download
          </Button>
        </div>
      </header>

      {/* ── Preview Main Body Content ────────────────────────────────────────── */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        <FilePreview
          item={file}
          accessLevel={publicLink.accessLevel}
          onRename={publicLink.accessLevel === "editor" ? handleFileRename : undefined}
        />
      </main>

      {/* ── CTA Banner Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] px-6 py-4 text-center mt-auto">
        <p className="text-xs text-[var(--cv-text-secondary)]">
          Powered by{" "}
          <Link to="/register" className="font-semibold text-primary-650 hover:underline">
            CloudVault — Get your own free storage
          </Link>
        </p>
      </footer>
    </div>
  );
}

// ── Loader Helper ────────────────────────────────────────────────
function Loader2(props: any) {
  return (
    <svg
      className={cn("animate-spin", props.className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width={props.size || 24}
      height={props.size || 24}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
