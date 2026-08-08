import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";
import AuthLayout from "../../components/auth/AuthLayout";
import PasswordInput from "../../components/auth/PasswordInput";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/ToastProvider";
import { validateEmail } from "../../lib/validation";
import { cn } from "../../lib/utils";

export default function LoginPage() {
  const { login, isLoading, loginAttempts, lockoutUntil, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [serverError, setServerError] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [lockoutCountdown, setLockoutCountdown] = useState(0);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockoutUntil) {
      setLockoutCountdown(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutCountdown(remaining);
      if (remaining <= 0) {
        setLockoutCountdown(0);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const errors = {
    email:
      touched.email && !email
        ? "Email is required"
        : touched.email && !validateEmail(email)
          ? "Enter a valid email address"
          : "",
    password: touched.password && !password ? "Password is required" : "",
  };

  const isValid = validateEmail(email) && password.length > 0;
  const isLockedOut = lockoutCountdown > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setServerError("");

    if (!isValid || isLockedOut) return;

    try {
      await login(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setServerError(message);

      // Show toast on network-type errors
      if (message.includes("Network") || message.includes("fetch")) {
        toast.error("Connection error", "Please check your connection and try again.");
      }
    }
  };

  return (
    <AuthLayout>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cv-text)]">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-[var(--cv-text-secondary)]">
          Sign in to your CloudVault account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        {/* Server / lockout error */}
        <AnimatePresence>
          {(serverError || isLockedOut) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                role="alert"
                aria-live="polite"
                className={cn(
                  "rounded-lg border px-4 py-3 text-sm",
                  isLockedOut
                    ? "border-warning/20 bg-warning/5 text-[var(--color-warning-dark)] dark:text-[var(--color-warning)]"
                    : "border-error/20 bg-error/5 text-error"
                )}
              >
                {isLockedOut ? (
                  <>
                    Account temporarily locked. Try again in{" "}
                    <span className="font-semibold">{lockoutCountdown}s</span>
                  </>
                ) : (
                  serverError
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attempt counter (non-zero, not locked) */}
        {loginAttempts > 0 && loginAttempts < 5 && !isLockedOut && (
          <p className="text-xs text-[var(--cv-text-muted)]">
            {5 - loginAttempts} attempt{5 - loginAttempts !== 1 ? "s" : ""} remaining
          </p>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="block text-sm font-medium text-[var(--cv-text)]">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, email: true }))}
            placeholder="jane@example.com"
            autoComplete="email"
            disabled={isLockedOut}
            className={cn(
              "flex h-9 w-full rounded-lg border bg-[var(--cv-bg-subtle)] px-3 text-sm text-[var(--cv-text)] placeholder:text-[var(--cv-text-muted)] transition-colors focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50",
              errors.email
                ? "border-error focus:border-error focus:ring-error"
                : "border-[var(--cv-border)]"
            )}
          />
          {errors.email && (
            <p role="alert" aria-live="polite" className="text-xs text-error">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <PasswordInput
          label="Password"
          id="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, password: true }))}
          placeholder="Enter your password"
          autoComplete="current-password"
          disabled={isLockedOut}
          error={errors.password}
        />

        {/* Remember me + Forgot */}
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--cv-text-secondary)]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--cv-border)] text-primary-600 focus:ring-primary-500"
            />
            Remember me
          </label>

          <Link
            to="/forgot-password"
            className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!isValid || isLoading || isLockedOut}
          className={cn(
            "flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 text-sm font-medium text-white transition-all hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 dark:bg-primary-500 dark:hover:bg-primary-400",
            (!isValid || isLoading || isLockedOut) && "cursor-not-allowed opacity-50"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      {/* Register link */}
      <p className="mt-6 text-center text-sm text-[var(--cv-text-secondary)]">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
