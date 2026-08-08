import { NavLink } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Trash2,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Zap,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useAuth } from "../../context/AuthContext";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { Avatar } from "../ui/Avatar";
import { ProgressBar } from "../ui/ProgressBar";

// ── Nav items ────────────────────────────────────────────────────

const primaryNav = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/files", label: "My Files", icon: FolderOpen },
  { to: "/app/shared", label: "Shared with me", icon: Users },
  { to: "/app/trash", label: "Trash", icon: Trash2 },
  { to: "/app/storage", label: "Storage Analytics", icon: BarChart3 },
];

const secondaryNav = [
  { to: "/app/settings", label: "Settings", icon: Settings },
  { to: "/app/help", label: "Help", icon: HelpCircle },
];

// ── Component ────────────────────────────────────────────────────

export function Sidebar() {
  const {
    isSidebarCollapsed,
    toggleSidebar,
    currentWorkspace,
    storageUsed,
  } = useWorkspace();
  const { user } = useAuth();
  const prefersReduced = useReducedMotion();
  const collapsed = isSidebarCollapsed;

  const storageUsedGB = storageUsed / (1024 * 1024 * 1024);
  const storageTotal = 15;
  const storagePercent = Math.min(100, (storageUsedGB / storageTotal) * 100);

  return (
    <>
      <nav
        aria-label="Main navigation"
        className={cn(
          "relative flex h-full flex-col border-r border-[var(--cv-border)] bg-[var(--cv-bg-subtle)]",
          "transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          collapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        {/* ── Workspace Switcher (Flat / Non-interactive) ───────── */}
        <div className="border-b border-[var(--cv-border)] p-3">
          <div
            className={cn(
              "flex w-full items-center gap-3 rounded-lg p-2",
              collapsed && "justify-center"
            )}
          >
            <Avatar
              name={currentWorkspace.name}
              alt={currentWorkspace.name}
              size="sm"
            />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--cv-text)]">
                  {currentWorkspace.name}
                </p>
                <p className="text-[10px] capitalize text-[var(--cv-text-muted)]">
                  {currentWorkspace.type}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Primary Nav ─────────────────────────────────────── */}
        <div className="flex-1 space-y-1 overflow-y-auto p-3">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300"
                      : "text-[var(--cv-text-secondary)] hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)]",
                    collapsed && "justify-center px-0"
                  )
                }
                aria-current={undefined}
                end={item.to === "/app/dashboard"}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={18}
                      className={cn(
                        "shrink-0",
                        isActive
                          ? "text-primary-600 dark:text-primary-400"
                          : "text-[var(--cv-text-muted)] group-hover:text-[var(--cv-text-secondary)]"
                      )}
                    />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={
                            prefersReduced ? undefined : { opacity: 0, width: 0 }
                          }
                          animate={{ opacity: 1, width: "auto" }}
                          exit={
                            prefersReduced ? undefined : { opacity: 0, width: 0 }
                          }
                          transition={{ duration: prefersReduced ? 0 : 0.15 }}
                          className="truncate"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* ── Bottom Section ───────────────────────────────────── */}
        <div className="space-y-2 border-t border-[var(--cv-border)] p-3">
          {/* Storage usage */}
          <NavLink
            to="/app/storage"
            className={cn(
              "block rounded-lg p-2 transition-colors hover:bg-[var(--cv-bg-muted)]",
              collapsed && "px-1"
            )}
          >
            {collapsed ? (
              <div className="flex justify-center">
                <BarChart3
                  size={16}
                  className="text-[var(--cv-text-muted)]"
                />
              </div>
            ) : (
              <>
                <ProgressBar
                  value={storagePercent}
                  size="sm"
                  color={storagePercent > 90 ? "warning" : "primary"}
                />
                <p className="mt-1.5 text-[10px] text-[var(--cv-text-muted)]">
                  {storageUsedGB.toFixed(1)} GB of {storageTotal} GB used
                </p>
              </>
            )}
          </NavLink>

          {/* Upgrade card (free plan only) */}
          {user?.plan === "free" && !collapsed && (
            <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 dark:border-primary-800/30 dark:bg-primary-950/20">
              <div className="flex items-center gap-2">
                <Zap
                  size={14}
                  className="text-primary-600 dark:text-primary-400"
                />
                <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                  Upgrade to Pro
                </span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-primary-600/80 dark:text-primary-400/70">
                Unlock 1 TB storage, priority support, and advanced sharing.
              </p>
            </div>
          )}

          {/* Secondary nav */}
          {secondaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300"
                      : "text-[var(--cv-text-secondary)] hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)]",
                    collapsed && "justify-center px-0"
                  )
                }
              >
                <Icon
                  size={18}
                  className="shrink-0 text-[var(--cv-text-muted)]"
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={
                        prefersReduced ? undefined : { opacity: 0, width: 0 }
                      }
                      animate={{ opacity: 1, width: "auto" }}
                      exit={
                        prefersReduced ? undefined : { opacity: 0, width: 0 }
                      }
                      transition={{ duration: prefersReduced ? 0 : 0.15 }}
                      className="truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
        </div>

        {/* ── Collapse toggle ──────────────────────────────────── */}
        <button
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center",
            "rounded-full border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]",
            "text-[var(--cv-text-muted)] shadow-sm transition-colors",
            "hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)]",
            "hidden md:flex"
          )}
        >
          {collapsed ? (
            <ChevronRight size={12} />
          ) : (
            <ChevronLeft size={12} />
          )}
        </button>
      </nav>
    </>
  );
}

export default Sidebar;
