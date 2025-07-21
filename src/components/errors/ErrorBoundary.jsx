import React, { Component } from 'react';
import { errorHandlingService } from '../../services/errorHandlingService';
import { loggingService } from '../../services/loggingService';
import ErrorFallback from './ErrorFallback';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    // Generate error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log error details
    const errorContext = {
      componentStack: errorInfo.componentStack,
      errorBoundary: this.props.name || 'Root',
      props: this.props,
      retryCount: this.state.retryCount,
      errorId
    };

    // Handle the error
    errorHandlingService.handleError(error, errorContext).then(handling => {
      // Log to our logging service
      loggingService.captureException(error, {
        ...errorContext,
        handling: handling.handling
      });
    });

    // Update state with error info
    this.setState({
      errorInfo,
      errorId
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    });

    // Call optional reset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback component
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          errorId: this.state.errorId,
          retry: this.handleRetry,
          reset: this.handleReset
        });
      }

      // Default fallback component
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          retry={this.handleRetry}
          reset={this.handleReset}
          showDetails={this.props.showDetails}
        />
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  const WrappedComponent = props => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for error handling in functional components
export function useErrorHandler() {
  return (error, errorInfo) => {
    errorHandlingService.handleError(error, {
      component: 'FunctionalComponent',
      errorInfo
    }).then(handling => {
      loggingService.captureException(error, {
        errorInfo,
        handling: handling.handling
      });
    });

    // Re-throw to let Error Boundary catch it
    throw error;
  };
}

export default ErrorBoundary;
