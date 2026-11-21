'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

export interface AuthStatus {
  user: {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string | null;
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
  clearAuth: () => void;
}

const AUTH_CACHE_KEY = 'strap-auth-cache';
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

function readCachedAuth(): AuthStatus | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'user' in parsed) {
      return parsed as AuthStatus;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function writeCachedAuth(status: AuthStatus | null) {
  if (typeof window === 'undefined') return;
  try {
    if (status && status.user) {
      sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(status));
    } else {
      sessionStorage.removeItem(AUTH_CACHE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within Providers');
  }
  return ctx;
}

export function useAuth() {
  const { auth, authLoading, refreshAuth, clearAuth } = useApp();
  return { auth, authLoading, refreshAuth, clearAuth };
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
    const next: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  const clearAuth = useCallback(() => {
    writeCachedAuth(null);
    setAuth({ user: null, subscription: null, isPremium: false, isAdmin: false });
    setAuthLoading(false);
  }, []);

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
      writeCachedAuth(next);
      setAuthLoading(false);
      return next;
    } catch {
      setAuthLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    // Strip OAuth redirect fragment cleanly without reloading
    if (typeof window !== 'undefined' && window.location.hash === '#_=_') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    // Hydrate cached auth synchronously so Navbar & pages never flash "Sign In" during navigation
    const cached = readCachedAuth();
    if (cached && cached.user) {
      setAuth(cached);
      setAuthLoading(false);
    }

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
    const interval = window.setInterval(refreshAuth, 60000);

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
      clearAuth,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme, auth, authLoading, refreshAuth, clearAuth]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
