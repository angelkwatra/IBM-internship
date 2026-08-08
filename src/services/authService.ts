/**
 * Auth Service — Mock API layer for authentication.
 *
 * Every function returns a typed promise with simulated latency so that
 * real API calls can be swapped in later without touching components.
 * The AuthContext delegates to these functions.
 */

// ── Types ────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  plan: "free" | "pro" | "team" | "enterprise";
  onboardingComplete: boolean;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

// ── Simulated state ──────────────────────────────────────────────

const registeredEmails = new Set(["demo@cloudvault.io"]);

const simulateDelay = (ms = 1200): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ── Service functions ────────────────────────────────────────────

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  await simulateDelay();

  // Simulate wrong password for demo — correct password is "Demo1234!"
  if (password !== "Demo1234!") {
    throw new Error("Invalid email or password.");
  }

  return {
    user: {
      id: "usr_1",
      name: "Demo User",
      email,
      plan: "free",
      onboardingComplete: true,
    },
    accessToken: "eyJ.simulated.access.token",
  };
}

export async function registerUser(
  data: RegisterPayload
): Promise<AuthResponse> {
  await simulateDelay();

  if (registeredEmails.has(data.email)) {
    throw new Error("An account with this email already exists.");
  }

  registeredEmails.add(data.email);

  return {
    user: {
      id: "usr_" + Math.random().toString(36).slice(2, 8),
      name: data.name,
      email: data.email,
      plan: "free",
      onboardingComplete: false,
    },
    accessToken: "eyJ.simulated.register.token",
  };
}

export async function forgotPasswordRequest(
  _email: string
): Promise<void> {
  await simulateDelay(1000);
  // In production: POST /auth/forgot-password
  // Always returns success to prevent email enumeration
}

export async function resetPasswordRequest(
  token: string,
  _newPassword: string
): Promise<void> {
  await simulateDelay();

  if (token === "expired") {
    throw new Error("EXPIRED_TOKEN");
  }
  // Success — password has been reset
}

export async function resendVerificationEmail(
  _email: string
): Promise<void> {
  await simulateDelay(800);
}
