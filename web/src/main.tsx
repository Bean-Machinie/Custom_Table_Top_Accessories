import './styles/tokens.css';
import './styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import AppRouter from './routes';
import { EditorProviders } from './stores/editor-providers';

const rootEl = document.getElementById('root');

if (!rootEl) {
  throw new Error('Root container missing');
}

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <EditorProviders>
        <AppRouter />
      </EditorProviders>
    </BrowserRouter>
  </StrictMode>
);
