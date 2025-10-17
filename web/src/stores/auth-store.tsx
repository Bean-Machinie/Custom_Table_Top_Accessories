import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import { getSupabaseClient, isSupabaseConfigured } from '../adapters/supabase-client';

type AuthStatus = 'loading' | 'authenticated' | 'signed-out' | 'error';
type AuthMode = 'auth' | 'demo';

export interface AuthResult {
  error?: string;
  message?: string;
}

interface AuthContextValue {
  mode: AuthMode;
  status: AuthStatus;
  configured: boolean;
  user: User | null;
  supabase: SupabaseClient | null;
  globalError: string | null;
  clearGlobalError: () => void;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const configured = isSupabaseConfigured();
  const supabase = useMemo(() => {
    if (!configured) return null;
    try {
      return getSupabaseClient();
    } catch (error) {
      console.error('Unable to initialise Supabase client', error);
      return null;
    }
  }, [configured]);

  const mode: AuthMode = configured && supabase ? 'auth' : 'demo';

  const [status, setStatus] = useState<AuthStatus>(mode === 'auth' ? 'loading' : 'signed-out');
  const [user, setUser] = useState<User | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'auth' || !supabase) {
      setStatus('signed-out');
      setUser(null);
      return;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setGlobalError('Unable to restore your session. Please sign in again.');
          setStatus('error');
          setUser(null);
          return;
        }
        setUser(data.session?.user ?? null);
        setStatus(data.session?.user ? 'authenticated' : 'signed-out');
      })
      .catch(() => {
        if (!isMounted) return;
        setGlobalError('Unable to restore your session. Please sign in again.');
        setStatus('error');
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setStatus(session?.user ? 'authenticated' : 'signed-out');
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [mode, supabase]);

  const signIn = useCallback<Required<AuthContextValue>['signIn']>(
    async (email, password) => {
      if (mode !== 'auth' || !supabase) {
        return { error: 'Authentication is not configured for this deployment.' };
      }
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          return { error: error.message };
        }
        return {};
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unable to sign in.' };
      }
    },
    [mode, supabase]
  );

  const signUp = useCallback<Required<AuthContextValue>['signUp']>(
    async (email, password) => {
      if (mode !== 'auth' || !supabase) {
        return { error: 'Authentication is not configured for this deployment.' };
      }
      try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          return { error: error.message };
        }
        if (!data.session) {
          return {
            message: 'Check your inbox to confirm your account before signing in.'
          };
        }
        return {};
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Unable to sign up.' };
      }
    },
    [mode, supabase]
  );

  const signOut = useCallback(async () => {
    if (mode !== 'auth' || !supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setGlobalError('Unable to sign out. Please try again.');
      throw error;
    }
  }, [mode, supabase]);

  const clearGlobalError = useCallback(() => setGlobalError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      mode,
      status,
      configured,
      user,
      supabase,
      globalError,
      clearGlobalError,
      signIn,
      signUp,
      signOut
    }),
    [mode, status, configured, user, supabase, globalError, clearGlobalError, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
