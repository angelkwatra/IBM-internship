import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import AuthLayout from "../../components/auth/AuthLayout";
import PasswordInput from "../../components/auth/PasswordInput";
import SuccessCheckmark from "../../components/auth/SuccessCheckmark";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/ToastProvider";
import { passwordRequirements } from "../../lib/validation";
import { cn } from "../../lib/utils";

type Step = "form" | "success" | "expired";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const { resetPassword, isLoading } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(token ? "form" : "expired");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState({ password: false, confirmPassword: false });

  const errors = {
    password:
      touched.password && !passwordRequirements.every((r) => r.test(password))
        ? "Password doesn't meet requirements"
        : "",
    confirmPassword:
      touched.confirmPassword && password !== confirmPassword
        ? "Passwords don't match"
        : "",
  };

  const isValid =
    passwordRequirements.every((r) => r.test(password)) &&
    password === confirmPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ password: true, confirmPassword: true });
    if (!isValid) return;

    try {
      await resetPassword(token, password);
      setStep("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "EXPIRED_TOKEN") {
        setStep("expired");
      } else {
        toast.error("Reset failed", "Please try again later.");
      }
    }
  };

  return (
    <AuthLayout>
      <AnimatePresence mode="wait">
        {step === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <Link
              to="/login"
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--cv-text-muted)] transition-colors hover:text-[var(--cv-text)]"
            >
              <ArrowLeft size={14} />
              Back to login
            </Link>

            <h1 className="text-2xl font-semibold tracking-tight text-[var(--cv-text)]">
              Set a new password
            </h1>
            <p className="mt-2 text-sm text-[var(--cv-text-secondary)]">
              Choose a strong password for your account.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
              <PasswordInput
                label="New password"
                id="reset-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                placeholder="Create a strong password"
                autoComplete="new-password"
                showStrength
                showRequirements
                error={errors.password}
              />

              <PasswordInput
                label="Confirm new password"
                id="reset-confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                error={errors.confirmPassword}
              />

              <button
                type="submit"
                disabled={!isValid || isLoading}
                className={cn(
                  "flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 text-sm font-medium text-white transition-all hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 dark:bg-primary-500 dark:hover:bg-primary-400",
                  (!isValid || isLoading) && "cursor-not-allowed opacity-50"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Resetting…
                  </>
                ) : (
                  "Reset password"
                )}
              </button>
            </form>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            <SuccessCheckmark size={48} />

            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-[var(--cv-text)]">
              Password updated
            </h1>
            <p className="mt-2 text-sm text-[var(--cv-text-secondary)]">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>

            <Link
              to="/login"
              className="mt-8 flex h-10 items-center justify-center rounded-lg bg-primary-600 px-6 text-sm font-medium text-white transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
            >
              Sign in
            </Link>
          </motion.div>
        )}

        {step === "expired" && (
          <motion.div
            key="expired"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
              <AlertCircle size={32} className="text-error" />
            </div>

            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-[var(--cv-text)]">
              Link expired
            </h1>
            <p className="mt-2 max-w-xs text-sm text-[var(--cv-text-secondary)]">
              This password reset link has expired or is invalid.
              Please request a new one.
            </p>

            <Link
              to="/forgot-password"
              className="mt-8 flex h-10 items-center justify-center rounded-lg bg-primary-600 px-6 text-sm font-medium text-white transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
            >
              Request a new link
            </Link>

            <Link
              to="/login"
              className="mt-3 text-sm text-[var(--cv-text-muted)] transition-colors hover:text-[var(--cv-text)]"
            >
              Back to login
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
