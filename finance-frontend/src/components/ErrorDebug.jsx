import React from 'react';

class ErrorDebug extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("Uncaught error:", error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  handleGlobalError = (event) => {
    this.setState({
      hasError: true,
      error: event.error || new Error(event.message),
      errorInfo: { componentStack: 'Global Error (e.g., inside event handler)' }
    });
  };

  handlePromiseRejection = (event) => {
    this.setState({
      hasError: true,
      error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      errorInfo: { componentStack: 'Unhandled Promise Rejection' }
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen bg-gray-900 text-red-400 p-8 font-mono flex flex-col items-start justify-start overflow-auto">
          <div className="max-w-5xl w-full mx-auto border border-red-500/30 bg-gray-800 p-6 rounded-lg shadow-2xl">
            <h1 className="text-3xl font-bold text-red-500 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Application Error Detected
            </h1>

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-300 mb-2">Current URL:</h2>
              <div className="bg-gray-950 p-3 rounded border border-gray-700 text-blue-400 break-all">
                {window.location.href}
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-300 mb-2">Error Message:</h2>
              <div className="bg-gray-950 p-3 rounded border border-gray-700 text-red-300 break-all">
                {this.state.error && this.state.error.toString()}
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-300 mb-2">Component Stack Trace:</h2>
              <pre className="bg-gray-950 p-4 rounded border border-gray-700 text-sm overflow-x-auto text-green-400 whitespace-pre-wrap">
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </div>

            {this.state.error && this.state.error.stack && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-300 mb-2">Error Stack:</h2>
                <pre className="bg-gray-950 p-4 rounded border border-gray-700 text-sm overflow-x-auto text-yellow-400 whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded transition-colors duration-200"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorDebug;
