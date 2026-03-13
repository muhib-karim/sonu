import React, { Component, ErrorInfo, ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the
 * component tree that crashed.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Log to error reporting service
    this.logError(error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    this.setState({ errorInfo });
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    // In production, send to error tracking service
    if (process.env.NODE_ENV === "production") {
      // Example: Sentry.captureException(error);
      console.error("Production error logged:", {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReload={this.handleReload}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Error Fallback UI Component
 */
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReload: () => void;
  onReset: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  onReload,
  onReset,
}) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-surface rounded-lg shadow-lg p-6 border border-error/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-error"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-text">
              {t("errors.boundary_title", "Something went wrong")}
            </h2>
            <p className="text-sm text-text-secondary">
              {t(
                "errors.boundary_subtitle",
                "The application encountered an unexpected error",
              )}
            </p>
          </div>
        </div>

        <div className="bg-error/5 rounded-md p-3 mb-4 font-mono text-sm text-error overflow-auto max-h-32">
          <p className="font-semibold">{error?.message || "Unknown error"}</p>
          {process.env.NODE_ENV === "development" && errorInfo && (
            <pre className="mt-2 text-xs opacity-80 whitespace-pre-wrap">
              {errorInfo.componentStack}
            </pre>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 px-4 py-2 bg-surface border border-border rounded-md text-text hover:bg-background transition-colors"
          >
            {t("buttons.try_again", "Try Again")}
          </button>
          <button
            onClick={onReload}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            {t("buttons.reload_app", "Reload App")}
          </button>
        </div>

        <p className="mt-4 text-xs text-text-secondary text-center">
          {t(
            "errors.report_prompt",
            "If this problem persists, please report it to the development team",
          )}
        </p>
      </div>
    </div>
  );
};

/**
 * Settings Section Error Boundary
 * Catches errors in specific settings sections without crashing the whole settings page
 */
export class SettingsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SettingsErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      /* eslint-disable i18next/no-literal-string */
      return (
        <div className="p-4 bg-error/5 border border-error/20 rounded-lg">
          <div className="flex items-center gap-2 text-error mb-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium">Failed to load settings section</span>
          </div>
          <button
            onClick={this.handleRetry}
            className="text-sm text-primary hover:underline"
          >
            Retry loading
          </button>
        </div>
      );
      /* eslint-enable i18next/no-literal-string */
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<Props, "children">,
): React.FC<P> {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...options}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
