import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ hasError: true, error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '600px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h1 style={{ color: '#ef4444', marginBottom: '20px', fontSize: '24px' }}>
              ⚠️ Something went wrong
            </h1>
            <pre style={{
              background: '#f3f4f6',
              padding: '20px',
              borderRadius: '10px',
              overflow: 'auto',
              fontSize: '12px',
              color: '#1f2937'
            }}>
              {this.state.error && this.state.error.toString()}
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '20px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
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
