import { cn } from "../../lib/cn";

// ── Types ────────────────────────────────────────────────────────

type ProgressSize = "sm" | "md" | "lg";
type ProgressColor = "primary" | "success" | "warning" | "error";

interface ProgressBarProps {
  /** 0–100 for determinate; omit or pass `undefined` for indeterminate */
  value?: number;
  /** @default "md" */
  size?: ProgressSize;
  /** @default "primary" */
  color?: ProgressColor;
  /** Show percentage label above the bar */
  label?: boolean;
  className?: string;
}

// ── Size map ─────────────────────────────────────────────────────

const sizeStyles: Record<ProgressSize, string> = {
  sm: "h-1",
  md: "h-1.5",
  lg: "h-2",
};

// ── Color map ────────────────────────────────────────────────────

const colorStyles: Record<ProgressColor, string> = {
  primary: "bg-gradient-to-r from-primary-500 to-primary-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-rose-500",
};

// ── Indeterminate keyframe style tag ─────────────────────────────

const indeterminateKeyframes = `
@keyframes cv-progress-indeterminate {
  0% {
    transform: translateX(-100%);
    width: 40%;
  }
  50% {
    width: 60%;
  }
  100% {
    transform: translateX(200%);
    width: 40%;
  }
}
`;

// ── Component ────────────────────────────────────────────────────

export function ProgressBar({
  value,
  size = "md",
  color = "primary",
  label = false,
  className,
}: ProgressBarProps) {
  const isIndeterminate = value === undefined || value === null;
  const clampedValue = isIndeterminate ? 0 : Math.min(100, Math.max(0, value));

  return (
    <div className={cn("w-full", className)}>
      {/* Inject indeterminate keyframes */}
      {isIndeterminate && <style>{indeterminateKeyframes}</style>}

      {/* Label */}
      {label && !isIndeterminate && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--cv-text-secondary)]">
            Progress
          </span>
          <span className="text-xs font-semibold text-[var(--cv-text)]">
            {Math.round(clampedValue)}%
          </span>
        </div>
      )}

      {/* Track */}
      <div
        role="progressbar"
        aria-valuenow={isIndeterminate ? undefined : clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          "w-full overflow-hidden rounded-full bg-[var(--cv-bg-muted)]",
          sizeStyles[size]
        )}
      >
        {/* Bar */}
        {isIndeterminate ? (
          <div
            className={cn("h-full rounded-full", colorStyles[color])}
            style={{
              animation: "cv-progress-indeterminate 1.8s ease-in-out infinite",
            }}
          />
        ) : (
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500 ease-out",
              colorStyles[color]
            )}
            style={{ width: `${clampedValue}%` }}
          />
        )}
      </div>
    </div>
  );
}

export default ProgressBar;
