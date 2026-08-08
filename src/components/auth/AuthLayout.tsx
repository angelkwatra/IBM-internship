import { type ReactNode } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Moon, Sun, Cloud } from "lucide-react";

/**
 * AuthLayout — Split-screen layout for all auth pages.
 *
 * Left 55%: form content on clean surface
 * Right 45%: decorative gradient mesh panel
 * Below 768px: panel hidden, form full-width
 */

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Left: Form Panel ────────────────────────────────────── */}
      <div className="relative flex w-full flex-col justify-center px-6 py-12 md:w-[55%] md:px-16 lg:px-24">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-[var(--cv-text-muted)] transition-colors hover:bg-[var(--cv-bg-muted)] hover:text-[var(--cv-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Logo */}
        <div className="mb-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 dark:bg-primary-500">
            <Cloud size={20} className="text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-[var(--cv-text)]">
            CloudVault
          </span>
        </div>

        {/* Form content */}
        <div className="w-full max-w-[420px]">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-auto pt-8 text-xs text-[var(--cv-text-muted)]">
          © {new Date().getFullYear()} CloudVault. All rights reserved.
        </p>
      </div>

      {/* ── Right: Decorative Panel ─────────────────────────────── */}
      <div className="relative hidden overflow-hidden md:block md:w-[45%]">
        <DecorativePanel />
      </div>
    </div>
  );
}

/* ─── Animated Gradient Mesh (CSS-only, respects reduced motion) ─ */
function DecorativePanel() {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-neutral-950 dark:bg-neutral-900">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Orb 1 */}
        <div
          className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full opacity-30 blur-[100px] motion-safe:animate-[cv-float1_20s_ease-in-out_infinite]"
          style={{
            background: "radial-gradient(circle, var(--color-primary-500) 0%, transparent 70%)",
          }}
        />
        {/* Orb 2 */}
        <div
          className="absolute -bottom-32 right-0 h-[400px] w-[400px] rounded-full opacity-25 blur-[80px] motion-safe:animate-[cv-float2_25s_ease-in-out_infinite]"
          style={{
            background: "radial-gradient(circle, var(--color-accent-500) 0%, transparent 70%)",
          }}
        />
        {/* Orb 3 */}
        <div
          className="absolute left-1/3 top-1/2 h-[300px] w-[300px] rounded-full opacity-20 blur-[60px] motion-safe:animate-[cv-float3_18s_ease-in-out_infinite]"
          style={{
            background: "radial-gradient(circle, var(--color-info) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Center content */}
      <div className="relative z-10 px-12 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <Cloud size={32} className="text-white/80" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          Your files, everywhere.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/50">
          Secure cloud storage with end-to-end encryption.
          <br />
          Access from any device, anytime.
        </p>

        {/* Floating feature pills */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {["End-to-end encrypted", "99.99% uptime", "Instant sync"].map((feature) => (
            <span
              key={feature}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 backdrop-blur-sm"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
