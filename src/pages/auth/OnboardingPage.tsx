import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { User, Users, Loader2, ArrowRight, FolderOpen } from "lucide-react";
import AuthLayout from "../../components/auth/AuthLayout";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/ToastProvider";
import { cn } from "../../lib/utils";
import { slideVariants, slideTransition } from "../../lib/motion";
import { useReducedMotion } from "../../hooks/useReducedMotion";

type UseCase = "personal" | "team" | null;

export default function OnboardingPage() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [useCase, setUseCase] = useState<UseCase>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => {
    if (step === 1 && useCase === "personal") {
      handleComplete();
      return;
    }
    if (step === 1 && useCase === "team") {
      setDirection(1);
      setStep(2);
      return;
    }
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(1);
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((r) => setTimeout(r, 1000));

      if (user) {
        setUser({ ...user, onboardingComplete: true });
      }

      toast.success("Welcome to CloudVault!", "Your workspace is ready.");
      navigate("/app/dashboard");
    } catch {
      toast.error("Setup failed", "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              s <= step
                ? "w-8 bg-primary-600 dark:bg-primary-400"
                : "w-4 bg-[var(--cv-bg-muted)]",
              useCase === "personal" && s === 2 && "hidden"
            )}
          />
        ))}
        <span className="ml-2 text-xs text-[var(--cv-text-muted)]">
          Step {step} of {useCase === "personal" ? 1 : 2}
        </span>
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        {step === 1 && (
          <motion.div
            key="step1"
            custom={direction}
            variants={prefersReduced ? undefined : slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={prefersReduced ? { duration: 0 } : slideTransition}
          >
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--cv-text)]">
              How will you use CloudVault?
            </h1>
            <p className="mt-2 text-sm text-[var(--cv-text-secondary)]">
              This helps us set up the right experience for you.
            </p>

            <div className="mt-8 grid gap-3">
              {/* Personal card */}
              <button
                onClick={() => setUseCase("personal")}
                className={cn(
                  "group flex items-start gap-4 rounded-xl border p-5 text-left transition-all",
                  useCase === "personal"
                    ? "border-primary-500 bg-primary-50 shadow-sm dark:border-primary-400 dark:bg-primary-950/30"
                    : "border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] hover:border-[var(--cv-border-strong)] hover:shadow-sm"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                    useCase === "personal"
                      ? "bg-primary-600 text-white dark:bg-primary-500"
                      : "bg-[var(--cv-bg-muted)] text-[var(--cv-text-muted)] group-hover:text-[var(--cv-text-secondary)]"
                  )}
                >
                  <User size={20} />
                </div>
                <div>
                  <p className="font-medium text-[var(--cv-text)]">Personal</p>
                  <p className="mt-0.5 text-sm text-[var(--cv-text-secondary)]">
                    For personal files, photos, and documents. Just you.
                  </p>
                </div>
              </button>

              {/* Team card */}
              <button
                onClick={() => setUseCase("team")}
                className={cn(
                  "group flex items-start gap-4 rounded-xl border p-5 text-left transition-all",
                  useCase === "team"
                    ? "border-primary-500 bg-primary-50 shadow-sm dark:border-primary-400 dark:bg-primary-950/30"
                    : "border-[var(--cv-border)] bg-[var(--cv-bg-elevated)] hover:border-[var(--cv-border-strong)] hover:shadow-sm"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                    useCase === "team"
                      ? "bg-primary-600 text-white dark:bg-primary-500"
                      : "bg-[var(--cv-bg-muted)] text-[var(--cv-text-muted)] group-hover:text-[var(--cv-text-secondary)]"
                  )}
                >
                  <Users size={20} />
                </div>
                <div>
                  <p className="font-medium text-[var(--cv-text)]">Team</p>
                  <p className="mt-0.5 text-sm text-[var(--cv-text-secondary)]">
                    Collaborate with your team. Shared workspaces, permissions, and more.
                  </p>
                </div>
              </button>
            </div>

            {/* Continue button */}
            <button
              onClick={handleNext}
              disabled={!useCase || isSubmitting}
              className={cn(
                "mt-8 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 text-sm font-medium text-white transition-all hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 dark:bg-primary-500 dark:hover:bg-primary-400",
                (!useCase || isSubmitting) && "cursor-not-allowed opacity-50"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Setting up…
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            custom={direction}
            variants={prefersReduced ? undefined : slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={prefersReduced ? { duration: 0 } : slideTransition}
          >
            <button
              onClick={handleBack}
              className="mb-6 text-sm text-[var(--cv-text-muted)] transition-colors hover:text-[var(--cv-text)]"
            >
              ← Back
            </button>

            <h1 className="text-2xl font-semibold tracking-tight text-[var(--cv-text)]">
              Name your workspace
            </h1>
            <p className="mt-2 text-sm text-[var(--cv-text-secondary)]">
              This is where your team will collaborate. You can change this later.
            </p>

            <div className="mt-8 space-y-4">
              {/* Workspace icon preview */}
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
                  <FolderOpen
                    size={24}
                    className="text-primary-600 dark:text-primary-400"
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="workspace-name"
                    className="block text-sm font-medium text-[var(--cv-text)]"
                  >
                    Workspace name
                  </label>
                  <input
                    id="workspace-name"
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="e.g. Acme Inc."
                    autoFocus
                    className="mt-1 flex h-9 w-full rounded-lg border border-[var(--cv-border)] bg-[var(--cv-bg-subtle)] px-3 text-sm text-[var(--cv-text)] placeholder:text-[var(--cv-text-muted)] transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Hint */}
              <p className="text-xs text-[var(--cv-text-muted)]">
                Tip: Use your company or team name. You can invite members after setup.
              </p>

              {/* Complete button */}
              <button
                onClick={handleComplete}
                disabled={!workspaceName.trim() || isSubmitting}
                className={cn(
                  "flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 text-sm font-medium text-white transition-all hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 dark:bg-primary-500 dark:hover:bg-primary-400",
                  (!workspaceName.trim() || isSubmitting) &&
                    "cursor-not-allowed opacity-50"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating workspace…
                  </>
                ) : (
                  "Create workspace"
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
