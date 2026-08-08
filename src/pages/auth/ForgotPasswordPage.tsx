import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, ArrowLeft } from "lucide-react";
import AuthLayout from "../../components/auth/AuthLayout";
import SuccessCheckmark from "../../components/auth/SuccessCheckmark";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/ToastProvider";
import { validateEmail } from "../../lib/validation";
import { cn } from "../../lib/utils";

type Step = "email" | "confirmation";

export default function ForgotPasswordPage() {
  const { forgotPassword, isLoading } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const error =
    touched && !email
      ? "Email is required"
      : touched && !validateEmail(email)
        ? "Enter a valid email address"
        : "";

  const isValid = validateEmail(email);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;

    try {
      await forgotPassword(email);
      setStep("confirmation");
    } catch {
      toast.error("Something went wrong", "Please try again later.");
    }
  };

  return (
    <AuthLayout>
      <AnimatePresence mode="wait">
        {step === "email" ? (
          <motion.div
            key="email"
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
              Forgot your password?
            </h1>
            <p className="mt-2 text-sm text-[var(--cv-text-secondary)]">
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
              <div className="space-y-1.5">
                <label
                  htmlFor="forgot-email"
                  className="block text-sm font-medium text-[var(--cv-text)]"
                >
                  Email address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="jane@example.com"
                  autoComplete="email"
                  className={cn(
                    "flex h-9 w-full rounded-lg border bg-[var(--cv-bg-subtle)] px-3 text-sm text-[var(--cv-text)] placeholder:text-[var(--cv-text-muted)] transition-colors focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500",
                    error
                      ? "border-error focus:border-error focus:ring-error"
                      : "border-[var(--cv-border)]"
                  )}
                />
                {error && (
                  <p role="alert" aria-live="polite" className="text-xs text-error">
                    {error}
                  </p>
                )}
              </div>

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
                    Sending…
                  </>
                ) : (
                  "Send reset link"
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center text-center"
          >
            <SuccessCheckmark size={48} />

            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-[var(--cv-text)]">
              Check your email
            </h1>
            <p className="mt-2 max-w-xs text-sm text-[var(--cv-text-secondary)]">
              We sent a password reset link to{" "}
              <span className="font-medium text-[var(--cv-text)]">{email}</span>.
              Check your inbox and spam folder.
            </p>

            <Link
              to="/login"
              className="mt-8 flex h-10 items-center justify-center rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] px-6 text-sm font-medium text-[var(--cv-text)] transition-colors hover:bg-[var(--cv-bg-muted)]"
            >
              Back to login
            </Link>

            <button
              onClick={() => setStep("email")}
              className="mt-3 text-sm text-[var(--cv-text-muted)] transition-colors hover:text-[var(--cv-text)]"
            >
              Didn't receive it? Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
