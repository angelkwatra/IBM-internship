import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional breadcrumb or subtitle area */
  breadcrumb?: ReactNode;
  /** Optional right-aligned action buttons */
  actions?: ReactNode;
  className?: string;
}

/**
 * PageHeader — Consistent header for every feature page.
 *
 * Renders a title + optional breadcrumb slot + optional right-aligned
 * actions slot. Feature modules plug their own content into these slots.
 */
export function PageHeader({
  title,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between",
        "pb-6",
        className
      )}
    >
      <div className="min-w-0">
        {breadcrumb && (
          <div className="mb-1 text-xs text-[var(--cv-text-muted)]">
            {breadcrumb}
          </div>
        )}
        <h1 className="truncate text-2xl font-semibold tracking-tight text-[var(--cv-text)]">
          {title}
        </h1>
      </div>

      {actions && (
        <div className="mt-3 flex shrink-0 items-center gap-2 sm:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
