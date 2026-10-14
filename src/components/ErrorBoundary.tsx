import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AutoTube Studio Uncaught Error Boundary Catch:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#08090D] text-white p-6 select-none font-sans">
          <div className="max-w-md w-full bg-[#12141C] border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-bold text-white mb-2">
              AutoTube Studio Recovery
            </h1>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              The editor encountered an unexpected issue while rendering. You can easily reload or reset to the fresh demo state below.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full mb-6">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold text-xs border border-gray-700 transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Demo</span>
              </button>
            </div>

            {this.state.error && (
              <details className="w-full text-left bg-black/40 border border-gray-800/80 rounded-xl p-3 text-xs">
                <summary className="cursor-pointer text-gray-400 hover:text-gray-200 font-medium">
                  Technical Error Details
                </summary>
                <pre className="mt-2 text-[11px] text-red-300 font-mono whitespace-pre-wrap overflow-x-auto break-all">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
