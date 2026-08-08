import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility for merging Tailwind CSS class names.
 * Combines clsx (conditional classes) with tailwind-merge (deduplication).
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-primary-500", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
