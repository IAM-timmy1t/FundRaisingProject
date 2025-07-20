import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppWrapper from '@/App';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { AppLogicProvider } from '@/hooks/useAppLogic';
import '@/i18n';
import '@/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppLogicProvider>
          <AppWrapper />
        </AppLogicProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);