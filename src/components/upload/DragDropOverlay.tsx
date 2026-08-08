/**
 * DragDropOverlay.tsx — Full-panel overlay for drag-and-drop file upload.
 *
 * Shows a dashed-border overlay with upload icon + text when files
 * are dragged over the file list area.
 */

import { useState, useCallback, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Upload } from "lucide-react";
import { cn } from "../../lib/cn";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface DragDropOverlayProps {
  onDrop: (files: File[]) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function DragDropOverlay({
  onDrop,
  children,
  className,
  disabled = false,
}: DragDropOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const prefersReduced = useReducedMotion();

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current += 1;
      if (e.dataTransfer.types.includes("Files")) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) {
        setIsDragging(false);
      }
    },
    [disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
    },
    [disabled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);

      const droppedFiles: File[] = [];
      if (e.dataTransfer.files) {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          droppedFiles.push(e.dataTransfer.files[i]);
        }
      }

      if (droppedFiles.length > 0) {
        onDrop(droppedFiles);
      }
    },
    [onDrop, disabled]
  );

  return (
    <div
      className={cn("relative", className)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: prefersReduced ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.2 }}
            className={cn(
              "absolute inset-0 z-30 flex flex-col items-center justify-center gap-3",
              "rounded-xl border-2 border-dashed border-primary-400",
              "bg-primary-50/90 backdrop-blur-sm",
              "dark:border-primary-500 dark:bg-primary-950/90"
            )}
          >
            <motion.div
              initial={prefersReduced ? undefined : { y: 8, scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
                ...(prefersReduced ? { duration: 0 } : {}),
              }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/50">
                <Upload
                  size={24}
                  className="text-primary-600 dark:text-primary-400"
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                  Drop files to upload
                </p>
                <p className="mt-0.5 text-xs text-primary-600/70 dark:text-primary-400/60">
                  Files will be uploaded to the current folder
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DragDropOverlay;
