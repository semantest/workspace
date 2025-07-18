import React, { Component, ErrorInfo, ReactNode } from 'react';
import { SemantestError } from './base.error';
import { globalErrorHandler } from './error-handler';

/**
 * Props for ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
}

/**
 * State for ErrorBoundary component
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorCount: number;
}

/**
 * React Error Boundary for Semantest applications
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error using global error handler
    globalErrorHandler.handle(error);

    // Update state with error info
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-reset after multiple errors (circuit breaker pattern)
    if (this.state.errorCount >= 3) {
      this.scheduleReset(5000); // Reset after 5 seconds
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetKeys, resetOnPropsChange } = this.props;
    
    // Reset on props change if configured
    if (resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }

    // Reset if resetKeys changed
    if (resetKeys && prevProps.resetKeys?.some((key, index) => key !== resetKeys[index])) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private scheduleReset(delay: number): void {
    this.resetTimeoutId = setTimeout(() => {
      this.resetErrorBoundary();
    }, delay);
  }

  private resetErrorBoundary = (): void => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorCount: 0
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;

      // Use custom fallback if provided
      if (this.props.fallback && error && errorInfo) {
        return this.props.fallback(error, errorInfo);
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          onReset={this.resetErrorBoundary}
          level={this.props.level || 'component'}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
interface DefaultErrorFallbackProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  onReset: () => void;
  level: 'page' | 'section' | 'component';
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  errorInfo,
  onReset,
  level
}) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const semantestError = error instanceof SemantestError ? error : null;

  const containerStyles: React.CSSProperties = {
    padding: level === 'page' ? '2rem' : '1rem',
    margin: level === 'page' ? '0' : '1rem 0',
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '0.25rem',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  };

  return (
    <div style={containerStyles} role="alert" aria-live="assertive">
      <h2 style={{ color: '#dc3545', marginTop: 0 }}>
        {level === 'page' ? 'Page Error' : 
         level === 'section' ? 'Section Error' : 
         'Component Error'}
      </h2>
      
      <p style={{ color: '#495057' }}>
        {semantestError?.getUserMessage() || 
         'Something went wrong. Please try again.'}
      </p>

      {semantestError?.getRecoverySuggestions() && (
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '1rem', color: '#495057' }}>Suggestions:</h3>
          <ul style={{ color: '#6c757d', paddingLeft: '1.5rem' }}>
            {semantestError.getRecoverySuggestions().map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onReset}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: 'pointer',
          fontSize: '1rem'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#0056b3';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#007bff';
        }}
      >
        Try Again
      </button>

      {!isProduction && error && (
        <details style={{ marginTop: '1rem' }}>
          <summary style={{ cursor: 'pointer', color: '#6c757d' }}>
            Error Details (Development Only)
          </summary>
          <pre style={{
            marginTop: '0.5rem',
            padding: '0.5rem',
            backgroundColor: '#f1f3f4',
            borderRadius: '0.25rem',
            fontSize: '0.875rem',
            overflow: 'auto'
          }}>
            {error.stack}
            {errorInfo && `\n\nComponent Stack:${errorInfo.componentStack}`}
          </pre>
        </details>
      )}
    </div>
  );
};

/**
 * HOC to wrap component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

/**
 * Hook to get error boundary context (if using context API)
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    globalErrorHandler.handle(error);
    
    // Re-throw to be caught by nearest error boundary
    throw error;
  };
}