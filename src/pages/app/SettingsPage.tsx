import { useState, useEffect, useRef, useCallback } from "react";
import {
  User,
  Lock,
  Sliders,
  Bell,
  CreditCard,
  Check,
  Upload,
  RefreshCw,
  QrCode,
  Download,
  Smartphone,
  Cloud,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useToast } from "../../components/ui/ToastProvider";
import PageHeader from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { Avatar } from "../../components/ui/Avatar";
import PasswordInput from "../../components/auth/PasswordInput";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { formatBytes, resetPersistence } from "../../services/fileService";
import AWSSettings from "../../components/settings/AWSSettings";

type TabId = "profile" | "security" | "preferences" | "notifications" | "plan" | "aws";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile Settings", icon: User },
  { id: "security", label: "Security & 2FA", icon: Lock },
  { id: "preferences", label: "System Preferences", icon: Sliders },
  { id: "notifications", label: "Notification Channels", icon: Bell },
  { id: "plan", label: "Billing & Plans", icon: CreditCard },
  { id: "aws", label: "AWS Integration", icon: Cloud },
];

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { storageUsed } = useWorkspace();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabId>("profile");

  // Stub Modals
  const [comingSoonModalOpen, setComingSoonModalOpen] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState("");

  // ── Profile Tab State ──────────────────────────────────────────
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileBio, setProfileBio] = useState(user?.bio || "");
  const [isNameSaving, setIsNameSaving] = useState(false);
  const [showNameSaved, setShowNameSaved] = useState(false);
  const [isBioSaving, setIsBioSaving] = useState(false);
  const [showBioSaved, setShowBioSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
      setProfileBio(user.bio || "");
    }
  }, [user?.name, user?.bio]);

  // Profile Avatar Crop state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropScale, setCropScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // ── Security Tab State ─────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  // 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [tfACode, setTfACode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Active sessions mock list
  const [sessions, setSessions] = useState([
    { id: "sess_1", device: "MacBook Pro", browser: "Chrome", location: "San Francisco, US", current: true },
    { id: "sess_2", device: "iPhone 15 Pro", browser: "Safari Mobile", location: "San Francisco, US", current: false },
    { id: "sess_3", device: "Windows Desktop", browser: "Edge", location: "New York, US", current: false },
  ]);

  // ── Preferences Tab State ──────────────────────────────────────
  const [viewPref, setViewPref] = useState(() => localStorage.getItem("cv_default_view") || "grid");
  const [themePref, setThemePref] = useState(() => {
    // Determine preference based on theme value or default
    return theme;
  });

  // ── Notifications Tab State ────────────────────────────────────
  const [notifEmails, setNotifEmails] = useState({
    securityAlerts: true,
    weeklyDigest: false,
    newSharedFiles: true,
    marketing: false,
  });
  const [notifPush, setNotifPush] = useState({
    uploads: true,
    shares: true,
    storageWarning: true,
  });

  const handleOpenComingSoon = (title: string) => {
    setComingSoonTitle(title);
    setComingSoonModalOpen(true);
  };

  // ── PROFILE TAB ACTIONS ────────────────────────────────────────

  // Name Inline saving on blur
  const handleNameBlur = async () => {
    if (!profileName.trim() || profileName === user?.name) return;

    setIsNameSaving(true);
    try {
      // Simulate API saving latency
      await new Promise((r) => setTimeout(r, 600));
      setUser((prev) => (prev ? { ...prev, name: profileName.trim() } : null));
      setShowNameSaved(true);
      setTimeout(() => setShowNameSaved(false), 2000);
    } catch {
      toast.error("Failed to update name");
    } finally {
      setIsNameSaving(false);
    }
  };

  // Bio Inline saving on blur
  const handleBioBlur = async () => {
    if (profileBio === user?.bio) return;

    setIsBioSaving(true);
    try {
      // Simulate API saving latency
      await new Promise((r) => setTimeout(r, 600));
      setUser((prev) => (prev ? { ...prev, bio: profileBio } : null));
      setShowBioSaved(true);
      setTimeout(() => setShowBioSaved(false), 2000);
    } catch {
      toast.error("Failed to update bio");
    } finally {
      setIsBioSaving(false);
    }
  };

  // Reset all persistent demo state
  const handleResetDemoData = () => {
    resetPersistence("ws_personal");
    toast.success("Demo Data Reset", "Local storage cleared. Reloading...");
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // Image load & canvas setup
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result as string);
        setCropOffset({ x: 0, y: 0 });
        setCropScale(1);
        setCropModalOpen(true);
      });
      reader.readAsDataURL(file);
    }
  };

  // Drag & drop support
  const handleAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          setImageSrc(reader.result as string);
          setCropOffset({ x: 0, y: 0 });
          setCropScale(1);
          setCropModalOpen(true);
        });
        reader.readAsDataURL(file);
      }
    }
  };

  // Render crop canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Translate to center of canvas and apply translation offset + scaling
    ctx.translate(canvas.width / 2 + cropOffset.x, canvas.height / 2 + cropOffset.y);
    ctx.scale(cropScale, cropScale);

    // Calculate dimensions to fit image proportionally
    const aspect = img.width / img.height;
    let drawWidth = 200;
    let drawHeight = 200 / aspect;
    if (aspect < 1) {
      drawHeight = 200;
      drawWidth = 200 * aspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    // Draw circular crop overlay border
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 75, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw dark semi-transparent boundaries outside circle
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    // Draw negative circular path
    ctx.arc(canvas.width / 2, canvas.height / 2, 75, 0, 2 * Math.PI, true);
    ctx.fill();
  }, [cropOffset, cropScale]);

  useEffect(() => {
    if (cropModalOpen && imageSrc) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        drawCanvas();
      };
      img.src = imageSrc;
    }
  }, [cropModalOpen, imageSrc, drawCanvas]);

  // Crop drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCropOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoomChange = (val: number) => {
    setCropScale(val);
  };

  const handleCropConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create offscreen canvas for exporting cropped circular area
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 150;
    exportCanvas.height = 150;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return;

    // Draw selection area from crop canvas centered inside guide
    exportCtx.beginPath();
    exportCtx.arc(75, 75, 75, 0, 2 * Math.PI);
    exportCtx.clip();

    // Render image section to export canvas
    const img = imageRef.current;
    if (img) {
      exportCtx.save();
      exportCtx.translate(75 + cropOffset.x, 75 + cropOffset.y);
      exportCtx.scale(cropScale, cropScale);

      const aspect = img.width / img.height;
      let drawWidth = 200;
      let drawHeight = 200 / aspect;
      if (aspect < 1) {
        drawHeight = 200;
        drawWidth = 200 * aspect;
      }

      exportCtx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      exportCtx.restore();
    }

    // Export data URL and save to AuthContext
    // Export data URL and save to AuthContext
    // NOTE: Avatar photo is stored client-side only (as a data URL inside the AuthContext state) for mock purposes. Production requires uploading to an S3-compatible service.
    const croppedUrl = exportCanvas.toDataURL("image/png");
    setUser((prev) => (prev ? { ...prev, avatarUrl: croppedUrl } : null));

    setCropModalOpen(false);
    setImageSrc(null);
    toast.success("Profile photo updated", "Your new avatar has been applied.");
  };

  const handleRemovePhoto = () => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev };
      delete next.avatarUrl;
      return next;
    });
    toast.success("Photo removed", "Reverted to initials avatar.");
  };

  // ── SECURITY TAB ACTIONS ───────────────────────────────────────

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Error", "Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Error", "Confirm password does not match.");
      return;
    }

    setIsPasswordSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      toast.success("Password updated", "Your password has been changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Failed to update password");
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const handleToggle2FA = () => {
    if (is2FAEnabled) {
      setIs2FAEnabled(false);
      setBackupCodes([]);
      toast.success("2FA Disabled", "Two-factor authentication has been turned off.");
    } else {
      setShow2FASetup(true);
      // Generate mock backup codes
      const codes = Array.from({ length: 8 }).map(() =>
        Math.floor(100000 + Math.random() * 900000).toString()
      );
      setBackupCodes(codes);
    }
  };

  const handleVerify2FA = () => {
    if (tfACode.length < 6) return;
    setIs2FAEnabled(true);
    setShow2FASetup(false);
    setTfACode("");
    toast.success("2FA Enabled", "Two-factor authentication is now active.");
  };

  const downloadBackupCodes = () => {
    const content = `CLOUDVAULT 2FA BACKUP CODES\n============================\nKeep these codes secure. Each code can be used once.\n\n${backupCodes.join("\n")}\n\nGenerated on: ${new Date().toLocaleDateString()}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cloudvault_backup_codes.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded", "Backup codes saved client-side.");
  };

  // ── PREFERENCES TAB ACTIONS ────────────────────────────────────

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setThemePref(newTheme === "system" ? "light" : newTheme);
    if (newTheme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(isDark ? "dark" : "light");
    } else {
      setTheme(newTheme);
    }
    toast.success("Theme updated");
  };

  const handleViewChange = (mode: "grid" | "list") => {
    setViewPref(mode);
    localStorage.setItem("cv_default_view", mode);
    toast.success("View mode preference saved");
  };

  return (
    <>
      <PageHeader title="Settings" breadcrumb={<span>Home / Settings</span>} />

      <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-200">
        {/* Sidebar tabs */}
        <div className="w-full lg:w-64 shrink-0 flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-1 pb-2 lg:pb-0 border-b lg:border-b-0 lg:border-r border-[var(--cv-border)]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors shrink-0 outline-none",
                  isActive
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-950/20 dark:text-primary-400"
                    : "text-[var(--cv-text-secondary)] hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)]"
                )}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Tab Pane content */}
        <div className="flex-1 min-w-0">
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <>
              <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-[var(--cv-text)]">Profile Settings</h3>
                <p className="text-xs text-[var(--cv-text-secondary)] mt-1">
                  Customize how your profile looks and works.
                </p>
              </div>

              {/* Avatar upload / edit layout */}
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleAvatarDrop}
                  className="group relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  title="Drag & drop image file or click to change"
                >
                  <Avatar name={profileName} size="lg" alt={profileName} src={user?.avatarUrl} />
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-semibold transition-opacity">
                    <Upload size={14} className="mb-0.5" />
                    <span>Upload Image</span>
                  </div>
                </div>

                <div className="flex flex-col items-center sm:items-start gap-2 text-center sm:text-left">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                      Change Photo
                    </Button>
                    {user?.avatarUrl && (
                      <Button variant="destructive" size="sm" onClick={handleRemovePhoto}>
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--cv-text-muted)] leading-relaxed">
                    Supports JPG, PNG or GIF. Max 5MB. Drag & drop works too.
                  </p>
                </div>
              </div>

              {/* Name inline editable */}
              <div className="space-y-1.5 max-w-md">
                <label htmlFor="name-setting" className="block text-xs font-semibold text-[var(--cv-text-secondary)]">
                  Display Name
                </label>
                <div className="relative flex items-center">
                  <input
                    id="name-setting"
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    onBlur={handleNameBlur}
                    placeholder="e.g. Jane Doe"
                    className="flex h-9 w-full rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {isNameSaving && (
                    <RefreshCw size={14} className="absolute right-3 animate-spin text-[var(--cv-text-muted)]" />
                  )}
                  {showNameSaved && (
                    <Check size={14} className="absolute right-3 text-green-500" />
                  )}
                </div>
              </div>

              {/* Email Read-only display */}
              <div className="space-y-1.5 max-w-md">
                <label htmlFor="email-setting" className="block text-xs font-semibold text-[var(--cv-text-secondary)]">
                  Registered Email
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="email-setting"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="flex-1 h-9 rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-muted)] px-3 text-sm text-[var(--cv-text-muted)]"
                  />
                  <Button variant="ghost" size="sm" onClick={() => handleOpenComingSoon("Change Email")}>
                    Change
                  </Button>
                </div>
              </div>

              {/* Bio Field */}
              <div className="space-y-1.5 max-w-md">
                <div className="flex justify-between items-center">
                  <label htmlFor="bio-setting" className="block text-xs font-semibold text-[var(--cv-text-secondary)]">
                    Short Bio
                  </label>
                  {isBioSaving && (
                    <RefreshCw size={12} className="animate-spin text-[var(--cv-text-muted)]" />
                  )}
                  {showBioSaved && (
                    <Check size={12} className="text-green-500" />
                  )}
                </div>
                <textarea
                  id="bio-setting"
                  rows={3}
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  onBlur={handleBioBlur}
                  placeholder="Tell us about yourself..."
                  className="flex w-full rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>
            </Card>

            <Card className="p-6 border border-red-500/20 bg-red-500/5 space-y-4">
              <div>
                <h3 className="text-base font-bold text-red-600 dark:text-red-400">Developer Actions</h3>
                <p className="text-xs text-[var(--cv-text-secondary)] mt-1">
                  Reset mock data and start from a fresh slate. All local storage file trees, user states, and settings will be restored to default seeds.
                </p>
              </div>
              <div>
                <Button variant="destructive" size="sm" onClick={handleResetDemoData}>
                  Reset Demo Data
                </Button>
              </div>
            </Card>
          </>
        )}

          {/* SECURITY TAB */}
          {activeTab === "security" && (
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-[var(--cv-text)]">Security Settings</h3>
                <p className="text-xs text-[var(--cv-text-secondary)] mt-1">
                  Manage your account password, active sessions, and 2FA settings.
                </p>
              </div>

              {/* Change Password Form */}
              <form onSubmit={handleSavePassword} className="space-y-4 max-w-md">
                <h4 className="text-xs font-bold text-[var(--cv-text)] border-b border-[var(--cv-border)] pb-2 uppercase tracking-wide">
                  Change Password
                </h4>
                <PasswordInput
                  label="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
                <PasswordInput
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  showStrength
                  showRequirements
                />
                <PasswordInput
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
                <Button variant="primary" size="sm" type="submit" disabled={isPasswordSaving}>
                  {isPasswordSaving ? "Updating Password…" : "Update Password"}
                </Button>
              </form>

              {/* 2FA Toggle Widget */}
              <div className="space-y-4 pt-4 border-t border-[var(--cv-border)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--cv-text)]">Two-Factor Authentication (2FA)</h4>
                    <p className="text-xs text-[var(--cv-text-secondary)] mt-0.5">
                      Verify your identity using a smartphone authenticator app.
                    </p>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={handleToggle2FA}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none",
                        is2FAEnabled ? "bg-primary-600 dark:bg-primary-500" : "bg-[var(--cv-bg-muted)]"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          is2FAEnabled ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>

                {is2FAEnabled && (
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl flex items-center gap-2">
                    <Check size={16} className="text-emerald-500 shrink-0" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      Two-factor authentication is active.
                    </span>
                  </div>
                )}
              </div>

              {/* Active Sessions list */}
              <div className="space-y-4 pt-4 border-t border-[var(--cv-border)]">
                <h4 className="text-xs font-bold text-[var(--cv-text)] uppercase tracking-wide">
                  Active Sessions
                </h4>
                <div className="space-y-2">
                  {sessions.map((sess) => (
                    <div key={sess.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] text-xs">
                      <div className="flex items-center gap-3">
                        <Smartphone size={16} className="text-[var(--cv-text-muted)]" />
                        <div>
                          <p className="font-semibold text-[var(--cv-text)]">
                            {sess.device} · {sess.browser}
                          </p>
                          <p className="text-[10px] text-[var(--cv-text-secondary)] mt-0.5">
                            {sess.location} {sess.current && "· Current Session"}
                          </p>
                        </div>
                      </div>
                      {!sess.current && (
                        <button
                          onClick={() => setSessions(sessions.filter((s) => s.id !== sess.id))}
                          className="text-red-500 hover:underline font-semibold"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {sessions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-500 hover:bg-red-500/5 border border-red-500/10"
                    onClick={() => {
                      setSessions(sessions.filter((s) => s.current));
                      toast.success("Other sessions revoked");
                    }}
                  >
                    Log out of other sessions
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* PREFERENCES TAB */}
          {activeTab === "preferences" && (
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-[var(--cv-text)]">System Preferences</h3>
                <p className="text-xs text-[var(--cv-text-secondary)] mt-1">
                  Adjust default view modes, layout themes, and display settings.
                </p>
              </div>

              {/* Theme Settings */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[var(--cv-text)] uppercase tracking-wide border-b border-[var(--cv-border)] pb-1.5">
                  App Theme
                </h4>
                <div className="grid grid-cols-3 gap-3 max-w-md">
                  {(["light", "dark", "system"] as const).map((t) => {
                    const isSelected = (t === "system" && themePref !== "light" && themePref !== "dark") || (t !== "system" && themePref === t);
                    return (
                      <button
                        key={t}
                        onClick={() => handleThemeChange(t)}
                        className={cn(
                          "p-3 rounded-lg border text-xs font-semibold capitalize transition-all outline-none",
                          isSelected
                            ? "border-primary-500 bg-primary-500/5 text-primary-500"
                            : "border-[var(--cv-border)] hover:border-[var(--cv-border-strong)] bg-[var(--cv-bg-subtle)] text-[var(--cv-text-secondary)]"
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* View preferences setting */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-[var(--cv-text)] uppercase tracking-wide border-b border-[var(--cv-border)] pb-1.5">
                  Default Folder View
                </h4>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  {(["grid", "list"] as const).map((mode) => {
                    const isSelected = viewPref === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => handleViewChange(mode)}
                        className={cn(
                          "p-3 rounded-lg border text-xs font-semibold capitalize transition-all outline-none",
                          isSelected
                            ? "border-primary-500 bg-primary-500/5 text-primary-500"
                            : "border-[var(--cv-border)] hover:border-[var(--cv-border-strong)] bg-[var(--cv-bg-subtle)] text-[var(--cv-text-secondary)]"
                        )}
                      >
                        {mode} Mode
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-[var(--cv-text)]">Notification Preferences</h3>
                <p className="text-xs text-[var(--cv-text-secondary)] mt-1">
                  Control how you receive updates and notifications.
                </p>
              </div>

              {/* Email alerts checklist */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[var(--cv-text)] uppercase tracking-wide border-b border-[var(--cv-border)] pb-2">
                  Email Notifications
                </h4>
                <div className="space-y-3">
                  {Object.entries(notifEmails).map(([key, enabled]) => (
                    <div key={key} className="flex items-center justify-between text-xs max-w-md">
                      <div>
                        <p className="font-semibold text-[var(--cv-text)] capitalize">
                          {key.replace(/([A-Z])/g, " $1")}
                        </p>
                        <p className="text-[10px] text-[var(--cv-text-secondary)] mt-0.5">
                          Receive security alerts and weekly file updates.
                        </p>
                      </div>
                      <button
                        onClick={() => setNotifEmails({ ...notifEmails, [key]: !enabled })}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none",
                          enabled ? "bg-primary-600 dark:bg-primary-500" : "bg-[var(--cv-bg-muted)]"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                            enabled ? "translate-x-4" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Push notifications checklist */}
              <div className="space-y-4 pt-4 border-t border-[var(--cv-border)]">
                <h4 className="text-xs font-bold text-[var(--cv-text)] uppercase tracking-wide border-b border-[var(--cv-border)] pb-2">
                  In-App Push Alerts
                </h4>
                <div className="space-y-3">
                  {Object.entries(notifPush).map(([key, enabled]) => (
                    <div key={key} className="flex items-center justify-between text-xs max-w-md">
                      <div>
                        <p className="font-semibold text-[var(--cv-text)] capitalize">
                          {key.replace(/([A-Z])/g, " $1")} Alerts
                        </p>
                        <p className="text-[10px] text-[var(--cv-text-secondary)] mt-0.5">
                          Instant alerts in browser task center.
                        </p>
                      </div>
                      <button
                        onClick={() => setNotifPush({ ...notifPush, [key]: !enabled })}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none",
                          enabled ? "bg-primary-600 dark:bg-primary-500" : "bg-[var(--cv-bg-muted)]"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                            enabled ? "translate-x-4" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* PLAN & BILLING TAB */}
          {activeTab === "plan" && (
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-[var(--cv-text)]">Billing & Plans</h3>
                <p className="text-xs text-[var(--cv-text-secondary)] mt-1">
                  Manage your subscription package and billing history.
                </p>
              </div>

              {/* Usage overview card */}
              <div className="p-4 rounded-xl border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[var(--cv-text)]">Free Tier Account</span>
                  <span className="font-bold text-primary-500">{((storageUsed / (15 * 1024 * 1024 * 1024)) * 100).toFixed(0)}% used</span>
                </div>
                <ProgressBar value={Math.min(100, (storageUsed / (15 * 1024 * 1024 * 1024)) * 100)} size="sm" />
                <p className="text-[10px] text-[var(--cv-text-muted)]">
                  Using {formatBytes(storageUsed)} of 15 GB total storage limit.
                </p>
              </div>

              {/* Plan cards */}
              <div className="grid gap-4 md:grid-cols-3 pt-2">
                {/* Free Plan */}
                <Card className="p-4 flex flex-col justify-between border-2 border-primary-500/20 bg-primary-500/5">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[var(--cv-text)]">Starter Free</p>
                    <p className="text-xl font-extrabold text-[var(--cv-text)]">$0 <span className="text-xs font-normal text-[var(--cv-text-muted)]">/ mo</span></p>
                    <ul className="text-[10px] text-[var(--cv-text-secondary)] space-y-1 pt-2">
                      <li>✓ 15 GB secure storage</li>
                      <li>✓ Basic file search</li>
                      <li>✓ Static folder share links</li>
                    </ul>
                  </div>
                  <Button variant="secondary" size="sm" className="mt-4 w-full" disabled>
                    Current Plan
                  </Button>
                </Card>

                {/* Pro Plan */}
                <Card className="p-4 flex flex-col justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[var(--cv-text)] text-primary-500">Professional Pro</p>
                    <p className="text-xl font-extrabold text-[var(--cv-text)]">$9.99 <span className="text-xs font-normal text-[var(--cv-text-muted)]">/ mo</span></p>
                    <ul className="text-[10px] text-[var(--cv-text-secondary)] space-y-1 pt-2">
                      <li>✓ 1 TB secure storage</li>
                      <li>✓ Priority upload speeds</li>
                      <li>✓ Password-protected links</li>
                    </ul>
                  </div>
                  <Button variant="primary" size="sm" className="mt-4 w-full" onClick={() => handleOpenComingSoon("Upgrade to Pro")}>
                    Upgrade
                  </Button>
                </Card>

                {/* Team Plan */}
                <Card className="p-4 flex flex-col justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[var(--cv-text)]">Collaborator Team</p>
                    <p className="text-xl font-extrabold text-[var(--cv-text)]">$19.99 <span className="text-xs font-normal text-[var(--cv-text-muted)]">/ mo</span></p>
                    <ul className="text-[10px] text-[var(--cv-text-secondary)] space-y-1 pt-2">
                      <li>✓ 5 TB shared team quota</li>
                      <li>✓ Admin workspace logs</li>
                      <li>✓ Multi-user permissions</li>
                    </ul>
                  </div>
                  <Button variant="primary" size="sm" className="mt-4 w-full" onClick={() => handleOpenComingSoon("Upgrade to Team")}>
                    Upgrade
                  </Button>
                </Card>
              </div>
            </Card>
          )}

          {activeTab === "aws" && (
            <AWSSettings />
          )}
        </div>
      </div>

      {/* Circular Crop Tool Modal */}
      <Modal
        isOpen={cropModalOpen}
        onClose={() => {
          setCropModalOpen(false);
          setImageSrc(null);
        }}
        title="Crop Profile Picture"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex justify-center bg-[var(--cv-bg-muted)] rounded-lg p-2 overflow-hidden select-none">
            <canvas
              ref={canvasRef}
              width={250}
              height={250}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="cursor-move rounded bg-[var(--cv-bg-elevated)] border border-[var(--cv-border)]"
            />
          </div>

          {/* Scale Slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs text-[var(--cv-text-secondary)]">
              <span>Zoom</span>
              <span>{(cropScale * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={3.0}
              step={0.05}
              value={cropScale}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-[var(--cv-bg-muted)] rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
          </div>

          <p className="text-[10px] text-[var(--cv-text-muted)] text-center leading-relaxed">
            Drag photo to adjust center. Use slider or scroll to adjust size.
          </p>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCropModalOpen(false);
                setImageSrc(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCropConfirm}>
              Apply Crop
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2FA Setup Modal */}
      <Modal
        isOpen={show2FASetup}
        onClose={() => setShow2FASetup(false)}
        title="Setup Authenticator App (2FA)"
        size="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[var(--cv-text)]">
            Scan this QR code with Google Authenticator or Microsoft Authenticator, then type the code below.
          </p>
          
          <div className="flex justify-center py-2">
            <div className="bg-white p-3 rounded-lg border border-[var(--cv-border)] flex items-center justify-center">
              <QrCode size={130} className="text-black" />
            </div>
          </div>

          <div className="space-y-2 border border-[var(--cv-border)] p-3 rounded-lg bg-[var(--cv-bg-subtle)]">
            <p className="font-semibold text-[var(--cv-text)]">Emergency Backup Codes</p>
            <p className="text-[10px] text-[var(--cv-text-secondary)]">
              Download these codes in case you lose access to your device.
            </p>
            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-[var(--cv-text-muted)] py-1">
              {backupCodes.map((code, idx) => (
                <div key={idx}>Code {idx + 1}: {code}</div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary-500 w-full hover:bg-primary-500/5 mt-1 border border-primary-500/10"
              leftIcon={<Download size={12} />}
              onClick={downloadBackupCodes}
            >
              Download backup codes (.txt)
            </Button>
          </div>

          <div className="space-y-1.5 pt-1">
            <label htmlFor="tfa-input-code" className="block font-semibold text-[var(--cv-text-secondary)]">
              6-Digit Authenticator Code
            </label>
            <input
              id="tfa-input-code"
              type="text"
              maxLength={6}
              value={tfACode}
              onChange={(e) => setTfACode(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 123456"
              className="flex h-9 w-full rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-3 text-center text-sm font-semibold tracking-widest focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShow2FASetup(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleVerify2FA} disabled={tfACode.length < 6}>
              Verify & Enable
            </Button>
          </div>
        </div>
      </Modal>

      {/* Stub Coming Soon Modal */}
      <Modal
        isOpen={comingSoonModalOpen}
        onClose={() => setComingSoonModalOpen(false)}
        title={`${comingSoonTitle} (Coming Soon)`}
        size="sm"
      >
        <div className="space-y-4 text-center py-2">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400">
              <Sliders size={22} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--cv-text)]">
              Feature is currently disabled
            </p>
            <p className="text-xs text-[var(--cv-text-secondary)] px-2 leading-relaxed">
              The billing plan checkout, email changes, and notifications settings require an active backend server connection. These will be fully wired in the future phase.
            </p>
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" onClick={() => setComingSoonModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
