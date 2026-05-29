import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error catcher to render raw runtime failures directly in the DOM
window.addEventListener('error', (event) => {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="padding: 24px; font-family: monospace; background: #FEF2F2; color: #991B1B; border: 1px solid #FCA5A5; margin: 16px; borderRadius: 12px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px;">Runtime Unhandled Error Captured:</h3>
        <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: bold;">${event.message}</p>
        <pre style="margin: 0; font-size: 11px; overflow: auto; background: #fff; padding: 12px; border-radius: 6px; border: 1px solid #F3F4F6;">${event.error?.stack || 'No stack trace available'}</pre>
      </div>
    `;
  }
});

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error: any) {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="padding: 24px; font-family: monospace; background: #FEF2F2; color: #991B1B; border: 1px solid #FCA5A5; margin: 16px; borderRadius: 12px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px;">Bootstrap Initialization Error:</h3>
        <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: bold;">${error?.message || error}</p>
        <pre style="margin: 0; font-size: 11px; overflow: auto; background: #fff; padding: 12px; border-radius: 6px; border: 1px solid #F3F4F6;">${error?.stack || 'No stack trace available'}</pre>
      </div>
    `;
  }
}

