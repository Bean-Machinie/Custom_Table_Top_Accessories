import type { PostgrestError } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from './auth-store';

export interface ProfileSocialLinks {
  website: string;
  twitter: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  socialLinks: ProfileSocialLinks;
  email: string;
}

export type ProfileStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ProfileContextValue {
  profile: UserProfile | null;
  status: ProfileStatus;
  error: string | null;
  refresh: () => Promise<void>;
  setProfile: (profile: UserProfile | null) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  supportsBio: boolean;
  supportsSocialLinks: boolean;
  setSupports: (supports: Partial<{ bio: boolean; socialLinks: boolean }>) => void;
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  social_links?: Record<string, unknown> | null;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const { mode, status, supabase, user } = useAuth();
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [supports, setSupportsState] = useState({ bio: true, socialLinks: true });

  const parseProfile = useCallback(
    (row: ProfileRow | null): UserProfile | null => {
      if (!user) return null;
      const supportsBio = row ? Object.prototype.hasOwnProperty.call(row, 'bio') : supports.bio;
      const supportsSocialLinks = row
        ? Object.prototype.hasOwnProperty.call(row, 'social_links')
        : supports.socialLinks;

      const rawLinks = supportsSocialLinks ? (row?.social_links as Record<string, unknown> | null) : null;

      return {
        id: user.id,
        displayName: (row?.display_name ?? '').toString(),
        avatarUrl: (row?.avatar_url as string | null) ?? null,
        bio: supportsBio ? ((row?.bio as string | null) ?? '') : '',
        socialLinks: {
          website: supportsSocialLinks && rawLinks && typeof rawLinks.website === 'string' ? rawLinks.website : '',
          twitter: supportsSocialLinks && rawLinks && typeof rawLinks.twitter === 'string' ? rawLinks.twitter : ''
        },
        email: user.email ?? ''
      };
    },
    [supports.bio, supports.socialLinks, user]
  );

  const refresh = useCallback(async () => {
    if (mode !== 'auth' || status !== 'authenticated' || !supabase || !user) {
      setProfileState(null);
      setProfileStatus('idle');
      setError(null);
      return;
    }

    setProfileStatus('loading');
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (queryError) {
        throw queryError;
      }

      const typedData = (data as ProfileRow | null) ?? null;
      const nextProfile = parseProfile(typedData);
      if (nextProfile) {
        setSupportsState((prev) => ({
          bio: typedData ? Object.prototype.hasOwnProperty.call(typedData, 'bio') : prev.bio,
          socialLinks: typedData ? Object.prototype.hasOwnProperty.call(typedData, 'social_links') : prev.socialLinks
        }));
        setProfileState(nextProfile);
        setProfileStatus('ready');
        return;
      }

      setProfileState(null);
      setProfileStatus('idle');
    } catch (err) {
      console.error('Failed to load profile', err);
      setProfileState(
        user
          ? {
              id: user.id,
              displayName: '',
              avatarUrl: null,
              bio: '',
              socialLinks: { website: '', twitter: '' },
              email: user.email ?? ''
            }
          : null
      );
      setProfileStatus('error');
      setError('Unable to load your profile.');
    }
  }, [mode, parseProfile, status, supabase, user]);

  useEffect(() => {
    if (mode !== 'auth') {
      setProfileState(null);
      setProfileStatus('idle');
      setError(null);
      return;
    }
    if (status === 'authenticated') {
      void refresh();
    }
    if (status === 'signed-out') {
      setProfileState(null);
      setProfileStatus('idle');
      setError(null);
    }
  }, [mode, refresh, status]);

  const setProfile = useCallback((nextProfile: UserProfile | null) => {
    setProfileState(nextProfile);
  }, []);

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfileState((prev) => {
      if (!prev) return prev;
      return { ...prev, ...patch };
    });
  }, []);

  const setSupports = useCallback((partial: Partial<{ bio: boolean; socialLinks: boolean }>) => {
    setSupportsState((prev) => ({ ...prev, ...partial }));
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      status: profileStatus,
      error,
      refresh,
      setProfile,
      updateProfile,
      supportsBio: supports.bio,
      supportsSocialLinks: supports.socialLinks,
      setSupports
    }),
    [error, profile, profileStatus, refresh, setProfile, setSupports, supports.bio, supports.socialLinks, updateProfile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

export const isColumnMissingError = (error: PostgrestError | null, column: 'bio' | 'social_links') => {
  if (!error) return false;
  return error.message.toLowerCase().includes(`column "${column}`) || error.message.toLowerCase().includes(`${column} does not exist`);
};
