import './styles/tokens.css';
import './styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import AppRouter from './routes';
import { AuthProvider } from './stores/auth-store';
import { EditorProviders } from './stores/editor-providers';
import { ProfileProvider } from './stores/profile-store';
import { ThemeProvider } from './stores/theme-store';

const rootEl = document.getElementById('root');

if (!rootEl) {
  throw new Error('Root container missing');
}

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ProfileProvider>
            <EditorProviders>
              <AppRouter />
            </EditorProviders>
          </ProfileProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
