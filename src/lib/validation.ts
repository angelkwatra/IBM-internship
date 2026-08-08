/**
 * Password strength evaluation with live requirement checking.
 */

export interface PasswordRequirement {
  key: string;
  label: string;
  test: (pw: string) => boolean;
}

export const passwordRequirements: PasswordRequirement[] = [
  { key: "length", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { key: "uppercase", label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { key: "number", label: "One number", test: (pw) => /\d/.test(pw) },
  { key: "symbol", label: "One special character", test: (pw) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pw) },
];

export type StrengthLevel = "weak" | "fair" | "good" | "strong";

export interface PasswordStrength {
  level: StrengthLevel;
  score: number; // 0-4
  color: string;
  label: string;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { level: "weak", score: 0, color: "var(--color-neutral-300)", label: "" };
  }

  const passedCount = passwordRequirements.filter((r) => r.test(password)).length;

  if (passedCount <= 1) {
    return { level: "weak", score: 1, color: "var(--color-error)", label: "Weak" };
  }
  if (passedCount === 2) {
    return { level: "fair", score: 2, color: "var(--color-warning)", label: "Fair" };
  }
  if (passedCount === 3) {
    return { level: "good", score: 3, color: "var(--color-info)", label: "Good" };
  }
  return { level: "strong", score: 4, color: "var(--color-success)", label: "Strong" };
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
