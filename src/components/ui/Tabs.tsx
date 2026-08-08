import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useId,
} from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/cn";
import { getTransition } from "../../lib/motion";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/* ─── Context ─────────────────────────────────────────────────── */
interface TabsContextValue {
  activeValue: string;
  setActiveValue: (value: string) => void;
  baseId: string;
  layoutId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs compound components must be used within <Tabs>");
  return ctx;
}

/* ─── Tabs (root) ─────────────────────────────────────────────── */
export interface TabsProps {
  /** Controlled value */
  value?: string;
  /** Callback when value changes (controlled mode) */
  onChange?: (value: string) => void;
  /** Initial value (uncontrolled mode) */
  defaultValue?: string;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  value,
  onChange,
  defaultValue = "",
  children,
  className,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const baseId = useId();

  const isControlled = value !== undefined;
  const activeValue = isControlled ? value : internalValue;

  const setActiveValue = useCallback(
    (next: string) => {
      if (!isControlled) setInternalValue(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );

  const layoutId = `tabs-indicator-${baseId}`;

  return (
    <TabsContext.Provider value={{ activeValue, setActiveValue, baseId, layoutId }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

/* ─── TabsList ────────────────────────────────────────────────── */
export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const tabs = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []
    );
    const currentIndex = tabs.findIndex((t) => t === document.activeElement);

    let nextIndex = -1;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = tabs.length - 1;
    }

    if (nextIndex >= 0) {
      tabs[nextIndex]?.focus();
      tabs[nextIndex]?.click();
    }
  }, []);

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={handleKeyDown}
      className={cn(
        "flex flex-row items-center gap-0.5 rounded-lg p-1",
        "bg-[var(--cv-bg-muted)]",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ─── TabsTrigger ─────────────────────────────────────────────── */
export interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TabsTrigger({
  value,
  children,
  className,
  disabled = false,
}: TabsTriggerProps) {
  const { activeValue, setActiveValue, baseId, layoutId } = useTabsContext();
  const prefersReduced = useReducedMotion();
  const isActive = activeValue === value;

  const transition = getTransition(
    { type: "spring", stiffness: 400, damping: 30 },
    prefersReduced
  );

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-trigger-${value}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => !disabled && setActiveValue(value)}
      className={cn(
        "relative z-10 rounded-md px-3 py-1.5 text-sm font-medium",
        "outline-none transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-[var(--cv-ring)] focus-visible:outline-offset-2",
        isActive
          ? "text-[var(--cv-text)]"
          : "text-[var(--cv-text-muted)] hover:text-[var(--cv-text-secondary)]",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      {/* ── Animated background indicator ────────────────── */}
      {isActive && (
        <motion.span
          layoutId={layoutId}
          transition={transition}
          className={cn(
            "absolute inset-0 rounded-md",
            "bg-[var(--cv-bg-elevated)] shadow-sm"
          )}
          style={{ zIndex: -1 }}
        />
      )}
      {children}
    </button>
  );
}

/* ─── TabsContent ─────────────────────────────────────────────── */
export interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { activeValue, baseId } = useTabsContext();

  if (activeValue !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-trigger-${value}`}
      tabIndex={0}
      className={cn("mt-3 outline-none", className)}
    >
      {children}
    </div>
  );
}

export default Tabs;
