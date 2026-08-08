import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../lib/cn";
import {
  dropdownVariants,
  dropdownTransition,
  getTransition,
} from "../../lib/motion";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/* ─── Types ───────────────────────────────────────────────────── */
export interface DropdownMenuItem {
  label: string;
  icon?: React.ElementType;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  isDivider?: boolean;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: "left" | "right";
  className?: string;
}

/* ─── Component ───────────────────────────────────────────────── */
export function DropdownMenu({
  trigger,
  items,
  align = "left",
  className,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const prefersReduced = useReducedMotion();
  const transition = getTransition(dropdownTransition, prefersReduced);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  // Filter actionable (non-divider) items for keyboard navigation
  const actionableIndices = items.reduce<number[]>((acc, item, i) => {
    if (!item.isDivider) acc.push(i);
    return acc;
  }, []);

  /* ── Click outside ────────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  /* ── Focus management ─────────────────────────────────────── */
  useEffect(() => {
    if (isOpen && focusedIndex >= 0) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  /* ── Keyboard handling ────────────────────────────────────── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsOpen(true);
          setFocusedIndex(actionableIndices[0] ?? -1);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const currentPos = actionableIndices.indexOf(focusedIndex);
          const nextPos = (currentPos + 1) % actionableIndices.length;
          setFocusedIndex(actionableIndices[nextPos]);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const currentPos = actionableIndices.indexOf(focusedIndex);
          const prevPos =
            (currentPos - 1 + actionableIndices.length) %
            actionableIndices.length;
          setFocusedIndex(actionableIndices[prevPos]);
          break;
        }
        case "Enter":
        case " ": {
          e.preventDefault();
          const item = items[focusedIndex];
          if (item && !item.disabled && !item.isDivider) {
            item.onClick?.();
            setIsOpen(false);
          }
          break;
        }
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          break;
        case "Tab":
          setIsOpen(false);
          break;
      }
    },
    [isOpen, focusedIndex, actionableIndices, items]
  );

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) {
        setFocusedIndex(-1);
      }
      return !prev;
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block", className)}
      onKeyDown={handleKeyDown}
    >
      {/* ── Trigger ─────────────────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={toggleOpen}
        className="inline-flex cursor-pointer"
      >
        {trigger}
      </div>

      {/* ── Menu ────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            id={menuId}
            role="menu"
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={transition}
            className={cn(
              "absolute z-50 mt-1.5 min-w-[180px]",
              "rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]",
              "p-1 shadow-[var(--cv-shadow-lg)]",
              align === "right" ? "right-0" : "left-0"
            )}
          >
            {items.map((item, index) => {
              if (item.isDivider) {
                return (
                  <div
                    key={`divider-${index}`}
                    role="separator"
                    className="my-1 h-px bg-[var(--cv-border)]"
                  />
                );
              }

              const Icon = item.icon;

              return (
                <button
                  key={`${item.label}-${index}`}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  role="menuitem"
                  tabIndex={focusedIndex === index ? 0 : -1}
                  disabled={item.disabled}
                  onClick={() => {
                    if (!item.disabled) {
                      item.onClick?.();
                      setIsOpen(false);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                    "text-[var(--cv-text)] outline-none transition-colors duration-100",
                    "hover:bg-[var(--cv-bg-muted)] focus-visible:bg-[var(--cv-bg-muted)]",
                    item.disabled &&
                      "pointer-events-none text-[var(--cv-text-muted)] opacity-50"
                  )}
                >
                  {Icon && <Icon size={15} className="shrink-0 text-[var(--cv-text-secondary)]" />}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.shortcut && (
                    <kbd
                      className={cn(
                        "ml-auto text-xs text-[var(--cv-text-muted)]",
                        "rounded border border-[var(--cv-border)] bg-[var(--cv-bg-muted)]",
                        "px-1.5 py-0.5 font-mono leading-none"
                      )}
                    >
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DropdownMenu;
