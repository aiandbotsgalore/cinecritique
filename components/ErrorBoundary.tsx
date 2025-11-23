/**
 * Error boundary component for catching and handling React component errors.
 * Prevents the entire application from crashing due to component-level errors.
 * Displays a user-friendly error message with reload option.
 * @module components/ErrorBoundary
 */

import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Props for the ErrorBoundary component.
 */
interface Props {
  /** Child components to protect with error boundary */
  children: ReactNode;
  /** Optional custom fallback UI to display on error */
  fallback?: ReactNode;
}

/**
 * State for tracking error status and details.
 */
interface State {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error object, if any */
  error: Error | null;
}

/**
 * React Error Boundary component that catches JavaScript errors anywhere in the child component tree.
 * Logs error information and displays a fallback UI instead of crashing the entire app.
 *
 * @class
 * @extends {Component<Props, State>}
 *
 * @example
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 *
 * @example
 * // With custom fallback
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <FeatureComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
  /**
   * Creates an ErrorBoundary instance.
   *
   * @param {Props} props - Component props
   */
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * Updates state when an error is caught in a child component.
   * Static lifecycle method called during the render phase.
   *
   * @static
   * @param {Error} error - The error that was thrown
   * @returns {State} Updated state indicating an error occurred
   */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   * Logs error details when an error is caught.
   * Called during the commit phase, allowing side effects.
   * TODO: Future enhancement to send errors to monitoring service.
   *
   * @param {Error} error - The error that was thrown
   * @param {React.ErrorInfo} errorInfo - Component stack trace information
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // TODO: Send to error reporting service (Sentry, LogRocket, etc.)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
          <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 text-center border border-red-500/30">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Something Went Wrong</h2>
            <p className="text-slate-400 mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
