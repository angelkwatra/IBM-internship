import { useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Mail } from "lucide-react";
import AuthLayout from "../../components/auth/AuthLayout";
import SuccessCheckmark from "../../components/auth/SuccessCheckmark";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/ToastProvider";
import { isAWSEnabled } from "../../services/awsService";

type Step = "pending" | "success";

export default function EmailVerificationPage() {
  const { user, resendVerification, confirmSignUp, isLoading } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("pending");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const email = user?.email || "your email";
  const awsActive = isAWSEnabled();

  const handleVerifyCode = async () => {
    if (!code || code.length < 4) {
      toast.warning("Invalid Code", "Please enter the verification code sent to your email.");
      return;
    }

    setVerifying(true);
    try {
      await confirmSignUp(email, code);
      setStep("success");
      toast.success("Account Verified", "Your email address has been successfully verified.");
    } catch (err: any) {
      console.error("Verification error:", err);
      toast.error("Verification Failed", err.message || "Invalid or expired confirmation code.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      await resendVerification(email);
      toast.success("Email sent", "Verification email has been resent.");
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      toast.error("Failed to send", err.message || "Please try again later.");
    }
  };

  return (
    <AuthLayout>
      <AnimatePresence mode="wait">
        {step === "pending" ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center text-center w-full"
          >
            {/* Mail icon */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
              <Mail size={28} className="text-primary-600 dark:text-primary-400" />
            </div>

            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-[var(--cv-text)]">
              Verify your email
            </h1>
            <p className="mt-2 max-w-xs text-sm text-[var(--cv-text-secondary)] leading-relaxed">
              {awsActive
                ? `We sent a 6-digit confirmation code to ${email}. Enter the code below to verify your account.`
                : `We sent a verification link to ${email}. Click the link to activate your account.`}
            </p>

            {awsActive ? (
              <div className="mt-6 w-full space-y-3">
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Verification Code"
                  className="flex h-10 w-full rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-3 text-center text-sm font-semibold tracking-widest focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-[var(--cv-text)]"
                />
                <button
                  onClick={handleVerifyCode}
                  disabled={verifying || code.length < 6}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 text-sm font-medium text-white transition-all hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-primary-500 dark:hover:bg-primary-400"
                >
                  {verifying ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Verify Code"
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setStep("success")}
                className="mt-8 flex h-10 items-center justify-center rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] px-6 text-sm font-medium text-[var(--cv-text)] transition-colors hover:bg-[var(--cv-bg-muted)]"
              >
                Simulate verification ↗
              </button>
            )}

            {/* Resend button */}
            <button
              onClick={handleResend}
              disabled={isLoading || resendCooldown > 0}
              className="mt-6 flex items-center gap-2 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-primary-400 dark:hover:text-primary-300"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Sending…
                </>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                "Resend verification email"
              )}
            </button>

            <p className="mt-6 text-xs text-[var(--cv-text-muted)]">
              Wrong email?{" "}
              <Link
                to="/register"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                Sign up with a different one
              </Link>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            <SuccessCheckmark size={48} />

            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-[var(--cv-text)]">
              Email verified!
            </h1>
            <p className="mt-2 text-sm text-[var(--cv-text-secondary)]">
              Your account is now active. Let's set up your workspace.
            </p>

            <Link
              to="/onboarding"
              className="mt-8 flex h-10 items-center justify-center rounded-lg bg-primary-600 px-6 text-sm font-medium text-white transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
            >
              Continue setup
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
