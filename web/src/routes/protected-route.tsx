import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../stores/auth-store';

const ProtectedRoute = () => {
  const { mode, status } = useAuth();
  const location = useLocation();

  if (mode !== 'auth') {
    return <Outlet />;
  }

  if (status === 'loading') {
    return <div className="p-6 text-sm text-muted">Checking your session…</div>;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
