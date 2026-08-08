import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Search,
  FileText,
  FolderOpen,
  Image,
  Settings,
  Upload,
  HardDrive,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useReducedMotion } from "../../hooks/useReducedMotion";

// ── Mock search results ──────────────────────────────────────────

interface SearchResult {
  id: string;
  label: string;
  category: "file" | "folder" | "action";
  icon: React.ElementType;
}

const mockResults: SearchResult[] = [
  { id: "1", label: "Q3 Report.pdf", category: "file", icon: FileText },
  { id: "2", label: "Brand Assets", category: "folder", icon: FolderOpen },
  { id: "3", label: "hero-banner.png", category: "file", icon: Image },
  { id: "4", label: "Upload files", category: "action", icon: Upload },
  { id: "5", label: "Storage analytics", category: "action", icon: HardDrive },
  { id: "6", label: "Settings", category: "action", icon: Settings },
];

// ── Component ────────────────────────────────────────────────────

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const prefersReduced = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const filtered = query
    ? mockResults.filter((r) =>
        r.label.toLowerCase().includes(query.toLowerCase())
      )
    : mockResults;

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setQuery("");
      setFocusedIndex(0);
      // Focus input after animation
      const raf = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    } else {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Reset focused index when results change
  useEffect(() => {
    setFocusedIndex(0);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((i) => (i + 1) % filtered.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((i) =>
            i <= 0 ? filtered.length - 1 : i - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          // For now, just close — functionality is a later prompt
          onClose();
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filtered.length, onClose]
  );

  // Overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[20vh] backdrop-blur-sm dark:bg-black/60"
          initial={{ opacity: prefersReduced ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReduced ? 0 : 0.15 }}
          onClick={handleOverlayClick}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={
              prefersReduced ? undefined : { opacity: 0, scale: 0.96, y: -8 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              prefersReduced ? undefined : { opacity: 0, scale: 0.96, y: -8 }
            }
            transition={{ duration: prefersReduced ? 0 : 0.2 }}
            className={cn(
              "mx-4 w-full max-w-lg overflow-hidden rounded-xl",
              "border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]",
              "shadow-2xl"
            )}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-[var(--cv-border)] px-4">
              <Search
                size={18}
                className="shrink-0 text-[var(--cv-text-muted)]"
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search files, folders, or actions…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 flex-1 bg-transparent text-sm text-[var(--cv-text)] placeholder:text-[var(--cv-text-muted)] focus:outline-none"
              />
              <kbd className="hidden rounded border border-[var(--cv-border)] bg-[var(--cv-bg-muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--cv-text-muted)] sm:inline-block">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-72 overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--cv-text-muted)]">
                  No results found
                </p>
              ) : (
                <ul role="listbox">
                  {filtered.map((result, index) => {
                    const Icon = result.icon;
                    const isFocused = index === focusedIndex;
                    return (
                      <li
                        key={result.id}
                        role="option"
                        aria-selected={isFocused}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 px-4 py-2 text-sm transition-colors",
                          isFocused
                            ? "bg-[var(--cv-bg-muted)] text-[var(--cv-text)]"
                            : "text-[var(--cv-text-secondary)]"
                        )}
                        onClick={() => onClose()}
                        onMouseEnter={() => setFocusedIndex(index)}
                      >
                        <Icon
                          size={16}
                          className="shrink-0 text-[var(--cv-text-muted)]"
                        />
                        <span className="flex-1 truncate">{result.label}</span>
                        <span className="text-xs capitalize text-[var(--cv-text-muted)]">
                          {result.category}
                        </span>
                        {isFocused && (
                          <CornerDownLeft
                            size={12}
                            className="shrink-0 text-[var(--cv-text-muted)]"
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-4 border-t border-[var(--cv-border)] px-4 py-2">
              <span className="flex items-center gap-1 text-[10px] text-[var(--cv-text-muted)]">
                <kbd className="rounded border border-[var(--cv-border)] bg-[var(--cv-bg-muted)] px-1 py-0.5 font-mono">
                  ↑↓
                </kbd>{" "}
                Navigate
              </span>
              <span className="flex items-center gap-1 text-[10px] text-[var(--cv-text-muted)]">
                <kbd className="rounded border border-[var(--cv-border)] bg-[var(--cv-bg-muted)] px-1 py-0.5 font-mono">
                  ↵
                </kbd>{" "}
                Open
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default CommandPalette;
