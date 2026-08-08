import React from "react";
import { cn } from "../../lib/cn";

// ── Types ────────────────────────────────────────────────────────
export interface SkeletonProps {
  /** Shape variant */
  variant?: "rectangular" | "circular" | "text";
  /** Explicit width (CSS value) */
  width?: string | number;
  /** Explicit height (CSS value) */
  height?: string | number;
  /** Number of skeleton lines to render (only applies to `text` variant) */
  count?: number;
  /** Additional class names */
  className?: string;
}

// ── Component ────────────────────────────────────────────────────
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "rectangular",
  width,
  height,
  count = 1,
  className,
}) => {
  const style: React.CSSProperties = {
    ...(width != null && { width: typeof width === "number" ? `${width}px` : width }),
    ...(height != null && { height: typeof height === "number" ? `${height}px` : height }),
  };

  // Variant-specific classes
  const variantClasses: Record<string, string> = {
    rectangular: "rounded-lg",
    circular: "rounded-full",
    text: "h-4 w-full rounded",
  };

  // Text variant with count > 1 → render multiple lines
  if (variant === "text" && count > 1) {
    return (
      <div className="flex flex-col gap-2" role="status" aria-label="Loading">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "cv-skeleton",
              variantClasses.text,
              // Last line is shorter to look natural
              i === count - 1 && "w-3/4",
              className,
            )}
            style={style}
            aria-hidden="true"
          />
        ))}
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  return (
    <div
      className={cn("cv-skeleton", variantClasses[variant], className)}
      style={style}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading…</span>
    </div>
  );
};

Skeleton.displayName = "Skeleton";
export default Skeleton;
