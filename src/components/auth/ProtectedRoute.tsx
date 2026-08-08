import { Navigate, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * ProtectedRoute — Redirect gate for authenticated routes.
 *
 * - Not authenticated → /login (preserving the attempted URL in state)
 * - Authenticated but onboarding incomplete → /onboarding
 * - Otherwise → render children
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user && !user.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
