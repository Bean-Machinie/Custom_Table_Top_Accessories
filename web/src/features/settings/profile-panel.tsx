import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '../../components/ui/button';
import { Panel } from '../../components/ui/panel';
import { useAuth } from '../../stores/auth-store';
import { isColumnMissingError, useProfile } from '../../stores/profile-store';

const AVATAR_BUCKET = (import.meta.env.VITE_SUPABASE_BUCKET as string | undefined) ?? 'assets';
const AVATAR_BASE_PATH = 'assets';
const DISPLAY_NAME_LIMIT = 80;
const BIO_LIMIT = 300;

const normaliseUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return url.toString();
  } catch (error) {
    return trimmed;
  }
};

export const ProfilePanel = () => {
  const { mode, status, supabase, user } = useAuth();
  const {
    profile,
    status: profileStatus,
    error: profileLoadError,
    updateProfile,
    supportsBio,
    supportsSocialLinks,
    setSupports
  } = useProfile();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? '');
    setBio(profile.bio ?? '');
    setWebsite(profile.socialLinks?.website ?? '');
    setTwitter(profile.socialLinks?.twitter ?? '');
    setAvatarFile(null);
    setAvatarPreview(null);
  }, [profile]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const currentAvatar = useMemo(() => {
    if (avatarPreview) return avatarPreview;
    return profile?.avatarUrl ?? '';
  }, [avatarPreview, profile?.avatarUrl]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (mode !== 'auth' || status !== 'authenticated' || !user || !supabase) {
      setError('Authentication is required to update your profile.');
      return;
    }

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError('Display name is required.');
      return;
    }
    if (trimmedName.length > DISPLAY_NAME_LIMIT) {
      setError(`Display name must be ${DISPLAY_NAME_LIMIT} characters or fewer.`);
      return;
    }
    if (bio.length > BIO_LIMIT) {
      setError(`Bio must be ${BIO_LIMIT} characters or fewer.`);
      return;
    }

    const websiteUrl = normaliseUrl(website);
    const twitterUrl = normaliseUrl(twitter);
    const socialLinks: Record<string, string> = {};
    if (supportsSocialLinks && websiteUrl) {
      socialLinks.website = websiteUrl;
    }
    if (supportsSocialLinks && twitterUrl) {
      socialLinks.twitter = twitterUrl;
    }

    setSaving(true);

    try {
      let avatarUrl = profile?.avatarUrl ?? null;
      if (avatarFile) {
        const path = [AVATAR_BASE_PATH, user.id, 'avatar.png'].join('/');
        const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, avatarFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: avatarFile.type
        });
        if (uploadError) {
          throw uploadError;
        }
        const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
        avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
      }

      const payload: Record<string, unknown> = {
        id: user.id,
        display_name: trimmedName,
        avatar_url: avatarUrl
      };

      if (supportsBio) {
        payload.bio = bio.trim() ? bio.trim() : null;
      }
      if (supportsSocialLinks) {
        payload.social_links = Object.keys(socialLinks).length > 0 ? socialLinks : null;
      }

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });

      if (upsertError) {
        const lowered = upsertError.message.toLowerCase();
        let retried = false;
        const capabilityUpdate: Partial<{ bio: boolean; socialLinks: boolean }> = {};

        if (supportsBio && isColumnMissingError(upsertError, 'bio')) {
          capabilityUpdate.bio = false;
          delete payload.bio;
          retried = true;
        }
        if (supportsSocialLinks && isColumnMissingError(upsertError, 'social_links')) {
          capabilityUpdate.socialLinks = false;
          delete payload.social_links;
          retried = true;
        }

        if (Object.keys(capabilityUpdate).length > 0) {
          setSupports(capabilityUpdate);
        }

        if (retried) {
          const { error: retryError } = await supabase
            .from('profiles')
            .upsert(payload, { onConflict: 'id' });
          if (retryError) {
            throw retryError;
          }
          setMessage('Profile saved. Some fields are not available for this workspace.');
        } else {
          throw upsertError;
        }
      } else {
        setMessage('Profile saved.');
      }

      updateProfile({
        displayName: trimmedName,
        avatarUrl,
        bio: supportsBio ? bio : profile?.bio ?? '',
        socialLinks: {
          website: supportsSocialLinks ? websiteUrl : profile?.socialLinks.website ?? '',
          twitter: supportsSocialLinks ? twitterUrl : profile?.socialLinks.twitter ?? ''
        }
      });

      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
      setAvatarFile(null);
    } catch (err) {
      console.error('Unable to save profile', err);
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const disabled = saving || profileStatus === 'loading';

  return (
    <Panel className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-surface">User Profile</h2>
        <p className="text-sm text-muted">Update how your information appears across the playground.</p>
      </header>
      {mode !== 'auth' && (
        <div className="rounded-md border border-border/60 bg-muted/10 px-3 py-2 text-sm text-muted" role="note">
          Profiles are not available in demo mode. Configure Supabase credentials and sign in to edit your account details.
        </div>
      )}
      {mode === 'auth' && profileLoadError && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {profileLoadError}
        </div>
      )}
      {mode === 'auth' && (
        <form className="space-y-6" onSubmit={handleSubmit}>
          <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted/10 text-lg font-semibold text-surface">
                {currentAvatar ? (
                  <img src={currentAvatar} alt="Current avatar" className="h-full w-full object-cover" />
                ) : (
                  <span aria-hidden>{getInitials(displayName || profile?.email || 'Account')}</span>
                )}
              </span>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <Button type="button" variant="surface" size="sm" onClick={() => fileInputRef.current?.click()} disabled={disabled}>
                    Upload avatar
                  </Button>
                  {currentAvatar && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (avatarPreview) {
                          URL.revokeObjectURL(avatarPreview);
                        }
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                      disabled={disabled}
                    >
                      Reset
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted">PNG or JPG up to 4MB.</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif"
              className="sr-only"
              onChange={handleAvatarChange}
              aria-label="Upload avatar"
            />
          </section>
          <div className="grid gap-1">
            <label className="text-sm font-medium" htmlFor="displayName">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus-visible:focus-ring"
              disabled={disabled}
              maxLength={DISPLAY_NAME_LIMIT + 10}
              required
            />
            <p className="text-xs text-muted">This appears in shared workspaces and collaborative canvases.</p>
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={profile?.email ?? ''}
              readOnly
              className="w-full cursor-not-allowed rounded-md border border-border/40 bg-muted/10 px-3 py-2 text-sm text-muted"
            />
          </div>
          {supportsBio ? (
            <div className="grid gap-1">
              <label className="text-sm font-medium" htmlFor="bio">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                className="min-h-[96px] w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus-visible:focus-ring"
                maxLength={BIO_LIMIT + 20}
                disabled={disabled}
              />
              <p className="text-xs text-muted">Share a short introduction about yourself (max {BIO_LIMIT} characters).</p>
            </div>
          ) : (
            <div className="rounded-md border border-border/40 bg-muted/10 px-3 py-2 text-xs text-muted" role="note">
              The optional bio field is not available on this Supabase project.
            </div>
          )}
          {supportsSocialLinks ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1">
                <label className="text-sm font-medium" htmlFor="website">
                  Website
                </label>
                <input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus-visible:focus-ring"
                  disabled={disabled}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium" htmlFor="twitter">
                  Twitter / X
                </label>
                <input
                  id="twitter"
                  type="url"
                  value={twitter}
                  onChange={(event) => setTwitter(event.target.value)}
                  placeholder="https://twitter.com/handle"
                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus-visible:focus-ring"
                  disabled={disabled}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-border/40 bg-muted/10 px-3 py-2 text-xs text-muted" role="note">
              Social links are unavailable for this Supabase schema.
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={disabled}>
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={() => {
                setDisplayName(profile?.displayName ?? '');
                setBio(profile?.bio ?? '');
                setWebsite(profile?.socialLinks.website ?? '');
                setTwitter(profile?.socialLinks.twitter ?? '');
                if (avatarPreview) {
                  URL.revokeObjectURL(avatarPreview);
                }
                setAvatarFile(null);
                setAvatarPreview(null);
                setError(null);
                setMessage(null);
              }}
            >
              Reset changes
            </Button>
          </div>
          {profileStatus === 'loading' && (
            <p className="text-sm text-muted" role="status">
              Loading profile…
            </p>
          )}
          {error && (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </div>
          )}
          {message && (
            <p className="text-sm text-muted" role="status">
              {message}
            </p>
          )}
        </form>
      )}
    </Panel>
  );
};

const getInitials = (label: string) => {
  const parts = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return 'A';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
