import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Public Site ErrorBoundary] Caught render error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream flex items-center justify-center p-6 font-sans text-charcoal">
          <div className="bg-white/80 backdrop-blur-md border border-forest-100 rounded-3xl p-8 md:p-10 max-w-lg w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-forest-50 border border-forest-200 text-forest-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <AlertCircle className="w-8 h-8 text-forest-600" />
            </div>

            <h1 className="text-2xl font-display font-bold text-forest-900 mb-2">
              Something went wrong
            </h1>

            <p className="text-charcoal/70 text-sm leading-relaxed mb-8">
              We encountered an unexpected issue while loading this page. Our team has been notified. Please refresh the page or head back to the homepage.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-forest-600 text-white font-semibold text-sm hover:bg-forest-700 transition shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-forest-50 border border-forest-200 text-forest-700 font-semibold text-sm hover:bg-forest-100 transition"
              >
                <Home className="w-4 h-4" />
                Return to Home
              </button>
            </div>

            {import.meta.env?.DEV && this.state.error && (
              <details className="mt-8 text-left bg-forest-900/5 border border-forest-900/10 rounded-xl p-4 text-xs font-mono text-red-600 overflow-auto max-h-48">
                <summary className="font-semibold cursor-pointer text-charcoal/80 mb-2">
                  Technical Error Details (Dev Only)
                </summary>
                <p className="font-bold mb-1">{this.state.error.toString()}</p>
                <pre className="whitespace-pre-wrap opacity-75">{this.state.errorInfo?.componentStack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
