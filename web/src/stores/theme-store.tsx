import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo } from 'react';

import { useLocalStorage } from '../hooks/use-local-storage';

export type ThemeId = 'midnight-workshop' | 'aurora-green' | 'velvet-night' | 'desert-clay';

export interface ThemePreset {
  id: ThemeId;
  label: string;
  description: string;
  mode: 'dark' | 'light';
  preview: [string, string, string];
}

const themePresets: ThemePreset[] = [
  {
    id: 'midnight-workshop',
    label: 'Midnight Workshop',
    description: 'Deep contrast with electric accents built for late-night tinkering.',
    mode: 'dark',
    preview: ['#0f1014', '#8c5ef0', '#38bdf8']
  },
  {
    id: 'aurora-green',
    label: 'Aurora Green',
    description: 'Cool teal gradients inspired by aurora-lit makerspaces.',
    mode: 'dark',
    preview: ['#0d1f1a', '#2dd4bf', '#34d399']
  },
  {
    id: 'velvet-night',
    label: 'Velvet Night',
    description: 'Vibrant magenta and amber pairings on a plush midnight canvas.',
    mode: 'dark',
    preview: ['#1a1025', '#d946ef', '#f59e0b']
  },
  {
    id: 'desert-clay',
    label: 'Desert Clay',
    description: 'Warm desert neutrals with sun-baked copper accents.',
    mode: 'light',
    preview: ['#fef3e7', '#ea580c', '#f59e0b']
  }
];

interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemePreset;
  themes: ThemePreset[];
  setTheme: (themeId: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const defaultTheme: ThemeId = 'midnight-workshop';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [storedTheme, setStoredTheme] = useLocalStorage<ThemeId>('cta-theme', defaultTheme, {
    deserialize: (value) => {
      if (typeof value !== 'string') return defaultTheme;
      return (themePresets.find((preset) => preset.id === value)?.id ?? defaultTheme) as ThemeId;
    }
  });

  const activeTheme = useMemo(
    () => themePresets.find((preset) => preset.id === storedTheme) ?? themePresets[0],
    [storedTheme]
  );

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = activeTheme.id;
    if (activeTheme.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [activeTheme]);

  const setTheme = useCallback(
    (themeId: ThemeId) => {
      const next = themePresets.find((preset) => preset.id === themeId);
      setStoredTheme(next ? next.id : defaultTheme);
    },
    [setStoredTheme]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId: activeTheme.id,
      theme: activeTheme,
      themes: themePresets,
      setTheme
    }),
    [activeTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const getThemePresets = () => themePresets;
