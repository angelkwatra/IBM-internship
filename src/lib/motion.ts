import type { Variants, Transition } from "motion/react";

/**
 * Shared animation presets for CloudVault.
 * Each preset includes a reduced-motion fallback (instant, no transform).
 */

// ── Shared transitions ──────────────────────────────────────────
const springGentle: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 25,
};

const easeOutExpo: Transition = {
  ease: [0.16, 1, 0.3, 1],
  duration: 0.35,
};

// ── Button press ────────────────────────────────────────────────
export const buttonPressVariants: Variants = {
  idle: { scale: 1 },
  pressed: { scale: 0.97 },
};

export const buttonTransition: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

// ── Modal ───────────────────────────────────────────────────────
export const modalOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 8 },
};

export const modalTransition: Transition = {
  ...easeOutExpo,
  duration: 0.25,
};

// ── Toast ───────────────────────────────────────────────────────
export const toastVariants: Variants = {
  hidden: { opacity: 0, x: 80, scale: 0.95 },
  visible: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 80, scale: 0.95 },
};

export const toastTransition: Transition = springGentle;

// ── Fade In ─────────────────────────────────────────────────────
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const fadeInTransition: Transition = {
  duration: 0.2,
};

// ── Slide + Fade (for onboarding steps) ─────────────────────────
export const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
  }),
};

export const slideTransition: Transition = easeOutExpo;

// ── Dropdown ────────────────────────────────────────────────────
export const dropdownVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -4 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: -4 },
};

export const dropdownTransition: Transition = {
  duration: 0.15,
  ease: [0.16, 1, 0.3, 1],
};

// ── Reduced motion: wipe all transforms ─────────────────────────
export const reducedMotionTransition: Transition = {
  duration: 0,
};

export function getTransition(
  preferred: Transition,
  prefersReduced: boolean
): Transition {
  return prefersReduced ? reducedMotionTransition : preferred;
}
