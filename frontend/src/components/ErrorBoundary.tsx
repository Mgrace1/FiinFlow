import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State>{
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ERROR: React Error Boundary caught an error:');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);

    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
      <div style={{
          padding: '40px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          maxWidth: '800px',
          margin: '0 auto',
        }}>
        <div style={{
            background: '#fee',
            border: '2px solid #c33',
            borderRadius: '8px',
            padding: '30px',
          }}>
          <h1 style={{ color: '#c33', marginTop: 0 }}>Application Error</h1>
          <p style={{ fontSize: '18px' }}>
              Something went wrong. Please check the browser console for details.
          </p>

            {this.state.error && (
            <details style={{ marginTop: '20px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
                  Error Details
              </summary>
              <pre style={{
                  background: '#f5f5f5',
                  padding: '15px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '14px',
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
              </pre>
            </details>
            )}

          <div style={{ marginTop: '30px' }}>
            <h3>Troubleshooting Steps:</h3>
            <ol style={{ lineHeight: '1.8' }}>
              <li>Open Browser DevTools (F12) and check the Console tab</li>
              <li>Check the Network tab for failed API requests</li>
              <li>Verify backend is running on <code>http://localhost:5000</code></li>
              <li>Verify VITE_API_URL in .env matches backend URL</li>
              <li>Try refreshing the page</li>
            </ol>
          </div>

          <button
              onClick={() =>window.location.reload()}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
              }}
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

export default ErrorBoundary;
