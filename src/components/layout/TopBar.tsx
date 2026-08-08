import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Search,
  Upload,
  FolderPlus,
  Bell,
  Menu,
  Moon,
  Sun,
  LogOut,
  Settings,
  Cloud,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useUpload } from "../../context/UploadContext";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { DropdownMenu } from "../ui/DropdownMenu";
import { CommandPalette } from "./CommandPalette";
import { NotificationPanel } from "./NotificationPanel";
import { mockStorage } from "../../lib/mockPersistence";

export function TopBar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { setMobileSidebarOpen, currentWorkspace } = useWorkspace();
  const { startUpload } = useUpload();
  const navigate = useNavigate();
  const { folderId } = useParams<{ folderId?: string }>();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const refreshNotifications = useCallback(() => {
    const list = mockStorage.getItem<any[]>("cv_notifications", [
      {
        id: "1",
        title: "New file shared",
        description: "Alex shared 'Q3 Report.pdf' with you",
        time: "2 min ago",
        iconType: "share",
        read: false,
      },
      {
        id: "2",
        title: "Comment added",
        description: "Sarah commented on 'Brand Guidelines'",
        time: "15 min ago",
        iconType: "message",
        read: false,
      },
      {
        id: "3",
        title: "Upload complete",
        description: "3 files uploaded to 'Design Assets'",
        time: "1 hr ago",
        iconType: "file",
        read: true,
      },
    ]);
    setNotifications(list);
  }, []);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  // ── File upload via button (alternative to drag-and-drop) ──
  const handleUploadFiles = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        const files = Array.from(input.files);
        startUpload(files, folderId ?? null, currentWorkspace.id);
      }
    };
    input.click();
  }, [startUpload, folderId, currentWorkspace.id]);

  const handleUploadFolder = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    // webkitdirectory for folder upload
    input.setAttribute("webkitdirectory", "");
    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        const files = Array.from(input.files);
        // Use the first file's relative path to extract folder name
        const firstPath = (input.files[0] as File & { webkitRelativePath?: string }).webkitRelativePath;
        const batchFolder = firstPath ? firstPath.split("/")[0] : undefined;
        startUpload(files, folderId ?? null, currentWorkspace.id, batchFolder);
      }
    };
    input.click();
  }, [startUpload, folderId, currentWorkspace.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const uploadMenuItems = [
    { label: "Upload Files", icon: Upload, onClick: handleUploadFiles },
    { label: "Upload Folder", icon: FolderPlus, onClick: handleUploadFolder },
    { label: "", isDivider: true as const },
    { label: "New Folder", icon: FolderPlus, onClick: () => navigate("/app/files") },
  ];

  const userMenuItems = [
    { label: "Settings", icon: Settings, onClick: () => navigate("/app/settings") },
    {
      label: theme === "dark" ? "Light mode" : "Dark mode",
      icon: theme === "dark" ? Sun : Moon,
      onClick: toggleTheme,
    },
    { label: "", isDivider: true as const },
    { label: "Log out", icon: LogOut, onClick: handleLogout },
  ];

  return (
    <>
      <header
        className={cn(
          "flex h-14 shrink-0 items-center gap-3 border-b border-[var(--cv-border)]",
          "bg-[var(--cv-bg-subtle)] px-4"
        )}
      >
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open navigation"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--cv-text-muted)] transition-colors hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)] md:hidden"
        >
          <Menu size={20} />
        </button>

        {/* Logo (mobile only) */}
        <div className="flex items-center gap-2 md:hidden">
          <Cloud size={18} className="text-primary-500" />
          <span className="text-sm font-semibold text-[var(--cv-text)]">
            CloudVault
          </span>
        </div>

        {/* ── Search bar (desktop) ──────────────────────────────── */}
        <button
          onClick={() => setPaletteOpen(true)}
          className={cn(
            "hidden h-9 flex-1 items-center gap-2 rounded-lg border border-[var(--cv-border)]",
            "bg-[var(--cv-bg-elevated)] px-3 text-sm text-[var(--cv-text-muted)]",
            "transition-colors hover:border-[var(--cv-border-strong)]",
            "max-w-md md:flex"
          )}
        >
          <Search size={15} className="shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded border border-[var(--cv-border)] bg-[var(--cv-bg-muted)] px-1.5 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </button>

        {/* ── Mobile search icon ──────────────────────────────── */}
        <button
          onClick={() => setPaletteOpen(true)}
          aria-label="Search"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--cv-text-muted)] transition-colors hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)] md:hidden"
        >
          <Search size={18} />
        </button>

        {/* Spacer */}
        <div className="flex-1 md:hidden" />

        {/* ── Right actions ────────────────────────────────────── */}
        <div className="flex items-center gap-1.5">
          {/* Upload */}
          <DropdownMenu
            trigger={
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Upload size={14} />}
                className="hidden sm:inline-flex"
              >
                Upload
              </Button>
            }
            items={uploadMenuItems}
            align="right"
          />
          <DropdownMenu
            trigger={
              <Button
                variant="primary"
                size="sm"
                iconOnly
                className="sm:hidden"
                aria-label="Upload"
              >
                <Upload size={16} />
              </Button>
            }
            items={uploadMenuItems}
            align="right"
          />

          {/* Notification bell */}
          <button
            onClick={() => setNotificationsOpen(true)}
            aria-label={`Notifications (${unreadCount} unread)`}
            className={cn(
              "relative inline-flex h-9 w-9 items-center justify-center rounded-lg",
              "text-[var(--cv-text-muted)] transition-colors",
              "hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)]"
            )}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* User avatar menu */}
          <DropdownMenu
            trigger={
              <Avatar
                name={user?.name ?? "User"}
                alt={user?.name ?? "User"}
                src={user?.avatarUrl}
                size="sm"
                className="cursor-pointer"
              />
            }
            items={userMenuItems}
            align="right"
          />
        </div>
      </header>

      {/* ── Overlays ───────────────────────────────────────────── */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
       <NotificationPanel
        isOpen={notificationsOpen}
        onClose={() => {
          setNotificationsOpen(false);
          refreshNotifications();
        }}
        notifications={notifications}
        onMarkAllRead={() => {
          const updated = notifications.map((n) => ({ ...n, read: true }));
          mockStorage.setItem("cv_notifications", updated);
          setNotifications(updated);
        }}
      />
    </>
  );
}

export default TopBar;
