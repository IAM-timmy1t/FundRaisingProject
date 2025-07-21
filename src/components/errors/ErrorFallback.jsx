import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp, Copy, CheckCircle } from 'lucide-react';

const ErrorFallback = ({ 
  error, 
  errorInfo, 
  errorId, 
  retry, 
  reset, 
  showDetails = false 
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(showDetails);
  const [copied, setCopied] = useState(false);

  const copyErrorDetails = () => {
    const errorDetails = `
Error ID: ${errorId}
Error: ${error?.toString()}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
Time: ${new Date().toISOString()}
    `.trim();

    navigator.clipboard.writeText(errorDetails).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const navigateHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8">
          {/* Error Icon and Title */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="bg-red-100 rounded-full p-3 mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-600">
              We're sorry for the inconvenience. An error occurred while loading this page.
            </p>
          </div>

          {/* Error ID */}
          {errorId && (
            <div className="bg-gray-50 rounded-md p-3 mb-4">
              <p className="text-sm text-gray-600">
                Error ID: <span className="font-mono text-gray-800">{errorId}</span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={retry}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>
            
            <button
              onClick={navigateHome}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Homepage
            </button>
          </div>

          {/* Error Details Toggle */}
          <div className="border-t pt-4">
            <button
              onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span>Technical Details</span>
              {isDetailsOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {/* Error Details Content */}
            {isDetailsOpen && (
              <div className="mt-4 space-y-3">
                <div className="bg-gray-50 rounded-md p-4 text-xs font-mono overflow-x-auto">
                  <div className="space-y-2">
                    <div>
                      <span className="text-gray-600">Error:</span>
                      <pre className="mt-1 text-red-600 whitespace-pre-wrap">
                        {error?.toString()}
                      </pre>
                    </div>
                    
                    {error?.stack && (
                      <div>
                        <span className="text-gray-600">Stack Trace:</span>
                        <pre className="mt-1 text-gray-800 whitespace-pre-wrap text-xs">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={copyErrorDetails}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Error Details
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              If this problem persists, please contact our support team with the error ID above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
