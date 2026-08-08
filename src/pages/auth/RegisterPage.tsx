import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";
import AuthLayout from "../../components/auth/AuthLayout";
import PasswordInput from "../../components/auth/PasswordInput";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/ToastProvider";
import { validateEmail, passwordRequirements } from "../../lib/validation";
import { cn } from "../../lib/utils";

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [serverError, setServerError] = useState("");
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  // Validation
  const errors = {
    name: touched.name && !name.trim() ? "Name is required" : "",
    email:
      touched.email && !email
        ? "Email is required"
        : touched.email && !validateEmail(email)
          ? "Enter a valid email address"
          : "",
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
    name.trim() &&
    validateEmail(email) &&
    passwordRequirements.every((r) => r.test(password)) &&
    password === confirmPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    setServerError("");

    if (!isValid) return;

    try {
      await register({ name: name.trim(), email, password });
      navigate("/verify-email");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setServerError(message);
      toast.error("Registration failed", message);
    }
  };

  return (
    <AuthLayout>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cv-text)]">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-[var(--cv-text-secondary)]">
          Start with 5 GB of free secure cloud storage.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        {/* Server error */}
        <AnimatePresence>
          {serverError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                role="alert"
                aria-live="polite"
                className="rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm text-error"
              >
                {serverError}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="reg-name" className="block text-sm font-medium text-[var(--cv-text)]">
            Full name
          </label>
          <input
            id="reg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, name: true }))}
            placeholder="Jane Doe"
            autoComplete="name"
            className={cn(
              "flex h-9 w-full rounded-lg border bg-[var(--cv-bg-subtle)] px-3 text-sm text-[var(--cv-text)] placeholder:text-[var(--cv-text-muted)] transition-colors focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500",
              errors.name
                ? "border-error focus:border-error focus:ring-error"
                : "border-[var(--cv-border)]"
            )}
          />
          {errors.name && (
            <p role="alert" aria-live="polite" className="text-xs text-error">
              {errors.name}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="reg-email" className="block text-sm font-medium text-[var(--cv-text)]">
            Email address
          </label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, email: true }))}
            placeholder="jane@example.com"
            autoComplete="email"
            className={cn(
              "flex h-9 w-full rounded-lg border bg-[var(--cv-bg-subtle)] px-3 text-sm text-[var(--cv-text)] placeholder:text-[var(--cv-text-muted)] transition-colors focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500",
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
          id="reg-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, password: true }))}
          placeholder="Create a strong password"
          autoComplete="new-password"
          showStrength
          showRequirements
          error={errors.password}
        />

        {/* Confirm Password */}
        <PasswordInput
          label="Confirm password"
          id="reg-confirm-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          error={errors.confirmPassword}
        />

        {/* Submit */}
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
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      {/* Login link */}
      <p className="mt-6 text-center text-sm text-[var(--cv-text-secondary)]">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
