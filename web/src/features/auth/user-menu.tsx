import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { useAuth } from '../../stores/auth-store';
import { useProfile } from '../../stores/profile-store';

const getInitials = (label: string) => {
  const parts = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return 'A';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const UserMenu = () => {
  const { mode, status, user, signOut } = useAuth();
  const { profile, status: profileStatus } = useProfile();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleProfile = useCallback(() => {
    navigate('/settings?panel=profile');
  }, [navigate]);

  const handleAppearance = useCallback(() => {
    navigate('/settings?panel=appearance');
  }, [navigate]);

  const handleSignOut = useCallback(async () => {
    setError(null);
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Unable to sign out', err);
      setError('Unable to sign out. Please try again.');
    }
  }, [navigate, signOut]);

  if (mode !== 'auth') {
    return (
      <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-1 text-xs text-muted" role="status">
        Demo mode
      </div>
    );
  }

  if (status === 'loading' || profileStatus === 'loading') {
    return (
      <div className="text-sm text-muted" role="status">
        Connecting…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = profile?.displayName?.trim() || user.user_metadata?.display_name || user.email || 'Account';
  const avatarUrl = profile?.avatarUrl || (user.user_metadata?.avatar_url as string | undefined) || '';
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const email = profile?.email || user.email || '';

  return (
    <div className="relative flex flex-col items-end gap-1">
      <DropdownMenuRoot>
        <DropdownMenuTrigger label={`Open account menu for ${displayName}`} className="focus-visible:focus-ring">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted/10 text-sm font-semibold text-surface">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span aria-hidden>{initials}</span>
            )}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <div className="space-y-1 px-3 pb-2 pt-3" role="presentation">
            <p className="truncate text-sm font-medium text-surface">{displayName}</p>
            {email && (
              <p className="truncate text-xs text-muted" aria-label="Signed in email">
                {email}
              </p>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleProfile}>User Profile</DropdownMenuItem>
          <DropdownMenuItem onSelect={handleAppearance}>Appearance</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleSignOut}>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuRoot>
      {error && (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
