import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import 'react-toastify/dist/ReactToastify.css';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';

// Log startup configuration
console.log('='.repeat(60));
console.log('FinFlow Frontend Starting...');
console.log(`Current URL: ${window.location.href}`);
console.log(`API Base URL: ${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`);
console.log(`Mode: ${import.meta.env.MODE}`);
console.log(`Vite Dev: ${import.meta.env.DEV ? 'Yes' : 'No'}`);
console.log('='.repeat(60));

// Validate API URL
const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl) {
  console.warn('WARNING: VITE_API_URL not set in .env file!');
  console.warn('Using default: http://localhost:5000/api');
  console.warn('Create frontend/.env with: VITE_API_URL=http://localhost:5000/api');
}

createRoot(document.getElementById('root')!).render(
<StrictMode>
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
</StrictMode>,
);
