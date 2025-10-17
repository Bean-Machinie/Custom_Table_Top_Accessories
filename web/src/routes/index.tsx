import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

const EditorPage = lazy(() => import('../pages/editor'));

const AppRouter = () => (
  <Suspense fallback={<div className="p-6 text-lg">Loading editor…</div>}>
    <Routes>
      <Route path="/*" element={<EditorPage />} />
    </Routes>
  </Suspense>
);

export default AppRouter;
