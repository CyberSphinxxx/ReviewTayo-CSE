import { Component, type ErrorInfo, type ReactNode } from 'react';

import { crashReporter } from '@/services/observability/crash-reporter';

import { FatalErrorFallback } from './FatalErrorFallback';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  /** Changing this value clears a previous error, e.g. on navigation or retry. */
  readonly resetKey?: string | number;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
  readonly componentStack: string | null;
}

/**
 * App-level error boundary.
 *
 * A fatal render error must never leave the learner on a blank screen: the
 * fallback explains what happened, offers a retry, and the error is reported
 * through the crash boundary for diagnosis.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    const componentStack = info.componentStack ?? null;
    this.setState({ componentStack });
    crashReporter.report({
      message: error.message,
      stack: error.stack,
      componentStack: componentStack ?? undefined,
      isFatal: true,
      occurredAt: new Date().toISOString(),
    });
  }

  override componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      previous.resetKey !== this.props.resetKey &&
      this.props.resetKey !== undefined
    ) {
      this.setState({ error: null, componentStack: null });
    }
  }

  private readonly handleRetry = (): void => {
    this.setState({ error: null, componentStack: null });
  };

  override render(): ReactNode {
    const { error, componentStack } = this.state;
    if (error !== null) {
      return (
        <FatalErrorFallback
          message={error.message}
          componentStack={componentStack}
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}
