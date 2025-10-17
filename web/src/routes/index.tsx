import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

const LandingPage = lazy(() => import('../pages/landing'));
const EditorPage = lazy(() => import('../pages/editor'));
const SettingsPage = lazy(() => import('../pages/settings'));
const ProtectedRoute = lazy(() => import('./protected-route'));

const AppRouter = () => (
  <Suspense fallback={<div className="p-6 text-lg">Loading editor…</div>}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<EditorPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<Navigate to="/settings?panel=profile" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

export default AppRouter;
