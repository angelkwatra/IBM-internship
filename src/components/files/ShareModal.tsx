/**
 * ShareModal.tsx — A high-fidelity tabbed sharing control panel.
 * Includes chip-based email tags, role select, password toggles,
 * expiry date inputs, and clipboard copy operations.
 */

import { useState, useEffect } from "react";
import {
  Users,
  Link2,
  Copy,
  Check,
  Plus,
  X,
  Lock,
  Calendar,
  Download,
  AlertCircle,
  Shield,
  Loader2,
} from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useToast } from "../ui/ToastProvider";
import { cn } from "../../lib/cn";
import {
  getShareSettings,
  addPersonToShare,
  removePersonFromShare,
  generatePublicLink,
  revokePublicLink,
  addMockNotification,
  type FileSystemItem,
  type Share,
} from "../../services/fileService";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FileSystemItem | null;
  workspaceId: string;
}

export function ShareModal({
  isOpen,
  onClose,
  item,
  workspaceId,
}: ShareModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"people" | "link">("people");
  const [shareData, setShareData] = useState<Share | null>(null);
  const [loading, setLoading] = useState(false);

  // People Tab State
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [peopleRole, setPeopleRole] = useState<"viewer" | "commenter" | "editor">("viewer");
  const [inviteMessage, setInviteMessage] = useState("");
  const [notifyPeople, setNotifyPeople] = useState(true);
  const [isInviting, setIsInviting] = useState(false);

  // Link Tab State
  const [copied, setCopied] = useState(false);
  const [linkPassword, setLinkPassword] = useState("");
  const [linkExpires, setLinkExpires] = useState("");
  const [linkDownloadLimit, setLinkDownloadLimit] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [isPasswordEnabled, setIsPasswordEnabled] = useState(false);
  const [isExpiryEnabled, setIsExpiryEnabled] = useState(false);
  const [isLimitEnabled, setIsLimitEnabled] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  // Load share settings when modal opens
  useEffect(() => {
    if (isOpen && item) {
      setLoading(true);
      getShareSettings(workspaceId, item.id)
        .then((data) => {
          setShareData(data);
          // Set inputs from share data
          if (data.publicLink) {
            setLinkPassword(data.publicLink.password || "");
            setIsPasswordEnabled(!!data.publicLink.password);
            setLinkExpires(data.publicLink.expiresAt ? data.publicLink.expiresAt.split("T")[0] : "");
            setIsExpiryEnabled(!!data.publicLink.expiresAt);
            setLinkDownloadLimit(data.publicLink.downloadLimit ? data.publicLink.downloadLimit.toString() : "");
            setIsLimitEnabled(!!data.publicLink.downloadLimit);
          } else {
            setLinkPassword("");
            setIsPasswordEnabled(false);
            setLinkExpires("");
            setIsExpiryEnabled(false);
            setLinkDownloadLimit("");
            setIsLimitEnabled(false);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, item, workspaceId]);

  if (!item) return null;

  // ── People Tab Logic ─────────────────────────────────────────────────────

  const handleAddEmail = () => {
    const email = emailInput.trim();
    if (!email) return;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Invalid email", "Please enter a valid email address.");
      return;
    }

    if (email.toLowerCase() === "demo@cloudvault.io") {
      toast.error("Invalid email", "You cannot share a file with yourself.");
      return;
    }

    if (emails.includes(email)) {
      toast.info("Duplicate email", "This email has already been added.");
      return;
    }

    setEmails([...emails, email]);
    setEmailInput("");
  };

  const handleRemoveEmailChip = (idx: number) => {
    setEmails(emails.filter((_, i) => i !== idx));
  };

  const handleSaveInvite = async () => {
    if (emails.length === 0) {
      toast.error("No invitees", "Please add at least one email to share.");
      return;
    }

    setIsInviting(true);
    try {
      let finalShare = shareData!;
      for (const email of emails) {
        finalShare = await addPersonToShare(workspaceId, item.id, email, peopleRole);
        if (notifyPeople) {
          addMockNotification(
            "File shared",
            `You shared '${item.name}' with ${email}.${inviteMessage.trim() ? ` Message: ${inviteMessage.trim()}` : ""}`,
            "share"
          );
        }
      }
      setShareData(finalShare);
      setEmails([]);
      setInviteMessage("");
      toast.success(
        "Access updated",
        `Invited ${emails.length} person/people. ${
          notifyPeople ? "Notification email queued." : ""
        }`
      );
    } catch {
      toast.error("Error", "Failed to update sharing access.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemovePerson = async (email: string) => {
    try {
      const updated = await removePersonFromShare(workspaceId, item.id, email);
      setShareData(updated);
      toast.success("Access revoked", `Removed access for ${email}`);
    } catch {
      toast.error("Error", "Failed to remove person.");
    }
  };

  const isDemoInvited = (email: string) => {
    // Mock check: anything other than "john@acme.com" and "sarah@design.io" is an outside user (will be invited)
    const members = ["john@acme.com", "sarah@design.io", "demo@cloudvault.io"];
    return !members.includes(email.toLowerCase());
  };

  // ── Link Tab Logic ───────────────────────────────────────────────────────

  const handleToggleLink = async (checked: boolean) => {
    try {
      if (checked) {
        const updated = await generatePublicLink(workspaceId, item.id, {
          accessLevel: "viewer",
        });
        setShareData(updated);
        toast.success("Link sharing enabled", "Anyone with the link can now view.");
      } else {
        const updated = await revokePublicLink(workspaceId, item.id);
        setShareData(updated);
        toast.success("Link sharing disabled", "Public link revoked successfully.");
      }
    } catch {
      toast.error("Error", "Failed to toggle link sharing.");
    }
  };

  const handleUpdateLinkSettings = async (changes: {
    accessLevel?: "viewer" | "commenter" | "editor";
    password?: string | null;
    expiresAt?: string | null;
    downloadLimit?: number | null;
  }) => {
    if (!shareData?.publicLink) return;
    try {
      const payload: any = {
        accessLevel: changes.accessLevel ?? shareData.publicLink.accessLevel,
      };

      if (changes.password !== undefined) payload.password = changes.password === null ? undefined : changes.password;
      if (changes.expiresAt !== undefined) payload.expiresAt = changes.expiresAt === null ? undefined : changes.expiresAt;
      if (changes.downloadLimit !== undefined) payload.downloadLimit = changes.downloadLimit === null ? undefined : changes.downloadLimit;

      const updated = await generatePublicLink(workspaceId, item.id, payload);
      setShareData(updated);
      toast.success("Link settings saved");
    } catch {
      toast.error("Error", "Failed to update link settings.");
    }
  };

  const handleCopyLink = () => {
    if (!shareData?.publicLink) return;
    const shareUrl = `${window.location.origin}/share/${shareData.publicLink.token}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.info("Link copied", "Sharing URL copied to clipboard.");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${item.name}"`} size="md">
      <div className="space-y-4">
        {/* Tab Headers */}
        <div className="flex border-b border-[var(--cv-border)]">
          <button
            onClick={() => setActiveTab("people")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none",
              activeTab === "people"
                ? "border-primary-600 text-primary-700 dark:border-primary-500 dark:text-primary-400"
                : "border-transparent text-[var(--cv-text-secondary)] hover:text-[var(--cv-text)]"
            )}
          >
            <Users size={16} />
            <span>People</span>
          </button>
          <button
            onClick={() => setActiveTab("link")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none",
              activeTab === "link"
                ? "border-primary-600 text-primary-700 dark:border-primary-500 dark:text-primary-400"
                : "border-transparent text-[var(--cv-text-secondary)] hover:text-[var(--cv-text)]"
            )}
          >
            <Link2 size={16} />
            <span>Public Link</span>
          </button>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="animate-spin text-primary-600" size={24} />
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* ── PEOPLE TAB ───────────────────────────────────────────────── */}
            {activeTab === "people" && (
              <div className="space-y-4">
                {/* Add Email input and chips */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[var(--cv-text-secondary)]">
                    Invite new people
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex flex-1 flex-wrap items-center gap-1.5 rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-3 py-1.5">
                      {emails.map((email, i) => (
                        <span
                          key={i}
                          className={cn(
                            "flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium",
                            isDemoInvited(email)
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                              : "bg-primary-100 text-primary-850 dark:bg-primary-950/40 dark:text-primary-300"
                          )}
                        >
                          <span>{email}</span>
                          {isDemoInvited(email) && (
                            <span className="text-[10px] font-semibold opacity-70">
                              (will be invited)
                            </span>
                          )}
                          <button
                            onClick={() => handleRemoveEmailChip(i)}
                            className="hover:text-red-500"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder={emails.length === 0 ? "Enter email address..." : ""}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddEmail();
                          }
                        }}
                        className="flex-1 min-w-[120px] bg-transparent text-sm text-[var(--cv-text)] placeholder:text-[var(--cv-text-muted)] focus:outline-none"
                      />
                    </div>
                    <Button variant="secondary" size="md" onClick={handleAddEmail} iconOnly>
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>

                {/* Role select & Invite Button */}
                {emails.length > 0 && (
                  <div className="rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-muted)] p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[var(--cv-text-secondary)]">
                        Assign permission role:
                      </span>
                      <select
                        value={peopleRole}
                        onChange={(e) =>
                          setPeopleRole(
                            e.target.value as "viewer" | "commenter" | "editor"
                          )
                        }
                        className="rounded border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] px-2 py-1 text-xs text-[var(--cv-text)] outline-none"
                      >
                        <option value="viewer">Viewer (Read-only)</option>
                        <option value="commenter">Commenter</option>
                        <option value="editor">Editor</option>
                      </select>
                    </div>

                    <textarea
                      rows={2}
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      placeholder="Add an optional message..."
                      className="w-full rounded border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] p-2 text-xs text-[var(--cv-text)] placeholder:text-[var(--cv-text-muted)] focus:outline-none resize-none"
                    />

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifyPeople}
                          onChange={(e) => setNotifyPeople(e.target.checked)}
                          className="rounded border-[var(--cv-border)] text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-xs text-[var(--cv-text-secondary)]">
                          Notify people via email
                        </span>
                      </label>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveInvite}
                        isLoading={isInviting}
                      >
                        Send Invites
                      </Button>
                    </div>
                  </div>
                )}

                {/* People list */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[var(--cv-text)] uppercase tracking-wider">
                    Who has access
                  </h4>
                  <div className="divide-y divide-[var(--cv-border)] rounded-lg border border-[var(--cv-border)] max-h-48 overflow-y-auto">
                    {/* Owner entry */}
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--cv-bg-muted)] font-semibold text-[var(--cv-text)] text-xs">
                          OW
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[var(--cv-text)]">
                            {item.owner === "You" ? "You (Owner)" : item.owner}
                          </p>
                          <p className="text-[10px] text-[var(--cv-text-muted)]">
                            {item.owner === "You" ? "demo@cloudvault.io" : "File Owner"}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-[var(--cv-text-muted)] font-medium px-2 py-1">
                        Owner
                      </span>
                    </div>

                    {/* Guest entries */}
                    {shareData?.sharedWith.map((person, i) => (
                      <div key={i} className="flex items-center justify-between p-3 hover:bg-[var(--cv-bg-muted)]/30">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-bold text-xs uppercase">
                            {person.email.slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[var(--cv-text)]">
                              {person.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={person.role}
                            onChange={(e) =>
                              addPersonToShare(
                                workspaceId,
                                item.id,
                                person.email,
                                e.target.value as "viewer" | "commenter" | "editor"
                              ).then((updated) => setShareData(updated))
                            }
                            className="rounded border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] px-1.5 py-0.5 text-xs text-[var(--cv-text)] outline-none"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="commenter">Commenter</option>
                            <option value="editor">Editor</option>
                          </select>
                          <button
                            onClick={() => handleRemovePerson(person.email)}
                            className="p-1 rounded text-red-500 hover:bg-red-500/10"
                            title="Revoke access"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {(!shareData?.sharedWith || shareData.sharedWith.length === 0) && (
                      <div className="p-4 text-center text-xs text-[var(--cv-text-muted)]">
                        No additional people have private access.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── PUBLIC LINK TAB ─────────────────────────────────────────── */}
            {activeTab === "link" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] p-4">
                  <div className="space-y-1 pr-4">
                    <p className="text-xs font-bold text-[var(--cv-text)]">
                      Anyone with the link
                    </p>
                    <p className="text-xs text-[var(--cv-text-secondary)] leading-normal">
                      Enable to create a shareable URL that people can use to view this file.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!shareData?.publicLink?.enabled}
                      onChange={(e) => handleToggleLink(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={cn(
                      "w-11 h-6 bg-[var(--cv-bg-muted)] border border-[var(--cv-border)] rounded-full peer peer-focus:ring-1 peer-focus:ring-primary-500",
                      "after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all",
                      "peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white"
                    )} />
                  </label>
                </div>

                {shareData?.publicLink?.enabled ? (
                  <div className="space-y-4">
                    {/* Share Link display */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[var(--cv-text-secondary)]">
                        Share Link
                      </label>
                      <div className="flex h-9 items-center rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] pl-3 pr-1 text-sm">
                        <span className="flex-1 truncate pr-3 text-xs text-[var(--cv-text-muted)] select-all font-mono">
                          {window.location.origin}/share/{shareData.publicLink.token}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCopyLink}
                          className="shrink-0 h-7"
                          leftIcon={copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                        >
                          {copied ? "Copied" : "Copy"}
                        </Button>
                      </div>
                    </div>

                    {/* Access level role selector */}
                    <div className="flex items-center justify-between border-t border-[var(--cv-border)] pt-3">
                      <span className="text-xs font-semibold text-[var(--cv-text-secondary)]">
                        Link Access Permissions
                      </span>
                      <select
                        value={shareData.publicLink.accessLevel}
                        onChange={(e) =>
                          handleUpdateLinkSettings({
                            accessLevel: e.target.value as "viewer" | "commenter" | "editor",
                          })
                        }
                        className="rounded border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] px-2 py-1 text-xs text-[var(--cv-text)] outline-none"
                      >
                        <option value="viewer">View only</option>
                        <option value="commenter">Can comment</option>
                        <option value="editor">Can edit</option>
                      </select>
                    </div>

                    {/* Advanced Accordion Toggle */}
                    <div className="border-t border-[var(--cv-border)] pt-3">
                      <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex w-full items-center justify-between text-xs font-semibold text-[var(--cv-text-secondary)] hover:text-[var(--cv-text)]"
                      >
                        <span>Advanced Security Settings</span>
                        <span className="text-[10px] uppercase font-bold text-primary-600 dark:text-primary-400">
                          {showAdvanced ? "Hide" : "Show"}
                        </span>
                      </button>

                      {showAdvanced && (
                        <div className="mt-3 space-y-4 rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-muted)]/20 p-4">
                          {/* Password protection */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--cv-text)]">
                                <Lock size={14} className="text-primary-600" />
                                <span>Password Protection</span>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isPasswordEnabled}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setIsPasswordEnabled(checked);
                                    if (!checked) {
                                      setLinkPassword("");
                                      handleUpdateLinkSettings({ password: null });
                                    }
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="relative w-9 h-5 bg-[var(--cv-bg-muted)] rounded-full peer peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                              </label>
                            </div>
                            {isPasswordEnabled && (
                              <div className="flex items-center gap-2 pt-1">
                                <input
                                  type="text"
                                  value={linkPassword}
                                  onChange={(e) => {
                                    const newVal = e.target.value;
                                    setLinkPassword(newVal);
                                    handleUpdateLinkSettings({ password: newVal.trim() || null });
                                  }}
                                  onBlur={() => {
                                    handleUpdateLinkSettings({ password: linkPassword.trim() || null });
                                  }}
                                  placeholder="Enter access password..."
                                  className="flex-1 h-8 rounded border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-2.5 text-xs text-[var(--cv-text)] focus:outline-none"
                                />
                              </div>
                            )}
                            <p className="text-[10px] text-[var(--cv-text-muted)] leading-relaxed">
                              If set, visitors must enter this password to view or download.
                            </p>
                          </div>

                          {/* Expiration date */}
                          <div className="space-y-2 border-t border-[var(--cv-border)] pt-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--cv-text)]">
                                <Calendar size={14} className="text-primary-600" />
                                <span>Expiration Date</span>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isExpiryEnabled}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setIsExpiryEnabled(checked);
                                    if (!checked) {
                                      setLinkExpires("");
                                      handleUpdateLinkSettings({ expiresAt: null });
                                    }
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="relative w-9 h-5 bg-[var(--cv-bg-muted)] rounded-full peer peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                              </label>
                            </div>
                            {isExpiryEnabled && (
                              <div className="flex items-center gap-2 pt-1">
                                <input
                                  type="date"
                                  value={linkExpires}
                                  min={new Date().toISOString().split("T")[0]}
                                  onChange={(e) => {
                                    const newVal = e.target.value;
                                    setLinkExpires(newVal);
                                    handleUpdateLinkSettings({
                                      expiresAt: newVal ? new Date(newVal).toISOString() : null,
                                    });
                                  }}
                                  className="flex-1 h-8 rounded border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-2.5 text-xs text-[var(--cv-text)] focus:outline-none"
                                />
                              </div>
                            )}
                            <p className="text-[10px] text-[var(--cv-text-muted)] leading-relaxed">
                              Access link will automatically disable after this date.
                            </p>
                          </div>

                          {/* Download Count Limit */}
                          <div className="space-y-2 border-t border-[var(--cv-border)] pt-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--cv-text)]">
                                <Download size={14} className="text-primary-600" />
                                <span>Download Limit</span>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isLimitEnabled}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setIsLimitEnabled(checked);
                                    if (!checked) {
                                      setLinkDownloadLimit("");
                                      handleUpdateLinkSettings({ downloadLimit: null });
                                    }
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="relative w-9 h-5 bg-[var(--cv-bg-muted)] rounded-full peer peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                              </label>
                            </div>
                            {isLimitEnabled && (
                              <div className="flex items-center gap-2 pt-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={linkDownloadLimit}
                                  onChange={(e) => {
                                    const newVal = e.target.value;
                                    setLinkDownloadLimit(newVal);
                                    handleUpdateLinkSettings({
                                      downloadLimit: newVal ? parseInt(newVal) : null,
                                    });
                                  }}
                                  onBlur={() => {
                                    handleUpdateLinkSettings({
                                      downloadLimit: linkDownloadLimit ? parseInt(linkDownloadLimit) : null,
                                    });
                                  }}
                                  placeholder="e.g. 5 downloads..."
                                  className="flex-1 h-8 rounded border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-2.5 text-xs text-[var(--cv-text)] focus:outline-none"
                                />
                              </div>
                            )}
                            <div className="flex justify-between items-center text-[10px] text-[var(--cv-text-muted)]">
                              <span>Link will disable after limit is reached.</span>
                              <span className="font-semibold text-primary-600 dark:text-primary-400">
                                Downloads: {shareData.publicLink.downloadCount} /{" "}
                                {shareData.publicLink.downloadLimit || "∞"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Revoke button */}
                    <div className="flex flex-col border-t border-[var(--cv-border)] pt-3">
                      {showRevokeConfirm ? (
                        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-3">
                          <p className="text-xs font-medium text-[var(--cv-text)]">
                            Are you sure you want to revoke this public link? Anyone using it will immediately lose access.
                          </p>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setShowRevokeConfirm(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                handleToggleLink(false);
                                setShowRevokeConfirm(false);
                              }}
                            >
                              Yes, Revoke Link
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowRevokeConfirm(true)}
                            leftIcon={<AlertCircle size={14} />}
                          >
                            Revoke Link
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[var(--cv-border)] rounded-lg text-center">
                    <Shield size={36} className="text-[var(--cv-text-muted)] mb-3" />
                    <p className="text-xs font-semibold text-[var(--cv-text)] mb-1">
                      Public Link Sharing is Off
                    </p>
                    <p className="text-[11px] text-[var(--cv-text-secondary)] max-w-[280px] mb-4">
                      Toggle link sharing on to let anyone view this file by pasting the custom token URL.
                    </p>
                    <Button variant="primary" size="sm" onClick={() => handleToggleLink(true)}>
                      Enable Link Sharing
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
