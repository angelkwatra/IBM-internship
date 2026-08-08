import { Outlet } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import { WorkspaceProvider, useWorkspace } from "../../context/WorkspaceContext";
import { UploadProvider } from "../../context/UploadContext";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { ErrorBoundary } from "../ErrorBoundary";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { UploadManager } from "../../components/upload/UploadManager";

/**
 * AppShell — Main application layout wrapping all authenticated pages.
 *
 * Structure: Sidebar | TopBar + Outlet
 * Mobile: sidebar becomes a bottom-sheet drawer via hamburger trigger.
 *
 * UploadProvider is mounted here so upload state persists across
 * route navigation (Dashboard, Files, Shared, etc.).
 */
function ShellInner() {
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useWorkspace();
  const prefersReduced = useReducedMotion();

  return (
    <UploadProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[var(--cv-bg)]">
        {/* ── Desktop Sidebar ─────────────────────────────────────── */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* ── Mobile Sidebar Drawer ───────────────────────────────── */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
                initial={{ opacity: prefersReduced ? 1 : 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReduced ? 0 : 0.2 }}
                onClick={() => setMobileSidebarOpen(false)}
              />

              {/* Drawer */}
              <motion.div
                className="fixed inset-y-0 left-0 z-50 w-[280px] md:hidden"
                initial={prefersReduced ? undefined : { x: "-100%" }}
                animate={{ x: 0 }}
                exit={prefersReduced ? undefined : { x: "-100%" }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 35,
                  ...(prefersReduced ? { duration: 0 } : {}),
                }}
              >
                <div className="relative h-full">
                  <Sidebar />
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    aria-label="Close navigation"
                    className={cn(
                      "absolute right-2 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md",
                      "text-[var(--cv-text-muted)] transition-colors",
                      "hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)]"
                    )}
                  >
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Main Content ────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>

      {/* ── Upload Manager (persists across routes) ────────────────── */}
      <UploadManager />
    </UploadProvider>
  );
}

export function AppShell() {
  return (
    <WorkspaceProvider>
      <ShellInner />
    </WorkspaceProvider>
  );
}

export default AppShell;
