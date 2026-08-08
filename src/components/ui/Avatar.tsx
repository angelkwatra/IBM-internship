import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/cn";
import { fadeInTransition } from "../../lib/motion";
import { useReducedMotion } from "../../hooks/useReducedMotion";

// ── Types ────────────────────────────────────────────────────────

type AvatarSize = "sm" | "md" | "lg" | "xl";
type AvatarStatus = "online" | "offline" | "away" | "busy";

interface AvatarProps {
  /** Image source URL */
  src?: string;
  /** Alt text for the image */
  alt: string;
  /** Full name – used for fallback initials and hue generation */
  name: string;
  /** @default "md" */
  size?: AvatarSize;
  /** Optional status indicator dot */
  status?: AvatarStatus;
  className?: string;
}

// ── Size config ──────────────────────────────────────────────────

const sizeMap: Record<AvatarSize, { container: number; text: string; dot: number; ring: number }> = {
  sm: { container: 32, text: "text-xs", dot: 8, ring: 2 },
  md: { container: 40, text: "text-sm", dot: 10, ring: 2 },
  lg: { container: 48, text: "text-base", dot: 12, ring: 2 },
  xl: { container: 64, text: "text-lg", dot: 14, ring: 3 },
};

// ── Status colors ────────────────────────────────────────────────

const statusColorMap: Record<AvatarStatus, string> = {
  online: "bg-emerald-500",
  offline: "bg-neutral-400",
  away: "bg-amber-500",
  busy: "bg-rose-500",
};

// ── Helpers ──────────────────────────────────────────────────────

/** Simple string hash → hue (0–360) for deterministic avatar colors */
function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

/** Extract up-to-2-character initials from a name */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Component ────────────────────────────────────────────────────

export function Avatar({
  src,
  alt,
  name,
  size = "md",
  status,
  className,
}: AvatarProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const prefersReduced = useReducedMotion();

  const config = sizeMap[size];
  const hue = useMemo(() => nameToHue(name), [name]);
  const initials = useMemo(() => getInitials(name), [name]);
  const showImage = Boolean(src) && !imgError;

  return (
    <div
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: config.container, height: config.container }}
    >
      {/* Fallback circle with initials */}
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-semibold text-white select-none",
          config.text
        )}
        style={{
          width: config.container,
          height: config.container,
          backgroundColor: `hsl(${hue}, 55%, 50%)`,
        }}
        aria-hidden={showImage}
      >
        {initials}
      </div>

      {/* Image layer */}
      {showImage && (
        <>
          {/* Skeleton while loading */}
          {!imgLoaded && (
            <div
              className="cv-skeleton absolute inset-0 rounded-full"
              style={{ width: config.container, height: config.container }}
            />
          )}

          <AnimatePresence>
            {imgLoaded && (
              <motion.img
                key="avatar-img"
                src={src}
                alt={alt}
                initial={{ opacity: prefersReduced ? 1 : 0 }}
                animate={{ opacity: 1 }}
                transition={prefersReduced ? { duration: 0 } : fadeInTransition}
                className="absolute inset-0 rounded-full object-cover"
                style={{ width: config.container, height: config.container }}
              />
            )}
          </AnimatePresence>

          {/* Hidden image to trigger load/error */}
          <img
            src={src}
            alt=""
            aria-hidden
            className="sr-only"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        </>
      )}

      {/* Status dot */}
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-white dark:border-neutral-900",
            statusColorMap[status]
          )}
          style={{
            width: config.dot,
            height: config.dot,
            borderWidth: config.ring,
          }}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}

export default Avatar;
