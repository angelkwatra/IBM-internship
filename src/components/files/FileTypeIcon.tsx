/**
 * FileTypeIcon.tsx — Maps file types to colored lucide icons.
 */

import {
  Folder,
  FileText,
  Image,
  Film,
  FileArchive,
  Sheet,
  File,
} from "lucide-react";
import { cn } from "../../lib/cn";
import type { FileItemType } from "../../services/fileService";

interface FileTypeIconProps {
  type: FileItemType;
  size?: number;
  className?: string;
}

const iconConfig: Record<
  FileItemType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  folder: {
    icon: Folder,
    color: "text-primary-500",
    bg: "bg-primary-50 dark:bg-primary-950/30",
  },
  pdf: {
    icon: FileText,
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/30",
  },
  image: {
    icon: Image,
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/30",
  },
  video: {
    icon: Film,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  archive: {
    icon: FileArchive,
    color: "text-teal-500",
    bg: "bg-teal-50 dark:bg-teal-950/30",
  },
  document: {
    icon: FileText,
    color: "text-sky-500",
    bg: "bg-sky-50 dark:bg-sky-950/30",
  },
  spreadsheet: {
    icon: Sheet,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  other: {
    icon: File,
    color: "text-neutral-400",
    bg: "bg-neutral-100 dark:bg-neutral-800",
  },
};

export function FileTypeIcon({ type, size = 20, className }: FileTypeIconProps) {
  const config = iconConfig[type] ?? iconConfig.other;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg",
        config.bg,
        className
      )}
      style={{ width: size + 16, height: size + 16 }}
    >
      <Icon size={size} className={config.color} />
    </div>
  );
}

/** Inline icon only (no background wrapper). */
export function FileTypeIconInline({
  type,
  size = 16,
  className,
}: FileTypeIconProps) {
  const config = iconConfig[type] ?? iconConfig.other;
  const Icon = config.icon;
  return <Icon size={size} className={cn(config.color, className)} />;
}

export default FileTypeIcon;
