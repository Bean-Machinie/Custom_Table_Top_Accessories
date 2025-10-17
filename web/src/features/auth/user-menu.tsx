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

  // Compute derived values before any conditional returns
  const displayName = profile?.displayName?.trim() || user?.user_metadata?.display_name || user?.email || 'Account';
  const avatarUrl = profile?.avatarUrl || (user?.user_metadata?.avatar_url as string | undefined) || '';
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const email = profile?.email || user?.email || '';

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

  return (
    <div className="relative flex flex-col items-end gap-1">
      <DropdownMenuRoot>
        <DropdownMenuTrigger
          showChevron
          label={`Open account menu for ${displayName}`}
          className="rounded-full border border-border/60 bg-background/50 px-3 py-2 hover:bg-muted/20 transition-colors gap-2"
        >
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted/10 text-sm font-semibold text-surface">
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
          <DropdownMenuItem
            onSelect={handleProfile}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            }
          >
            User Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={handleAppearance}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 26 26" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
            }
          >
            Appearance
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleSignOut}
            className="!bg-danger/10 text-danger hover:!bg-danger/20 focus:!bg-danger/20 active:!bg-danger/25 data-[highlighted]:!bg-danger/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="!text-danger">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
            }
          >
            <span className="!text-danger">Sign out</span>
          </DropdownMenuItem>
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
