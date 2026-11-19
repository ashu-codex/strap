'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

export interface AuthStatus {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  } | null;
  subscription: {
    id?: string;
    plan: string;
    status: string;
    current_period_end?: string | null;
  } | null;
  isPremium: boolean;
  isAdmin: boolean;
}

export interface AppContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  auth: AuthStatus | null;
  authLoading: boolean;
  refreshAuth: () => Promise<AuthStatus | null>;
}

const AppContext = createContext<AppContextValue | null>(null);

function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeClasses(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
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
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const applyTheme = useCallback((mode: ThemeMode) => {
    const resolved = mode === 'system' ? resolveSystemTheme() : mode;
    setResolvedTheme(resolved);
    applyThemeClasses(resolved);

    try {
      localStorage.setItem('strap-theme', mode);
      document.cookie = `strap_theme=${mode}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // ignore storage errors
    }
  }, []);

  const setTheme = useCallback(
    (next: ThemeMode) => {
      setThemeState(next);
      applyTheme(next);
    },
    [applyTheme]
  );

  const toggleTheme = useCallback(() => {
    // If dark, switch to light; if light, switch to dark
    const next: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

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
    let initialMode: ThemeMode = 'dark';
    try {
      const stored = localStorage.getItem('strap-theme') as ThemeMode | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        initialMode = stored;
      }
    } catch {
      // ignore
    }

    setThemeState(initialMode);
    applyTheme(initialMode);
    refreshAuth();

    // Listen to system theme changes if mode is 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      const current = (localStorage.getItem('strap-theme') as ThemeMode) || 'dark';
      if (current === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);

    // Cross-tab and window listeners
    const onFocus = () => refreshAuth();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshAuth();
    };
    const onCustom = () => refreshAuth();

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('strap-auth-refresh', onCustom);
    const interval = window.setInterval(refreshAuth, 10000);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('strap-auth-refresh', onCustom);
      window.clearInterval(interval);
    };
  }, [applyTheme, refreshAuth]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
      auth,
      authLoading,
      refreshAuth,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme, auth, authLoading, refreshAuth]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
