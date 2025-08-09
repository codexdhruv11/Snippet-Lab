import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ContributionGraphSkeleton } from './ContributionGraphSkeleton';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  userId?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  isRecovering: boolean;
}

export class ContributionGraphErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private readonly MAX_RETRY_COUNT = 3;
  private readonly RETRY_DELAY = 1000;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorCount: 0,
      isRecovering: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    const { errorCount } = this.state;

    // Log error details
    console.error('ContributionGraph Error:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      errorCount: errorCount + 1,
      timestamp: new Date().toISOString(),
      userId: this.props.userId,
    });

    // Call custom error handler if provided
    onError?.(error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      errorCount: errorCount + 1,
    });

    // Attempt automatic recovery for certain error types
    this.attemptAutomaticRecovery(error);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  attemptAutomaticRecovery = (error: Error) => {
    const { errorCount } = this.state;

    // Only attempt automatic recovery for certain error types and within retry limit
    if (errorCount < this.MAX_RETRY_COUNT) {
      const isRecoverableError = this.isRecoverableError(error);

      if (isRecoverableError) {
        this.setState({ isRecovering: true });

        // Exponential backoff for retries
        const delay = this.RETRY_DELAY * Math.pow(2, errorCount);

        this.retryTimeoutId = setTimeout(() => {
          this.resetErrorBoundary();
        }, delay);
      }
    }
  };

  isRecoverableError = (error: Error): boolean => {
    // Check for common recoverable errors
    const recoverablePatterns = [
      /network/i,
      /fetch/i,
      /timeout/i,
      /chunk/i,
      /loading/i,
      /undefined/i,
      /null/i,
    ];

    const errorMessage = error.message || error.toString();
    return recoverablePatterns.some(pattern => pattern.test(errorMessage));
  };

  getErrorCategory = (error: Error): string => {
    const errorMessage = error.message || error.toString();

    if (/network|fetch|api/i.test(errorMessage)) {
      return 'Network Error';
    }
    if (/data|validation|invalid/i.test(errorMessage)) {
      return 'Data Error';
    }
    if (/render|component|react/i.test(errorMessage)) {
      return 'Rendering Error';
    }
    if (/memory|performance/i.test(errorMessage)) {
      return 'Performance Error';
    }
    return 'Unknown Error';
  };

  getErrorSolution = (category: string): string => {
    switch (category) {
      case 'Network Error':
        return 'Please check your internet connection and try again.';
      case 'Data Error':
        return 'The contribution data may be corrupted. Try refreshing the page.';
      case 'Rendering Error':
        return 'There was an issue displaying the graph. We\'re working on it.';
      case 'Performance Error':
        return 'The graph is too large to display. Try a smaller date range.';
      default:
        return 'An unexpected error occurred. Please try again later.';
    }
  };

  resetErrorBoundary = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      // Don't reset errorCount to track total attempts
    });
  };

  render() {
    const { hasError, error, errorInfo, errorCount, isRecovering } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Show recovery state
      if (isRecovering) {
        return (
          <Card className="w-full">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Attempting to recover... (Attempt {errorCount} of {this.MAX_RETRY_COUNT})
              </p>
            </CardContent>
          </Card>
        );
      }

      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>;
      }

      const errorCategory = this.getErrorCategory(error);
      const errorSolution = this.getErrorSolution(errorCategory);
      const canRetry = errorCount < this.MAX_RETRY_COUNT;

      // Default error UI
      return (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {errorCategory}
            </CardTitle>
            <CardDescription>{errorSolution}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="rounded-md bg-muted p-4 space-y-2">
                <p className="text-sm font-mono text-muted-foreground">
                  {error.message}
                </p>
                {errorInfo && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Component Stack
                    </summary>
                    <pre className="mt-2 overflow-auto text-muted-foreground">
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {canRetry && (
                <Button
                  onClick={this.resetErrorBoundary}
                  variant="default"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                Refresh Page
              </Button>
              {process.env.NODE_ENV === 'development' && (
                <Button
                  onClick={() => {
                    console.error('Full error details:', {
                      error,
                      errorInfo,
                      errorCount,
                    });
                  }}
                  variant="ghost"
                  size="sm"
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Log Error
                </Button>
              )}
            </div>

            {/* Fallback content */}
            <div className="mt-6">
              <p className="text-sm text-muted-foreground mb-4">
                While we fix this issue, here's what the contribution graph looks like:
              </p>
              <ContributionGraphSkeleton />
            </div>
          </CardContent>
        </Card>
      );
    }

    return children;
  }
}
