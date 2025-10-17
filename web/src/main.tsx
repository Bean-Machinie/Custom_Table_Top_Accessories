import './styles/tokens.css';
import './styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import AppRouter from './routes';
import { AuthProvider } from './stores/auth-store';
import { EditorProviders } from './stores/editor-providers';

const rootEl = document.getElementById('root');

if (!rootEl) {
  throw new Error('Root container missing');
}

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <EditorProviders>
          <AppRouter />
        </EditorProviders>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
