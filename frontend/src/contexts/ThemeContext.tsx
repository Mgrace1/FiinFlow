import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const THEME_STORAGE_KEY = 'finflow_theme_mode';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    return 'light';
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setSystemTheme(media.matches ? 'dark' : 'light');
    handleChange();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  const resolvedTheme: ResolvedTheme = mode === 'system' ? systemTheme : mode;

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('theme-light', 'light');
      body.classList.add('dark');
      body.classList.remove('theme-light', 'light');
    } else {
      root.classList.remove('dark');
      root.classList.remove('theme-dark', 'dark-mode');
      root.classList.add('theme-light');
      body.classList.remove('dark');
      body.classList.remove('theme-dark', 'dark-mode');
      body.classList.add('theme-light');
    }
    root.setAttribute('data-theme', resolvedTheme);
    body.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    localStorage.setItem(THEME_STORAGE_KEY, nextMode);
  };

  const value = useMemo(
    () => ({ mode, resolvedTheme, setMode }),
    [mode, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
};
