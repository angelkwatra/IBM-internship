import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";

// ── Card ─────────────────────────────────────────────────────────

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Enable hover lift + shadow animation */
  hoverable?: boolean;
  /** Render a skeleton placeholder */
  isLoading?: boolean;
  children?: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hoverable = false, isLoading = false, className, children, ...props }, ref) => {
    if (isLoading) {
      return (
        <div
          ref={ref}
          className={cn(
            "rounded-xl border border-[var(--cv-border)] overflow-hidden",
            "bg-[var(--cv-bg-elevated)]",
            className
          )}
          {...props}
        >
          {/* Skeleton header */}
          <div className="p-6 flex flex-col gap-3">
            <div className="cv-skeleton h-5 w-2/5 rounded-md" />
            <div className="cv-skeleton h-3 w-3/5 rounded-md" />
          </div>
          {/* Skeleton body */}
          <div className="px-6 pb-6 flex flex-col gap-2">
            <div className="cv-skeleton h-3 w-full rounded-md" />
            <div className="cv-skeleton h-3 w-4/5 rounded-md" />
            <div className="cv-skeleton h-3 w-3/5 rounded-md" />
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-[var(--cv-border)] overflow-hidden",
          "bg-[var(--cv-bg-elevated)]",
          "shadow-[var(--cv-shadow-sm)]",
          hoverable &&
            "transition-all duration-200 ease-out hover:shadow-[var(--cv-shadow-md)] hover:-translate-y-0.5",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

// ── CardHeader ───────────────────────────────────────────────────

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Render a bottom border on the header */
  bordered?: boolean;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ bordered = false, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "p-6 flex flex-col gap-1.5",
        bordered && "border-b border-[var(--cv-border)]",
        className
      )}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

// ── CardTitle ────────────────────────────────────────────────────

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold text-[var(--cv-text)]", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

// ── CardDescription ──────────────────────────────────────────────

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-[var(--cv-text-secondary)]", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

// ── CardContent ──────────────────────────────────────────────────

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("p-6", className)}
      {...props}
    />
  )
);
CardContent.displayName = "CardContent";

// ── CardFooter ───────────────────────────────────────────────────

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Render a top border on the footer */
  bordered?: boolean;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ bordered = false, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "p-6 pt-0 flex items-center gap-2",
        bordered && "border-t border-[var(--cv-border)] pt-6",
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";
