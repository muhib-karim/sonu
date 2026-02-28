/**
 * Error Boundary Components
 *
 * Provides error catching and graceful error handling for the application.
 *
 * @example
 * ```tsx
 * import { ErrorBoundary, SettingsErrorBoundary } from '@/components/error-boundary';
 *
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * <SettingsErrorBoundary>
 *   <SettingsSection />
 * </SettingsErrorBoundary>
 * ```
 */

export {
  ErrorBoundary,
  SettingsErrorBoundary,
  withErrorBoundary,
} from "./ErrorBoundary";
