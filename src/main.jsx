import React, { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Diagnostic Exception Handler for Android Mobile WebViews
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Mobile WebView Global Error:', message, source, lineno, colno, error);
  const existing = document.getElementById('mobile-diag-overlay');
  if (existing) return;

  const errDiv = document.createElement('div');
  errDiv.id = 'mobile-diag-overlay';
  errDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#090d16;color:#f87171;padding:24px;z-index:999999;font-family:sans-serif;box-sizing:border-box;overflow:auto;';
  errDiv.innerHTML = `
    <h3 style="color:#38bdf8;margin-top:0;font-size:1.2rem;">IRISH 24/7 Mobile Diagnostic Screen</h3>
    <p style="color:#f8fafc;font-size:0.9rem;"><strong>Error:</strong> ${message}</p>
    <p style="font-size:0.75rem;color:#94a3b8;"><strong>File:</strong> ${source}:${lineno}:${colno}</p>
    <pre style="font-size:0.75rem;background:#000;padding:12px;border-radius:8px;color:#cbd5e1;white-space:pre-wrap;word-break:break-all;">${error ? error.stack : 'No stack trace available'}</pre>
    <button onclick="try{localStorage.clear();}catch(e){};location.reload();" style="padding:12px 20px;background:linear-gradient(135deg,#0284c7,#38bdf8);color:#fff;border:none;border-radius:10px;font-weight:bold;margin-top:16px;cursor:pointer;">Reset App & Reload ➔</button>
  `;
  document.body.appendChild(errDiv);
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('IRISH 24/7 Component Catch:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#090d16',
          color: '#f87171',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: 'sans-serif'
        }}>
          <h2 style={{ color: '#38bdf8', marginBottom: '1rem', fontSize: '1.4rem' }}>IRISH 24/7 System Notice</h2>
          <p style={{ color: '#cbd5e1', maxWidth: 400, marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
            {this.state.error?.message || 'An unexpected initialization issue occurred.'}
          </p>
          <button
            onClick={() => {
              try { localStorage.clear(); } catch(e){}
              window.location.reload();
            }}
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
              color: '#fff',
              border: 'none',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(2,132,199,0.4)'
            }}
          >
            Reset App Cache & Restart ➔
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
