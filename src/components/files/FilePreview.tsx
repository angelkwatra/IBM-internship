/**
 * FilePreview.tsx — Modular, interactive, high-fidelity file previewer.
 * Support view layouts (doc, sheet, image, video, audio) and interactive comments feeds.
 */

import { useState, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  Image as ImageIcon,
  Video,
  Send,
  MessageSquare,
  User,
  Check,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { cn } from "../../lib/cn";
import { mockStorage } from "../../lib/mockPersistence";
import { type FileSystemItem } from "../../services/fileService";

interface FilePreviewProps {
  item: FileSystemItem;
  accessLevel: "viewer" | "commenter" | "editor";
  onRename?: (newName: string) => Promise<void>;
  className?: string;
}

interface CommentItem {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export function FilePreview({
  item,
  accessLevel,
  onRename,
  className,
}: FilePreviewProps) {
  // Rename state (Editor level)
  const [nameInput, setNameInput] = useState(item.name);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameSaved, setRenameSaved] = useState(false);

  // Text editor state (Editor level)
  const [textVal, setTextVal] = useState(() => {
    return mockStorage.getItem<string>(
      `cv_file_text_${item.id}`,
      `// Simulated content for ${item.name}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nCreated: ${new Date(item.createdAt).toLocaleDateString()}\nSize: ${item.size} bytes`
    );
  });
  const [isSavingText, setIsSavingText] = useState(false);

  // Audio/Video player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(25);
  const [volume, setVolume] = useState(80);

  // Comments state
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("Anonymous Guest");

  // Load comments
  useEffect(() => {
    const seedComments: CommentItem[] = [
      {
        id: "comm_1",
        author: "Alice Johnson",
        content: `I reviewed the ${item.type} layout. Looks solid!`,
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: "comm_2",
        author: "Bob Miller",
        content: "Let's double check the alignment on mobile screens.",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];
    const key = `cv_comments_${item.id}`;
    const persisted = mockStorage.getItem<CommentItem[] | null>(key, null);
    if (persisted) {
      setComments(persisted);
    } else {
      setComments(seedComments);
      mockStorage.setItem(key, seedComments);
    }
  }, [item.id, item.type]);

  // Synchronize component state if item changes
  useEffect(() => {
    setNameInput(item.name);
    setTextVal(
      mockStorage.getItem<string>(
        `cv_file_text_${item.id}`,
        `// Simulated content for ${item.name}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nCreated: ${new Date(item.createdAt).toLocaleDateString()}\nSize: ${item.size} bytes`
      )
    );
  }, [item.id, item.name, item.createdAt, item.size]);

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const newComment: CommentItem = {
      id: "comm_" + Math.random().toString(36).slice(2, 9),
      author: commentAuthor.trim() || "Anonymous Guest",
      content: commentInput.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = [...comments, newComment];
    setComments(updated);
    mockStorage.setItem(`cv_comments_${item.id}`, updated);
    setCommentInput("");
  };

  const handleSaveText = async () => {
    setIsSavingText(true);
    // Simulate save delay
    await new Promise((r) => setTimeout(r, 800));
    mockStorage.setItem(`cv_file_text_${item.id}`, textVal);
    setIsSavingText(false);
  };

  const handleNameBlur = async () => {
    if (!nameInput.trim() || nameInput === item.name) return;
    if (onRename) {
      setIsRenaming(true);
      await onRename(nameInput.trim());
      setIsRenaming(false);
      setRenameSaved(true);
      setTimeout(() => setRenameSaved(false), 2000);
    }
  };

  // Video/audio progress tick simulation
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlayProgress((prev) => (prev >= 100 ? 0 : prev + 1));
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6", className)}>
      {/* ── LEFT SECTION: File Content Preview ─────────────────────────────────── */}
      <div className={cn("lg:col-span-2 space-y-4")}>
        <Card className="overflow-hidden border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] p-6">
          {/* Header metadata */}
          <div className="flex items-center justify-between border-b border-[var(--cv-border)] pb-4 mb-4">
            <div className="flex-1 min-w-0 pr-3">
              {accessLevel === "editor" && onRename ? (
                <div className="relative flex items-center gap-2 max-w-md">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={handleNameBlur}
                    className="flex-1 font-bold text-lg text-[var(--cv-text)] bg-transparent border-b border-[var(--cv-border)] focus:border-primary-500 focus:outline-none py-0.5"
                  />
                  {isRenaming && <Loader2 className="animate-spin text-primary-600 shrink-0" size={14} />}
                  {renameSaved && <Check className="text-green-500 shrink-0" size={14} />}
                </div>
              ) : (
                <h2 className="font-bold text-lg text-[var(--cv-text)] truncate">
                  {item.name}
                </h2>
              )}
              <p className="text-[10px] text-[var(--cv-text-secondary)] mt-1">
                Type: <span className="uppercase">{item.type}</span> • Size:{" "}
                {item.size > 0 ? `${(item.size / 1024 / 1024).toFixed(2)} MB` : "Folder"} • Role:{" "}
                <span className="capitalize font-semibold text-primary-600 dark:text-primary-400">
                  {accessLevel}
                </span>
              </p>
            </div>
          </div>

          {/* Render content based on type */}
          <div className="flex flex-col items-center justify-center min-h-[300px] rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] p-4">
            {/* IMAGE PREVIEW */}
            {item.type === "image" && (
              <div className="relative flex flex-col items-center justify-center p-4 max-w-full">
                {item.previewDataUrl ? (
                  <div className="relative flex items-center justify-center max-h-[400px] w-full rounded-lg overflow-hidden border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] shadow-sm">
                    <img
                      src={item.previewDataUrl}
                      alt={item.name}
                      className="max-h-[380px] w-auto max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center h-64 w-full max-w-md rounded-lg overflow-hidden border border-[var(--cv-border)] bg-gradient-to-tr from-sky-400/20 via-pink-400/10 to-indigo-500/20 dark:from-sky-950/20 dark:to-indigo-950/20">
                    <ImageIcon size={64} className="text-primary-600 dark:text-primary-450 opacity-60" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/40 backdrop-blur-sm px-3 py-2 text-center text-xs text-white">
                      Simulated Image Preview Frame
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIDEO PREVIEW */}
            {item.type === "video" && (
              <div className="w-full max-w-md space-y-4 p-4">
                <div className="relative flex items-center justify-center h-52 w-full rounded-lg overflow-hidden border border-[var(--cv-border)] bg-neutral-900">
                  <Video size={48} className="text-white/60 animate-pulse" />
                  <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 backdrop-blur text-white transition-all transform hover:scale-105"
                    >
                      {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                    </button>
                  </div>
                  {/* Status Overlay */}
                  <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
                    {isPlaying ? "Playing..." : "Paused"}
                  </div>
                </div>

                {/* Simulated Media Controls */}
                <div className="space-y-2">
                  <div className="relative h-1.5 w-full rounded-full bg-[var(--cv-bg-muted)] overflow-hidden cursor-pointer">
                    <div
                      className="absolute left-0 top-0 h-full bg-primary-600 rounded-full transition-all"
                      style={{ width: `${playProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--cv-text-muted)]">
                    <span>
                      0:{Math.floor(playProgress / 4).toString().padStart(2, "0")} / 0:25
                    </span>
                    <div className="flex items-center gap-2">
                      <Volume2 size={14} />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => setVolume(parseInt(e.target.value))}
                        className="w-16 h-1 rounded bg-[var(--cv-bg-muted)] outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AUDIO PREVIEW */}
            {(item.type as string) === "audio" && (
              <div className="w-full max-w-md space-y-4 p-4">
                <div className="flex items-center gap-4 rounded-xl border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] p-4 shadow-sm">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-all"
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--cv-text)] truncate">{item.name}</p>
                    <div className="flex gap-0.5 items-center h-6 mt-1.5 overflow-hidden">
                      {Array.from({ length: 28 }).map((_, i) => {
                        const randomHeight = isPlaying
                          ? Math.floor(Math.sin((i + playProgress) * 0.8) * 12 + 16)
                          : 8;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "w-1 rounded-full bg-primary-600/30 transition-all duration-300",
                              isPlaying && "bg-primary-600"
                            )}
                            style={{ height: `${randomHeight}px` }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
                {/* Audio seek progress */}
                <div className="space-y-1">
                  <div className="relative h-1 w-full rounded-full bg-[var(--cv-bg-muted)] cursor-pointer">
                    <div
                      className="absolute left-0 top-0 h-full bg-primary-600 rounded-full"
                      style={{ width: `${playProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[var(--cv-text-muted)]">
                    <span>
                      0:{Math.floor(playProgress / 4).toString().padStart(2, "0")}
                    </span>
                    <span>Volume: {volume}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* TEXT/DOCUMENT EDITABLE (Editor access level) OR READ-ONLY VIEW */}
            {item.type !== "image" && item.type !== "video" && (item.type as string) !== "audio" && (
              <div className="w-full h-full flex flex-col items-stretch space-y-4">
                {accessLevel === "editor" ? (
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-center bg-[var(--cv-bg-muted)]/50 px-3 py-1.5 rounded-t border-b border-[var(--cv-border)]">
                      <span className="text-[10px] font-bold text-primary-600 uppercase">
                        Interactive Live Editor
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveText}
                        isLoading={isSavingText}
                        className="h-6 text-[10px] py-0 px-2"
                      >
                        Save File Changes
                      </Button>
                    </div>
                    <textarea
                      rows={12}
                      value={textVal}
                      onChange={(e) => setTextVal(e.target.value)}
                      className="w-full rounded-b border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] p-4 text-xs font-mono text-[var(--cv-text)] focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-y"
                    />
                  </div>
                ) : (
                  <div className="w-full rounded border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] p-4 text-xs font-mono text-[var(--cv-text-secondary)] whitespace-pre-wrap leading-relaxed select-text overflow-y-auto max-h-[300px]">
                    {textVal}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── RIGHT SECTION: Comments Feed (Commenter/Editor access level) ──────────────────── */}
      <div className="space-y-4">
        {accessLevel !== "viewer" ? (
          <Card className="flex flex-col border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] p-4 h-full min-h-[380px]">
            <div className="flex items-center gap-2 border-b border-[var(--cv-border)] pb-3 mb-3">
              <MessageSquare size={16} className="text-primary-600" />
              <h3 className="font-bold text-sm text-[var(--cv-text)]">
                File Discussion
              </h3>
            </div>

            {/* List of Comments */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[220px] lg:max-h-[320px]">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg bg-[var(--cv-bg-subtle)] p-2.5 space-y-1.5 border border-[var(--cv-border)]"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-[var(--cv-text)] flex items-center gap-1">
                      <User size={10} className="text-[var(--cv-text-muted)]" />
                      {c.author}
                    </span>
                    <span className="text-[var(--cv-text-muted)]">
                      {new Date(c.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--cv-text-secondary)] leading-normal break-words">
                    {c.content}
                  </p>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-[var(--cv-text-muted)]">
                  <MessageSquare size={24} className="opacity-40 mb-2" />
                  <span>No comments yet. Start the conversation!</span>
                </div>
              )}
            </div>

            {/* Post comment form */}
            <form onSubmit={handlePostComment} className="border-t border-[var(--cv-border)] pt-3 mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  placeholder="Your Name..."
                  className="w-1/2 h-7 rounded border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-2 text-[10px] text-[var(--cv-text)] focus:outline-none"
                />
                <span className="text-[9px] text-[var(--cv-text-muted)] italic truncate">
                  Commenting as guest
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Type a comment..."
                  className="w-full h-8 pr-10 rounded border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] pl-2.5 text-xs text-[var(--cv-text)] placeholder:text-[var(--cv-text-muted)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="absolute right-1 top-1 h-6 w-8 rounded flex items-center justify-center text-primary-600 disabled:opacity-40"
                >
                  <Send size={12} />
                </button>
              </div>
            </form>
          </Card>
        ) : (
          <Card className="p-4 border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]/60 text-center space-y-3">
            <MessageSquare size={32} className="mx-auto text-[var(--cv-text-muted)] opacity-50" />
            <h4 className="font-bold text-xs text-[var(--cv-text)]">Discussion Disabled</h4>
            <p className="text-[10px] text-[var(--cv-text-secondary)] leading-relaxed">
              This file link has "Viewer" permission. Upgrade to a "Commenter" or "Editor" link to participate in the conversation feed.
            </p>
          </Card>
        )}
      </div>
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
