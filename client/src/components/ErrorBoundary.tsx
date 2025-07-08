import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Suppress specific WebSocket and unhandled rejection errors
    if (error.message.includes('WebSocket') || 
        error.message.includes('DOMException') ||
        error.message.includes('InvalidStateError') ||
        error.message.includes('Cannot read properties of undefined')) {
      // These are infrastructure errors we can ignore
      console.debug('Suppressed infrastructure error:', error.message);
      return;
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.resetError}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Default fallback component
export const DefaultErrorFallback: React.FC<{ error?: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => (
  <div className="p-8 text-center bg-red-50 border border-red-200 rounded-lg">
    <h3 className="text-lg font-semibold text-red-800 mb-2">Component Error</h3>
    <p className="text-red-600 mb-4 text-sm">
      {error?.message || 'A component failed to render properly'}
    </p>
    <button
      onClick={resetError}
      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
    >
      Reload Component
    </button>
  </div>
);

// Global error handler setup
export const setupGlobalErrorHandling = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.debug('Unhandled promise rejection (suppressed):', event.reason);
    
    // Suppress specific WebSocket and infrastructure errors
    if (event.reason?.message?.includes('WebSocket') ||
        event.reason?.message?.includes('DOMException') ||
        event.reason?.message?.includes('InvalidStateError') ||
        event.reason?.toString?.()?.includes('WebSocket')) {
      event.preventDefault(); // Prevent console errors
      return;
    }
    
    // Allow other legitimate errors to be logged
    console.error('Legitimate unhandled rejection:', event.reason);
  });

  // Handle generic errors
  window.addEventListener('error', (event) => {
    if (event.error?.message?.includes('WebSocket') ||
        event.error?.message?.includes('DOMException')) {
      event.preventDefault();
      return;
    }
    
    console.error('Global error:', event.error);
  });
};