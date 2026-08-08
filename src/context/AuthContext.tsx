import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { mockStorage } from "../lib/mockPersistence";
import {
  isAWSEnabled,
  cognitoSignIn,
  cognitoSignUp,
  cognitoConfirmSignUp,
  cognitoForgotPassword,
  cognitoConfirmForgotPassword,
  cognitoResendConfirmationCode,
} from "../services/awsService";

/**
 * Authentication state managed in-memory.
 *
 * JWT is stored in memory only — never in localStorage or sessionStorage.
 * NOTE: Refresh-token rotation is handled server-side via httpOnly cookies.
 * The client simply calls /auth/refresh when the access token expires,
 * and the server returns a new access token while rotating the refresh
 * cookie transparently.
 */

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  plan: "free" | "pro" | "team" | "enterprise";
  onboardingComplete: boolean;
}

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  setUser: (user: User | null | ((prev: User | null) => User | null)) => void;
  setAccessToken: (token: string | null) => void;
  loginAttempts: number;
  lockoutUntil: number | null;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Simulate network delay
const simulateApi = (ms = 1500): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Simulated "database" of registered emails for demo
const registeredEmails = new Set(["demo@cloudvault.io"]);

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30_000; // 30 seconds

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userState, setUserState] = useState<User | null>(null);
  const user = userState;
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState<string>("");
  const tempPasswordRef = useRef<string>("");

  const setUser = useCallback((u: User | null | ((prev: User | null) => User | null)) => {
    setUserState((prev) => {
      const next = typeof u === "function" ? u(prev) : u;
      if (next) {
        mockStorage.setItem("cv_user", next);
      } else {
        mockStorage.removeItem("cv_user");
      }
      return next;
    });
  }, []);

  // Check mock session on mount
  useEffect(() => {
    const checkSession = async () => {
      const hasCookie = document.cookie.split(";").some((c) => c.trim().startsWith("cv_logged_in="));
      if (hasCookie) {
        try {
          // Simulate refresh token rotation latency
          await new Promise((r) => setTimeout(r, 600));
          setAccessToken("eyJ.simulated.token");
          const storedUser = mockStorage.getItem<User | null>("cv_user", null);
          const initialUser = storedUser || {
            id: "usr_1",
            name: "Demo User",
            email: "demo@cloudvault.io",
            plan: "free",
            onboardingComplete: true,
          };
          setUserState(initialUser);
          if (!storedUser) {
            mockStorage.setItem("cv_user", initialUser);
          }
        } catch {
          // ignore
        }
      }
      setIsLoading(false);
    };
    checkSession();
  }, [setUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (lockoutUntil && Date.now() < lockoutUntil) {
        throw new Error(
          `Too many attempts. Try again in ${Math.ceil((lockoutUntil - Date.now()) / 1000)} seconds.`
        );
      }

      setIsLoading(true);
      try {
        if (isAWSEnabled()) {
          const res = await cognitoSignIn(email, password);
          setAccessToken(res.accessToken);
          setUser({
            id: res.email,
            name: res.name,
            email: res.email,
            plan: "free",
            onboardingComplete: true,
          });
          document.cookie = "cv_logged_in=true; path=/; max-age=86400";
          setLoginAttempts(0);
          setLockoutUntil(null);
          return;
        }

        await simulateApi();

        // Simulate wrong password for demo
        if (password !== "Demo1234!") {
          const newAttempts = loginAttempts + 1;
          setLoginAttempts(newAttempts);

          if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
            const until = Date.now() + LOCKOUT_DURATION_MS;
            setLockoutUntil(until);
            throw new Error(
              `Account locked. Too many failed attempts. Try again in ${LOCKOUT_DURATION_MS / 1000} seconds.`
            );
          }

          throw new Error("Invalid email or password.");
        }

        // Success
        setLoginAttempts(0);
        setLockoutUntil(null);
        setAccessToken("eyJ.simulated.token");
        setUser({
          id: "usr_1",
          name: "Demo User",
          email,
          plan: "free",
          onboardingComplete: true,
        });
        document.cookie = "cv_logged_in=true; path=/; max-age=86400";
      } finally {
        setIsLoading(false);
      }
    },
    [loginAttempts, lockoutUntil, setUser]
  );

  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    try {
      if (isAWSEnabled()) {
        await cognitoSignUp(data.email, data.password, data.name);
        tempPasswordRef.current = data.password; // Cache for auto-login after email verification
        setUser({
          id: data.email,
          name: data.name,
          email: data.email,
          plan: "free",
          onboardingComplete: false,
        });
        return;
      }

      await simulateApi();

      if (registeredEmails.has(data.email)) {
        throw new Error("An account with this email already exists.");
      }

      registeredEmails.add(data.email);
      setAccessToken("eyJ.simulated.register.token");
      setUser({
        id: "usr_" + Math.random().toString(36).slice(2, 8),
        name: data.name,
        email: data.email,
        plan: "free",
        onboardingComplete: false,
      });
      document.cookie = "cv_logged_in=true; path=/; max-age=86400";
    } finally {
      setIsLoading(false);
    }
  }, [setUser]);

  const confirmSignUp = useCallback(async (email: string, code: string) => {
    setIsLoading(true);
    try {
      if (isAWSEnabled()) {
        await cognitoConfirmSignUp(email, code);
        
        // Auto-login if password is cached
        if (tempPasswordRef.current) {
          try {
            const res = await cognitoSignIn(email, tempPasswordRef.current);
            setAccessToken(res.accessToken);
            setUser({
              id: res.email,
              name: res.name,
              email: res.email,
              plan: "free",
              onboardingComplete: true,
            });
            document.cookie = "cv_logged_in=true; path=/; max-age=86400";
          } catch (loginErr) {
            console.error("Auto-login failed after verification:", loginErr);
          } finally {
            tempPasswordRef.current = ""; // Clear password
          }
        }
      } else {
        await simulateApi(800);
      }
    } finally {
      setIsLoading(false);
    }
  }, [setUser]);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setLoginAttempts(0);
    setLockoutUntil(null);
    tempPasswordRef.current = "";
    document.cookie = "cv_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }, [setUser]);

  const forgotPassword = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      if (isAWSEnabled()) {
        await cognitoForgotPassword(email);
        setForgotPasswordEmail(email);
      } else {
        await simulateApi(1000);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(
    async (token: string, password: string) => {
      setIsLoading(true);
      try {
        if (isAWSEnabled()) {
          const email = forgotPasswordEmail || new URLSearchParams(window.location.search).get("email") || "";
          if (!email) {
            throw new Error("Unable to identify the email address for resetting password. Please try again.");
          }
          await cognitoConfirmForgotPassword(email, token, password);
        } else {
          await simulateApi();
          if (token === "expired") {
            throw new Error("EXPIRED_TOKEN");
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [forgotPasswordEmail]
  );

  const resendVerification = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      if (isAWSEnabled()) {
        await cognitoResendConfirmationCode(email);
      } else {
        await simulateApi(800);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!accessToken,
        isLoading,
        login,
        register,
        confirmSignUp,
        logout,
        forgotPassword,
        resetPassword,
        resendVerification,
        setUser,
        setAccessToken,
        loginAttempts,
        lockoutUntil,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
