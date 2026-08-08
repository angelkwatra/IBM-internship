/**
 * Breadcrumb.tsx — Dynamic collapsible breadcrumb for file navigation.
 *
 * Collapses middle segments into "..." when deeper than 3 levels.
 * Each segment is a clickable link using react-router navigation.
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "../../lib/cn";
import type { BreadcrumbSegment } from "../../services/fileService";

interface BreadcrumbProps {
  segments: BreadcrumbSegment[];
  className?: string;
}

export function Breadcrumb({ segments, className }: BreadcrumbProps) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const handleNavigate = (segment: BreadcrumbSegment) => {
    if (segment.id === null) {
      navigate("/app/files");
    } else {
      navigate(`/app/files/${segment.id}`);
    }
  };

  // Decide which segments to show
  const MAX_VISIBLE = 3;
  const shouldCollapse = segments.length > MAX_VISIBLE;

  let visibleSegments: BreadcrumbSegment[];
  let collapsedSegments: BreadcrumbSegment[] = [];

  if (shouldCollapse) {
    // Show first (Home), "...", and last two
    const first = segments[0];
    const lastTwo = segments.slice(-2);
    collapsedSegments = segments.slice(1, -2);
    visibleSegments = [first, { id: "__collapsed__", name: "..." }, ...lastTwo];
  } else {
    visibleSegments = segments;
  }

  return (
    <nav aria-label="File breadcrumb" className={cn("flex items-center gap-1 text-xs", className)}>
      {visibleSegments.map((segment, index) => {
        const isLast = index === visibleSegments.length - 1;
        const isCollapsed = segment.id === "__collapsed__";

        return (
          <span key={segment.id ?? "home"} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight
                size={12}
                className="shrink-0 text-[var(--cv-text-muted)]"
                aria-hidden
              />
            )}

            {isCollapsed ? (
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={cn(
                    "flex items-center justify-center rounded px-1 py-0.5",
                    "text-[var(--cv-text-muted)] transition-colors",
                    "hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)]"
                  )}
                  aria-label="Show hidden breadcrumb segments"
                >
                  <MoreHorizontal size={14} />
                </button>

                {dropdownOpen && (
                  <div
                    className={cn(
                      "absolute left-0 top-full z-50 mt-1 min-w-[160px]",
                      "rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)]",
                      "p-1 shadow-[var(--cv-shadow-lg)]"
                    )}
                  >
                    {collapsedSegments.map((seg) => (
                      <button
                        key={seg.id}
                        onClick={() => {
                          setDropdownOpen(false);
                          handleNavigate(seg);
                        }}
                        className={cn(
                          "flex w-full items-center rounded-md px-2 py-1.5 text-xs",
                          "text-[var(--cv-text)] transition-colors",
                          "hover:bg-[var(--cv-bg-muted)]"
                        )}
                      >
                        {seg.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : isLast ? (
              <span className="font-medium text-[var(--cv-text-secondary)]">
                {segment.name}
              </span>
            ) : (
              <button
                onClick={() => handleNavigate(segment)}
                className={cn(
                  "rounded px-1 py-0.5 text-[var(--cv-text-muted)]",
                  "transition-colors hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)]"
                )}
              >
                {segment.name}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default Breadcrumb;
