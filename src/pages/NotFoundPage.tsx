import { useNavigate } from "react-router";
import { FileQuestion } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import EmptyState from "../components/ui/EmptyState";

/**
 * NotFoundPage — Catch-all 404 page.
 *
 * Reuses the EmptyState pattern for visual consistency.
 * Redirects authenticated users to /app/dashboard,
 * unauthenticated users to /login.
 */
export default function NotFoundPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        actionLabel={isAuthenticated ? "Back to Dashboard" : "Go to Login"}
        onAction={() =>
          navigate(isAuthenticated ? "/app/dashboard" : "/login", {
            replace: true,
          })
        }
      />
    </div>
  );
}
