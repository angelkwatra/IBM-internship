/**
 * FileContextMenu.tsx — Right-click / kebab context menu for files.
 *
 * Renders as a positioned portal at right-click coordinates.
 * Also usable via the "..." kebab button for touch devices.
 */

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  FolderOpen,
  Pencil,
  ArrowRightLeft,
  Copy,
  Share2,
  Download,
  Star,
  Trash2,
  Info,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import {
  dropdownVariants,
  dropdownTransition,
  getTransition,
} from "../../lib/motion";
import type { FileSystemItem } from "../../services/fileService";

export interface ContextMenuAction {
  type:
    | "open"
    | "rename"
    | "move"
    | "copy"
    | "share"
    | "download"
    | "star"
    | "trash"
    | "details";
  item: FileSystemItem;
}

interface FileContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  item: FileSystemItem | null;
  onClose: () => void;
  onAction: (action: ContextMenuAction) => void;
}

interface MenuItem {
  label: string;
  icon: React.ElementType;
  action: ContextMenuAction["type"];
  isDivider?: false;
}

interface Divider {
  isDivider: true;
}

type MenuEntry = MenuItem | Divider;

export function FileContextMenu({
  isOpen,
  position,
  item,
  onClose,
  onAction,
}: FileContextMenuProps) {
  const prefersReduced = useReducedMotion();
  const transition = getTransition(dropdownTransition, prefersReduced);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use setTimeout to avoid the same click that opened the menu closing it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleAction = useCallback(
    (action: ContextMenuAction["type"]) => {
      if (!item) return;
      onAction({ type: action, item });
      onClose();
    },
    [item, onAction, onClose]
  );

  if (!item) return null;

  const menuItems: MenuEntry[] = [
    { label: item.type === "folder" ? "Open" : "Preview", icon: FolderOpen, action: "open" },
    { isDivider: true },
    { label: "Rename", icon: Pencil, action: "rename" },
    { label: "Move to…", icon: ArrowRightLeft, action: "move" },
    { label: "Copy", icon: Copy, action: "copy" },
    { label: "Share", icon: Share2, action: "share" },
    { label: "Download", icon: Download, action: "download" },
    { isDivider: true },
    {
      label: item.isStarred ? "Remove star" : "Add star",
      icon: Star,
      action: "star",
    },
    { label: "Details", icon: Info, action: "details" },
    { isDivider: true },
    { label: "Move to Trash", icon: Trash2, action: "trash" },
  ];

  // Calculate position — keep menu within viewport
  const menuWidth = 200;
  const menuHeight = menuItems.length * 32;
  const adjustedX = Math.min(position.x, window.innerWidth - menuWidth - 8);
  const adjustedY = Math.min(position.y, window.innerHeight - menuHeight - 8);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          role="menu"
          variants={dropdownVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={transition}
          className={cn(
            "fixed z-[100] min-w-[200px]",
            "rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]",
            "p-1 shadow-[var(--cv-shadow-lg)]"
          )}
          style={{ top: adjustedY, left: adjustedX }}
        >
          {menuItems.map((entry, index) => {
            if (entry.isDivider) {
              return (
                <div
                  key={`div-${index}`}
                  role="separator"
                  className="my-1 h-px bg-[var(--cv-border)]"
                />
              );
            }

            const Icon = entry.icon;
            const isDestructive = entry.action === "trash";

            return (
              <button
                key={entry.action}
                role="menuitem"
                onClick={() => handleAction(entry.action)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                  "outline-none transition-colors duration-100",
                  isDestructive
                    ? "text-error hover:bg-rose-50 dark:hover:bg-rose-950/20"
                    : "text-[var(--cv-text)] hover:bg-[var(--cv-bg-muted)]"
                )}
              >
                <Icon
                  size={15}
                  className={cn(
                    "shrink-0",
                    isDestructive
                      ? "text-error"
                      : "text-[var(--cv-text-secondary)]"
                  )}
                />
                <span className="flex-1 text-left">{entry.label}</span>
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default FileContextMenu;
