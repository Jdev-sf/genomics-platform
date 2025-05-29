// components/error-boundaries/error-boundary.tsx
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'feature';
  name?: string;
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo?: ErrorInfo;
  resetError: () => void;
  errorId: string;
  level: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    this.logError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId,
      boundaryName: this.props.name,
      level: this.props.level || 'component',
    };

    // Send to logging service (replace with actual implementation)
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to external monitoring service
      // logToMonitoringService(errorData);
    }
    
    console.error('Error logged:', errorData);
  };

  private resetError = () => {
    this.retryCount++;
    
    if (this.retryCount <= this.maxRetries) {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: '',
      });
    } else {
      // Max retries reached, show different UI
      console.warn('Max error boundary retries reached');
    }
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || this.getDefaultFallback();
      
      return (
        <FallbackComponent
          error={this.state.error!}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          errorId={this.state.errorId}
          level={this.props.level || 'component'}
        />
      );
    }

    return this.props.children;
  }

  private getDefaultFallback() {
    const level = this.props.level || 'component';
    
    switch (level) {
      case 'page':
        return PageErrorFallback;
      case 'feature':
        return FeatureErrorFallback;
      default:
        return ComponentErrorFallback;
    }
  }
}

// Page-level error fallback
function PageErrorFallback({ error, resetError, errorId }: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-900">Page Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 text-center">
            Something went wrong with this page. Please try refreshing or contact support.
          </p>

          {isDevelopment && (
            <Alert>
              <Bug className="h-4 w-4" />
              <AlertDescription>
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium text-red-700 mb-2">
                    Error Details (Development)
                  </summary>
                  <pre className="whitespace-pre-wrap text-red-600 overflow-auto max-h-32">
                    {error.message}
                    {'\n\n'}
                    {error.stack}
                  </pre>
                </details>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={resetError} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'} className="flex-1">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Error ID: {errorId}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Feature-level error fallback
function FeatureErrorFallback({ error, resetError, errorId, level }: ErrorFallbackProps) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Feature Unavailable
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-red-700">
          This feature is temporarily unavailable due to an error.
        </p>
        <div className="flex gap-2">
          <Button onClick={resetError} size="sm" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
        <p className="text-xs text-red-600">
          Error ID: {errorId}
        </p>
      </CardContent>
    </Card>
  );
}

// Component-level error fallback
function ComponentErrorFallback({ error, resetError, errorId }: ErrorFallbackProps) {
  return (
    <div className="border border-red-200 bg-red-50 rounded-lg p-4">
      <div className="flex items-center gap-2 text-red-800 mb-2">
        <AlertTriangle className="w-4 h-4" />
        <span className="font-medium">Component Error</span>
      </div>
      <p className="text-red-700 text-sm mb-3">
        This component failed to load properly.
      </p>
      <Button onClick={resetError} size="sm" variant="outline">
        <RefreshCw className="w-3 h-3 mr-1" />
        Retry
      </Button>
      {process.env.NODE_ENV === 'development' && (
        <p className="text-xs text-red-600 mt-2">
          {error.message}
        </p>
      )}
    </div>
  );
}

// Specialized error boundaries for specific features
export function ApiErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      level="feature"
      name="API"
      fallback={({ error, resetError, errorId }) => (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              API Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-red-700">Failed to load data from the server.</p>
            <Button onClick={resetError} size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <p className="text-xs text-red-600">Error ID: {errorId}</p>
          </CardContent>
        </Card>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

export function TableErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      level="component"
      name="Table"
      fallback={({ resetError, errorId }) => (
        <div className="border rounded-lg p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <h3 className="font-medium text-red-900 mb-2">Table Loading Error</h3>
          <p className="text-red-700 text-sm mb-4">
            Unable to display table data.
          </p>
          <Button onClick={resetError} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
          <p className="text-xs text-red-600 mt-2">Error ID: {errorId}</p>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

export function ChartErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      level="component"
      name="Chart"
      fallback={({ resetError, errorId }) => (
        <div className="border rounded-lg p-6 text-center bg-gray-50">
          <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 text-sm mb-3">Chart failed to render</p>
          <Button onClick={resetError} size="sm" variant="outline">
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
          <p className="text-xs text-red-600 mt-2">Error ID: {errorId}</p>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// Hook for error reporting from functional components
export function useErrorHandler() {
  const reportError = (error: Error, context?: string) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    console.error('Error reported via useErrorHandler:', errorData);
    
    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // logToMonitoringService(errorData);
    }
  };

  return { reportError };
}

export default ErrorBoundary;