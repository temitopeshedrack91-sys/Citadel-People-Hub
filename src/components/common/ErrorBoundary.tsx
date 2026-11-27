import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full p-8 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F5F7FA] text-[#111827] border border-[#E5E7EB] flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#111827]">
            {this.props.fallbackTitle || 'Unable to load module'}
          </h3>
          <p className="text-xs text-[#64748B] max-w-md">
            {this.props.fallbackMessage ||
              this.state.error?.message ||
              'An unexpected error occurred while rendering this view. Please try refreshing.'}
          </p>
          <button
            onClick={this.handleReset}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#174EA6] hover:bg-[#0B1F3A] text-white text-xs font-bold transition shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
