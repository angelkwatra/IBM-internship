import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/Button";

/**
 * ErrorBoundary — Catches unexpected runtime errors in its subtree
 * and renders a graceful fallback UI instead of a blank screen.
 *
 * Logs the actual error + component stack to console.error for debugging
 * but never shows raw stack traces to end users.
 */

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="flex flex-col items-center text-center max-w-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/20 mb-4">
              <AlertTriangle
                className="text-red-500"
                size={32}
                strokeWidth={1.5}
                aria-hidden
              />
            </div>
            <h2 className="text-lg font-semibold text-[var(--cv-text)]">
              Something went wrong
            </h2>
            <p className="text-sm text-[var(--cv-text-muted)] mt-2 leading-relaxed">
              An unexpected error occurred. Please reload the page to continue.
            </p>
            <div className="mt-6">
              <Button variant="primary" onClick={this.handleReload}>
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
