import React, { Component, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] flex flex-col items-center justify-center text-center p-8 rounded-xl bg-white border border-gray-200">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <h3 className="font-bold text-sm text-gray-800 mb-1">
            {this.props.fallbackTitle || 'Something went wrong'}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mb-4">
            An unexpected error occurred in this section. This has been logged and will be investigated.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#0A66C2] border border-[#0A66C2] rounded-full hover:bg-blue-50 transition-colors"
          >
            <RefreshCw size={13} /> Reload Page
          </button>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <details className="mt-4 text-left w-full max-w-sm">
              <summary className="text-[10px] text-gray-400 cursor-pointer">Error details (dev only)</summary>
              <pre className="mt-2 text-[10px] text-red-600 bg-red-50 p-2 rounded overflow-x-auto">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
