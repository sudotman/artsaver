import React from 'react';

interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ArtSaver] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)',
          color: 'var(--color-text)', fontFamily: 'var(--font-body)',
        }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 300, marginBottom: 12 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20, maxWidth: 400, textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border)',
              borderRadius: 6, padding: '8px 20px', color: 'var(--color-text)',
              fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
