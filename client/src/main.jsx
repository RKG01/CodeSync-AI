import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import './index.css';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1234567890-placeholder.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#12121a',
              color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: "'Inter', sans-serif",
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
              padding: '12px 16px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#12121a',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#12121a',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
