import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  RefreshCw,
  Bug,
  Zap,
  Settings,
  Download,
  ExternalLink
} from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
}

export class MLErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ML Pipeline Error:', error);
    console.error('Error Info:', errorInfo);

    this.setState({
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Log error to monitoring service (in production)
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // In production, send to error monitoring service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      mlPipeline: true,
    };

    // Send to error monitoring service
    console.log('Error Report:', errorReport);

    // Example: Send to monitoring service
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorReport),
    // }).catch(console.error);
  };

  private handleRetry = async () => {
    this.setState({ isRetrying: true });

    // Clear any existing timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    // Simulate retry delay
    this.retryTimeout = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        isRetrying: false,
      }));
    }, 2000);
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    });
  };

  private getErrorType = (error: Error): string => {
    const message = error.message.toLowerCase();

    if (message.includes('tensorflow') || message.includes('ml')) {
      return 'ML Pipeline Error';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network Error';
    }
    if (message.includes('memory') || message.includes('out of memory')) {
      return 'Memory Error';
    }
    if (message.includes('timeout')) {
      return 'Timeout Error';
    }

    return 'Application Error';
  };

  private getErrorSeverity = (error: Error): 'low' | 'medium' | 'high' | 'critical' => {
    const message = error.message.toLowerCase();
    const type = this.getErrorType(error);

    if (type === 'Memory Error' || message.includes('critical')) {
      return 'critical';
    }
    if (type === 'ML Pipeline Error' || message.includes('failed')) {
      return 'high';
    }
    if (type === 'Network Error') {
      return 'medium';
    }

    return 'low';
  };

  private getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 border-red-400/20';
      case 'high': return 'text-orange-400 border-orange-400/20';
      case 'medium': return 'text-yellow-400 border-yellow-400/20';
      default: return 'text-blue-400 border-blue-400/20';
    }
  };

  private getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-5 h-5" />;
      case 'high': return <Zap className="w-5 h-5" />;
      case 'medium': return <Bug className="w-5 h-5" />;
      default: return <Settings className="w-5 h-5" />;
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorType = this.getErrorType(this.state.error);
      const severity = this.getErrorSeverity(this.state.error);
      const severityColor = this.getSeverityColor(severity);
      const SeverityIcon = this.getSeverityIcon(severity);

      return (
        <AnimatePresence>
          <motion.div
            className={`glass-card p-6 rounded-xl border-2 ${severityColor}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {/* Header */}
            <div className="flex items-center space-x-3 mb-4">
              <div className={`p-2 rounded-lg bg-current/10`}>
                {SeverityIcon}
              </div>
              <div>
                <h3 className="font-semibold text-white">{errorType}</h3>
                <p className="text-sm text-gray-400">
                  {severity.charAt(0).toUpperCase() + severity.slice(1)} severity • Retry #{this.state.retryCount}
                </p>
              </div>
            </div>

            {/* Error Message */}
            <div className="mb-4">
              <p className="text-gray-300 text-sm leading-relaxed">
                {this.state.error.message}
              </p>
            </div>

            {/* Error Details (Collapsible) */}
            {this.props.showDetails && this.state.errorInfo && (
              <motion.div
                className="mb-4 p-3 bg-black/20 rounded-lg"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-400 hover:text-white mb-2">
                    Technical Details
                  </summary>
                  <pre className="text-gray-500 whitespace-pre-wrap overflow-x-auto">
                    {this.state.error.stack}
                    {'\n\nComponent Stack:\n'}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-3">
                <button
                  onClick={this.handleRetry}
                  disabled={this.state.isRetrying}
                  className="px-4 py-2 bg-[#00F260] rounded-lg text-white text-sm font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {this.state.isRetrying ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>{this.state.isRetrying ? 'Retrying...' : 'Retry'}</span>
                </button>

                <button
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  Reset
                </button>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => window.location.reload()}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Reload Page"
                >
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => {
                    const errorData = {
                      error: this.state.error?.message,
                      stack: this.state.error?.stack,
                      timestamp: new Date().toISOString(),
                    };
                    const blob = new Blob([JSON.stringify(errorData, null, 2)], {
                      type: 'application/json'
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `ml-error-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Download Error Report"
                >
                  <Download className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Recovery Suggestions */}
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h4 className="text-sm font-medium text-blue-400 mb-2">Recovery Suggestions:</h4>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• Check your internet connection</li>
                <li>• Try refreshing the page</li>
                <li>• Clear your browser cache</li>
                <li>• Contact support if the problem persists</li>
              </ul>
            </div>
          </motion.div>
        </AnimatePresence>
      );
    }

    return this.props.children;
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }
}

// Higher-order component for wrapping ML components
export function withMLErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <MLErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </MLErrorBoundary>
  );

  WrappedComponent.displayName = `withMLErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for handling ML errors in functional components
export function useMLErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    console.error('ML Error:', error);
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  React.useEffect(() => {
    if (error) {
      // Log to monitoring service
      console.log('ML Error logged:', error);
    }
  }, [error]);

  return { error, handleError, clearError };
}

// Global ML error handler
export class GlobalMLErrorHandler {
  private static instance: GlobalMLErrorHandler;
  private errorListeners: ((error: Error) => void)[] = [];

  static getInstance(): GlobalMLErrorHandler {
    if (!GlobalMLErrorHandler.instance) {
      GlobalMLErrorHandler.instance = new GlobalMLErrorHandler();
    }
    return GlobalMLErrorHandler.instance;
  }

  addErrorListener(listener: (error: Error) => void): void {
    this.errorListeners.push(listener);
  }

  removeErrorListener(listener: (error: Error) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  handleError(error: Error): void {
    console.error('Global ML Error:', error);

    // Notify all listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });

    // Send to monitoring service
    this.sendToMonitoring(error);
  }

  private sendToMonitoring(error: Error): void {
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      source: 'global-ml-handler',
    };

    // In production, send to monitoring service
    console.log('Sending error to monitoring:', errorData);
  }
}

// Export singleton instance
export const globalMLErrorHandler = GlobalMLErrorHandler.getInstance();