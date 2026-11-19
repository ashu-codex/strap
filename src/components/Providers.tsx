'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'dark' | 'light';

interface AuthStatus {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  } | null;
  subscription: {
    plan: string;
    status: string;
    current_period_end?: string | null;
  } | null;
  isPremium: boolean;
  isAdmin: boolean;
}

interface AppContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  auth: AuthStatus | null;
  authLoading: boolean;
  refreshAuth: () => Promise<AuthStatus | null>;
}

const AppContext = createContext<AppContextValue | null>(null);

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  root.style.colorScheme = theme;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within Providers');
  }
  return ctx;
}

export function useAuth() {
  const { auth, authLoading, refreshAuth } = useApp();
  return { auth, authLoading, refreshAuth };
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem('strap-theme', next);
    } catch {
      // ignore storage errors
    }
    applyThemeClass(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await res.json();
      const next: AuthStatus = {
        user: data.user || null,
        subscription: data.subscription || null,
        isPremium: Boolean(data.isPremium),
        isAdmin: Boolean(data.isAdmin),
      };
      setAuth(next);
      setAuthLoading(false);
      return next;
    } catch {
      setAuthLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    let initial: Theme = 'dark';
    try {
      const stored = localStorage.getItem('strap-theme');
      if (stored === 'light' || stored === 'dark') {
        initial = stored;
      }
    } catch {
      // ignore
    }
    setThemeState(initial);
    applyThemeClass(initial);
    refreshAuth();

    const onFocus = () => {
      refreshAuth();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshAuth();
    };
    const onCustom = () => {
      refreshAuth();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('strap-auth-refresh', onCustom);
    const interval = window.setInterval(refreshAuth, 12000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('strap-auth-refresh', onCustom);
      window.clearInterval(interval);
    };
  }, [refreshAuth]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, auth, authLoading, refreshAuth }),
    [theme, setTheme, toggleTheme, auth, authLoading, refreshAuth]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
