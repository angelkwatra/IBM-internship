import { cn } from "../../lib/utils";

interface SuccessCheckmarkProps {
  size?: number;
  className?: string;
}

/**
 * Animated checkmark icon using SVG stroke-dasharray animation.
 * The check path "draws itself in" on mount.
 * Reduced motion: shows instantly without animation (via CSS).
 */
export default function SuccessCheckmark({
  size = 64,
  className,
}: SuccessCheckmarkProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-[var(--color-success-light)] dark:bg-emerald-900/30",
        className
      )}
      style={{ width: size * 1.5, height: size * 1.5 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 52 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Circle */}
        <circle
          cx="26"
          cy="26"
          r="23"
          stroke="var(--color-success)"
          strokeWidth="3"
          fill="none"
          className="cv-draw-check"
          style={{
            strokeDasharray: 150,
            strokeDashoffset: 150,
            animationDelay: "0s",
          }}
        />
        {/* Checkmark */}
        <path
          d="M15 27l7 7 15-16"
          stroke="var(--color-success)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="cv-draw-check"
          style={{
            strokeDasharray: 50,
            strokeDashoffset: 50,
            animationDelay: "0.3s",
          }}
        />
      </svg>
    </div>
  );
}
