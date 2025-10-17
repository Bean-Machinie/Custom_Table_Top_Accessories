import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

const LandingPage = lazy(() => import('../pages/landing'));
const EditorPage = lazy(() => import('../pages/editor'));
const ProfilePage = lazy(() => import('../pages/profile'));
const ProtectedRoute = lazy(() => import('./protected-route'));

const AppRouter = () => (
  <Suspense fallback={<div className="p-6 text-lg">Loading editor…</div>}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<EditorPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

export default AppRouter;
