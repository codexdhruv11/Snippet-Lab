import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  showDetails?: boolean;
  resetKeys?: Array<string | number>;
  isolate?: boolean;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
  retryDelay?: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
  isRetrying: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null;
  private previousResetKeys: Array<string | number> = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // Log to external error tracking service if available
    if (typeof window !== 'undefined' && (window as any).errorTracker) {
      (window as any).errorTracker.logError(error, {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        props: this.props
      });
    }
    
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Auto-retry with configurable delay and max retries
    const maxRetries = this.props.maxRetries ?? 3;
    const retryDelay = this.props.retryDelay ?? 5000;
    
    if (this.state.errorCount < maxRetries && !this.props.isolate) {
      this.setState({ isRetrying: true });
      this.resetTimeoutId = setTimeout(() => {
        this.resetError();
      }, retryDelay);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys } = this.props;
    const hasResetKeyChanged = resetKeys && 
      resetKeys.length > 0 && 
      resetKeys.some((key, idx) => key !== this.previousResetKeys[idx]);
    
    if (hasResetKeyChanged) {
      this.resetError();
      this.previousResetKeys = resetKeys;
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetError = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
    
    this.props.onReset?.();
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null,
      isRetrying: false
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError = this.state.error?.message?.toLowerCase().includes('network') ||
                            this.state.error?.message?.toLowerCase().includes('fetch');
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                    {isNetworkError ? 'Connection Error' : 'Something went wrong'}
                  </h2>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                    {isNetworkError 
                      ? 'Unable to connect to the server. Please check your internet connection.'
                      : this.state.error?.message || 'An unexpected error occurred while rendering this component.'}
                  </p>
                  
                  {/* Error details for development */}
                  {isDevelopment && this.props.showDetails !== false && this.state.errorInfo && (
                    <details className="mt-4">
                      <summary className="text-sm text-red-600 dark:text-red-400 cursor-pointer hover:underline">
                        Error Details
                      </summary>
                      <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded text-xs overflow-auto max-h-40">
                        {this.state.error?.stack}
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                  
                  {/* Retry count indicator */}
                  {this.state.errorCount > 1 && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                      Error occurred {this.state.errorCount} times
                      {this.state.isRetrying && ' - Retrying...'}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 mt-6">
                <button
                  onClick={this.resetError}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Try Again</span>
                </button>
                
                {typeof window !== 'undefined' && (
                  <button
                    onClick={() => window.location.href = '/'}
                    className="flex items-center space-x-2 px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    <Home className="h-4 w-4" />
                    <span>Go Home</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
