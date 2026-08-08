import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useId,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../lib/cn";
import { getTransition } from "../../lib/motion";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/* ─── Types ───────────────────────────────────────────────────── */
export type TooltipPlacement = "top" | "right" | "bottom" | "left";

export interface TooltipProps {
  content: React.ReactNode;
  placement?: TooltipPlacement;
  delay?: number;
  children: React.ReactElement;
  className?: string;
}

/* ─── Offset from trigger (px) ────────────────────────────────── */
const OFFSET = 8;

/* ─── Arrow styles per placement ──────────────────────────────── */
const arrowStyles: Record<TooltipPlacement, string> = {
  top: "bottom-[-4px] left-1/2 -translate-x-1/2 rotate-45",
  bottom: "top-[-4px] left-1/2 -translate-x-1/2 rotate-45",
  left: "right-[-4px] top-1/2 -translate-y-1/2 rotate-45",
  right: "left-[-4px] top-1/2 -translate-y-1/2 rotate-45",
};

/* ─── Component ───────────────────────────────────────────────── */
export function Tooltip({
  content,
  placement = "top",
  delay = 200,
  children,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const triggerRef = useRef<HTMLElement | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();
  const prefersReduced = useReducedMotion();

  const transition = getTransition({ duration: 0.15 }, prefersReduced);

  /* ── Calculate position based on trigger rect ──────────────── */
  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    let top = 0;
    let left = 0;

    switch (placement) {
      case "top":
        top = rect.top + scrollY - OFFSET;
        left = rect.left + scrollX + rect.width / 2;
        break;
      case "bottom":
        top = rect.bottom + scrollY + OFFSET;
        left = rect.left + scrollX + rect.width / 2;
        break;
      case "left":
        top = rect.top + scrollY + rect.height / 2;
        left = rect.left + scrollX - OFFSET;
        break;
      case "right":
        top = rect.top + scrollY + rect.height / 2;
        left = rect.right + scrollX + OFFSET;
        break;
    }

    setCoords({ top, left });
  }, [placement]);

  /* ── Show / hide handlers ──────────────────────────────────── */
  const show = useCallback(() => {
    showTimer.current = setTimeout(() => {
      updatePosition();
      setIsVisible(true);
    }, delay);
  }, [delay, updatePosition]);

  const hide = useCallback(() => {
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    setIsVisible(false);
  }, []);

  /* ── Cleanup timer on unmount ──────────────────────────────── */
  useEffect(() => {
    return () => {
      if (showTimer.current) clearTimeout(showTimer.current);
    };
  }, []);

  /* ── Transform origin per placement ────────────────────────── */
  const transformMap: Record<TooltipPlacement, string> = {
    top: "translateX(-50%) translateY(-100%)",
    bottom: "translateX(-50%)",
    left: "translateY(-50%) translateX(-100%)",
    right: "translateY(-50%)",
  };

  /* ── Clone child to attach ref + handlers ──────────────────── */
  const childProps = children.props as Record<string, unknown>;

  const child = React.cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      // Forward ref if child has one
      const childRef = (children as React.RefAttributes<HTMLElement>).ref;
      if (typeof childRef === "function") {
        childRef(node);
      } else if (childRef && typeof childRef === "object") {
        (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      show();
      if (typeof childProps.onMouseEnter === "function") childProps.onMouseEnter(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hide();
      if (typeof childProps.onMouseLeave === "function") childProps.onMouseLeave(e);
    },
    onFocus: (e: React.FocusEvent) => {
      show();
      if (typeof childProps.onFocus === "function") childProps.onFocus(e);
    },
    onBlur: (e: React.FocusEvent) => {
      hide();
      if (typeof childProps.onBlur === "function") childProps.onBlur(e);
    },
    "aria-describedby": isVisible ? tooltipId : undefined,
  } as Record<string, unknown>);

  return (
    <>
      {child}

      {createPortal(
        <AnimatePresence>
          {isVisible && (
            <motion.div
              id={tooltipId}
              role="tooltip"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={transition}
              style={{
                position: "absolute",
                top: coords.top,
                left: coords.left,
                transform: transformMap[placement],
                zIndex: 9999,
                pointerEvents: "none",
              }}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium shadow-md",
                "bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900",
                "whitespace-nowrap",
                className
              )}
            >
              {content}

              {/* ── Arrow / caret ────────────────────────────── */}
              <span
                className={cn(
                  "absolute h-2 w-2",
                  "bg-neutral-900 dark:bg-neutral-200",
                  arrowStyles[placement]
                )}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

export default Tooltip;
