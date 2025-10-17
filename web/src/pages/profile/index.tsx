import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/button';
import { useAuth } from '../../stores/auth-store';

interface ProfileFormState {
  displayName: string;
  avatarUrl: string;
}

const emptyState: ProfileFormState = {
  displayName: '',
  avatarUrl: ''
};

const ProfilePage = () => {
  const { mode, status, supabase, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<ProfileFormState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canEdit = mode === 'auth' && status === 'authenticated' && Boolean(user) && Boolean(supabase);

  useEffect(() => {
    if (!canEdit) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    supabase
      ?.from('profiles')
      .select('display_name, avatar_url')
      .eq('id', user!.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Failed to load profile', error);
          setError('Unable to load your profile. Changes may not persist.');
          return;
        }
        setForm({
          displayName: (data?.display_name as string | null) ?? '',
          avatarUrl: (data?.avatar_url as string | null) ?? ''
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load profile', err);
        setError('Unable to load your profile.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canEdit, supabase, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const { error } = await supabase!
        .from('profiles')
        .update({ display_name: form.displayName, avatar_url: form.avatarUrl })
        .eq('id', user!.id);
      if (error) {
        setError(error.message);
      } else {
        setMessage('Profile updated successfully.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (mode !== 'auth') {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
        <p className="max-w-lg text-sm text-muted">
          Profiles are not available in demo mode. Configure Supabase credentials and sign in to edit your account details.
        </p>
        <Button onClick={() => navigate('/app')} variant="surface">
          Return to editor
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="text-sm text-muted">Manage how your information appears across the playground.</p>
        </div>
        <Button variant="surface" onClick={() => navigate('/app')}>
          Back to editor
        </Button>
      </header>
      <section className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-1">
            <label className="text-sm font-medium" htmlFor="displayName">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={form.displayName}
              onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus-visible:focus-ring"
              disabled={loading || saving}
            />
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium" htmlFor="avatarUrl">
              Avatar image URL
            </label>
            <input
              id="avatarUrl"
              type="url"
              value={form.avatarUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, avatarUrl: event.target.value }))}
              placeholder="https://example.com/avatar.png"
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus-visible:focus-ring"
              disabled={loading || saving}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!canEdit || saving || loading}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setForm(emptyState)}
              disabled={loading || saving}
            >
              Clear
            </Button>
          </div>
        </form>
        {loading && <p className="mt-4 text-sm text-muted">Loading profile…</p>}
        {error && (
          <div className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </div>
        )}
        {message && (
          <p className="mt-4 text-sm text-muted" role="status">
            {message}
          </p>
        )}
      </section>
    </main>
  );
};

export default ProfilePage;
