import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/button';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { useAuth } from '../../stores/auth-store';

export const UserMenu = () => {
  const { mode, status, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleProfile = useCallback(() => {
    navigate('/profile');
  }, [navigate]);

  const handleSignOut = useCallback(async () => {
    setError(null);
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
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

  if (status === 'loading') {
    return (
      <div className="text-sm text-muted" role="status">
        Connecting…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const label = (user.user_metadata?.display_name as string | undefined) ?? user.email ?? 'Account';

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenuRoot>
        <DropdownMenuTrigger>
          <Button variant="ghost" size="sm">
            {label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={handleProfile}>Profile</DropdownMenuItem>
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
