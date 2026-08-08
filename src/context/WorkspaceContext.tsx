import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

import { getStorageUsed } from "../services/fileService";

// ── Types ────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  type: "personal" | "team";
  memberCount?: number;
}

interface WorkspaceContextValue {
  /* Sidebar */
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (v: boolean) => void;

  /* Workspaces */
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  setCurrentWorkspace: (ws: Workspace) => void;

  /* Storage */
  storageUsed: number;
  refreshStorageUsed: () => Promise<void>;
}

// ── Mock data ────────────────────────────────────────────────────

const defaultWorkspaces: Workspace[] = [
  { id: "ws_personal", name: "My Drive", type: "personal" },
];

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined
);

// ── Provider ─────────────────────────────────────────────────────

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [workspaces] = useState<Workspace[]>(defaultWorkspaces);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace>(
    defaultWorkspaces[0]
  );
  const [storageUsed, setStorageUsed] = useState(0);

  const refreshStorageUsed = useCallback(async () => {
    try {
      const used = await getStorageUsed(currentWorkspace.id);
      setStorageUsed(used);
    } catch {
      // Ignore
    }
  }, [currentWorkspace.id]);

  useEffect(() => {
    refreshStorageUsed();
  }, [currentWorkspace.id, refreshStorageUsed]);

  // Auto-collapse sidebar below 1024px
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");

    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setSidebarCollapsed(e.matches);
    };

    // Set initial value
    handler(mq);

    mq.addEventListener("change", handler as (e: MediaQueryListEvent) => void);
    return () =>
      mq.removeEventListener(
        "change",
        handler as (e: MediaQueryListEvent) => void
      );
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const setCurrentWorkspace = useCallback((ws: Workspace) => {
    if (ws.id === "ws_personal") {
      setCurrentWorkspaceState(ws);
    }
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        isSidebarCollapsed,
        toggleSidebar,
        setSidebarCollapsed,
        isMobileSidebarOpen,
        setMobileSidebarOpen,
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        storageUsed,
        refreshStorageUsed,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
