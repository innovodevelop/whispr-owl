import React from 'react';

type Props = { children: React.ReactNode };

type State = { hasError: boolean; error?: any };

export class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error } as State;
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Log to console to surface in Lovable logs tool
    console.error('GlobalErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-md text-center space-y-3">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">An unexpected error occurred while rendering the app.</p>
            <pre className="text-xs text-muted-foreground bg-muted/60 p-3 rounded-md overflow-auto">
              {String(this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
