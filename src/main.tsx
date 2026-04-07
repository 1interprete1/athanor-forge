import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { logRuntimeEvent } from './system/runtimeEvents';

// Global error interceptor
window.addEventListener('error', (event) => {
  logRuntimeEvent({
    type: 'runtime-error',
    message: event.message,
    source: event.filename || 'window.onerror',
    context: { lineno: event.lineno, colno: event.colno, error: event.error?.stack }
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logRuntimeEvent({
    type: 'runtime-error',
    message: event.reason?.message || 'Unhandled Promise Rejection',
    source: 'unhandledrejection',
    context: { reason: event.reason?.stack || event.reason }
  });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
