import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { AnimatePresence } from "motion/react";
import { Toast, type ToastData, type ToastVariant } from "./Toast";
import { cn } from "../../lib/cn";

/* ─── Context types ───────────────────────────────────────────── */
type AddToastPayload = Omit<ToastData, "id" | "duration"> & {
  duration?: number;
};

interface ToastContextValue {
  addToast: (toast: AddToastPayload) => void;
}

interface ToastApi {
  toast: {
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

/* ─── Default duration ────────────────────────────────────────── */
const DEFAULT_DURATION = 5000;

/* ─── Provider ────────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  /* Clean up all timers on unmount */
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (payload: AddToastPayload) => {
      const id = crypto.randomUUID();
      const duration = payload.duration ?? DEFAULT_DURATION;

      const toast: ToastData = { ...payload, id, duration };
      setToasts((prev) => [...prev, toast]);

      // Auto-dismiss
      const timer = setTimeout(() => {
        removeToast(id);
      }, duration);
      timersRef.current.set(id, timer);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* ── Toast container ──────────────────────────────────── */}
      <div
        aria-live="polite"
        className={cn(
          "fixed right-4 top-4 z-50 flex flex-col gap-2",
          "pointer-events-none"
        )}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <Toast key={t.id} {...t} onDismiss={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/* ─── Hook ────────────────────────────────────────────────────── */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);

  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }

  const { addToast } = ctx;

  return React.useMemo(() => {
    const createMethod =
      (variant: ToastVariant) =>
      (title: string, message?: string, duration?: number) =>
        addToast({ variant, title, message, duration });

    return {
      toast: {
        success: createMethod("success"),
        error: createMethod("error"),
        warning: createMethod("warning"),
        info: createMethod("info"),
      },
    };
  }, [addToast]);
}

export default ToastProvider;
