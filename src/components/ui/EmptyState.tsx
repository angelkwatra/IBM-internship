import type { ElementType } from "react";
import { cn } from "../../lib/cn";
import Button from "./Button";

// ── Types ────────────────────────────────────────────────────────

interface EmptyStateProps {
  /** Icon component (e.g. a lucide-react icon) – rendered at 48×48 */
  icon: ElementType;
  /** Headline */
  title: string;
  /** Supporting copy */
  description: string;
  /** Label for the optional CTA button */
  actionLabel?: string;
  /** Click handler for the CTA button */
  onAction?: () => void;
  className?: string;
}

// ── Component ────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center py-16",
        className
      )}
    >
      {/* Icon */}
      <div className="flex items-center justify-center">
        <Icon
          className="text-[var(--cv-text-muted)]"
          style={{ width: 48, height: 48 }}
          strokeWidth={1.5}
          aria-hidden
        />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-[var(--cv-text)] mt-4">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-[var(--cv-text-muted)] mt-2 max-w-sm">
        {description}
      </p>

      {/* CTA */}
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default EmptyState;
