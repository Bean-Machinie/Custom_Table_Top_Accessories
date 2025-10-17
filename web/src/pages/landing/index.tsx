import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/button';
import { useAuth } from '../../stores/auth-store';

const LandingPage = () => {
  const { mode, status, signIn, signUp, globalError, clearGlobalError } = useAuth();
  const navigate = useNavigate();
  const [formMode, setFormMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authEnabled = mode === 'auth';

  useEffect(() => {
    if (authEnabled && status === 'authenticated') {
      navigate('/app', { replace: true });
    }
  }, [authEnabled, status, navigate]);

  useEffect(() => {
    if (globalError) {
      setError(globalError);
      clearGlobalError();
    }
  }, [globalError, clearGlobalError]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!authEnabled) {
      setMessage('Authentication is not configured. You can explore the demo editor instead.');
      return;
    }
    setSubmitting(true);
    setMessage(null);
    setError(null);
    const action = formMode === 'sign-in' ? signIn : signUp;
    const result = await action(email, password);
    if (result.error) {
      setError(result.error);
    } else if (result.message) {
      setMessage(result.message);
    } else {
      navigate('/app');
    }
    setSubmitting(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border/60 bg-card p-8 shadow-sm">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Custom Table Top Accessories</h1>
          <p className="text-sm text-muted">
            Sign in to access your personal playground or create an account to get started.
          </p>
        </header>
        {!authEnabled && (
          <div className="rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
            Authentication is not configured. Configure Supabase credentials to enable sign in, or continue in demo mode.
          </div>
        )}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant={formMode === 'sign-in' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFormMode('sign-in')}
          >
            Sign In
          </Button>
          <Button
            variant={formMode === 'sign-up' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFormMode('sign-up')}
          >
            Sign Up
          </Button>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-left text-sm font-medium">
            Email
            <input
              type="email"
              className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus-visible:focus-ring"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              disabled={!authEnabled || submitting || status === 'loading'}
            />
          </label>
          <label className="block text-left text-sm font-medium">
            Password
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus-visible:focus-ring"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={formMode === 'sign-in' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              disabled={!authEnabled || submitting || status === 'loading'}
            />
          </label>
          <Button type="submit" fullWidth disabled={submitting || status === 'loading'}>
            {submitting ? 'Please wait…' : formMode === 'sign-in' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>
        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </div>
        )}
        {message && <p className="text-sm text-muted" role="status">{message}</p>}
        {!authEnabled && (
          <Button type="button" variant="surface" fullWidth onClick={() => navigate('/app')}>
            Explore demo editor
          </Button>
        )}
      </div>
    </main>
  );
};

export default LandingPage;
