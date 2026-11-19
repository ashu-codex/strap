'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Dumbbell,
  Sparkles,
  Calendar,
  Flame,
  Activity,
  HeartPulse,
  LineChart,
  Bot,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  CreditCard,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { useApp } from '@/components/Providers';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { auth, theme, toggleTheme } = useApp();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    window.location.href = '/login';
  };

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: Activity },
    { name: 'AI Planner', href: '/workout-planner', icon: Calendar, badge: 'AI' },
    { name: 'Tracker', href: '/workout-tracker', icon: Flame },
    { name: 'Exercises', href: '/exercise-library', icon: Dumbbell },
    { name: 'Nutrition', href: '/nutrition', icon: Sparkles },
    { name: 'Recovery', href: '/recovery', icon: HeartPulse },
    { name: 'Analytics', href: '/analytics', icon: LineChart },
    { name: 'AI Coach', href: '/ai-assistant', icon: Bot, badge: 'Gemini' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-card-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <a href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg strap-brand-mark font-black text-xl tracking-tighter shadow-glow transition-transform group-hover:scale-105">
              S
            </div>
            <div className="flex flex-col">
              <span className="strap-brand-word font-extrabold text-lg tracking-wider flex items-center gap-1.5">
                STRAP <span className="strap-brand-ai text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded">AI</span>
              </span>
              <span className="hidden sm:inline-block text-[9px] uppercase tracking-wider text-zinc-400 font-medium">
                Train • Recover • Progress
              </span>
            </div>
          </a>

          {/* Desktop Nav Links (Visible when logged in or on app pages) */}
          {auth?.user && (
            <nav className="hidden xl:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-brand-DEFAULT/10 text-brand-DEFAULT font-semibold border border-brand-DEFAULT/30 shadow-glow'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{link.name}</span>
                    {link.badge && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-brand-DEFAULT/20 text-brand-DEFAULT font-bold">
                        {link.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Action Icons & Auth Profile */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="rounded-lg p-2 text-zinc-400 hover:text-foreground hover:bg-zinc-800/80 transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {/* Admin Link if admin */}
          {auth?.isAdmin && (
            <a
              href="/admin"
              className="hidden sm:flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/30 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Admin Panel</span>
            </a>
          )}

          {/* Subscription Status Badge */}
          {auth?.user && (
            <div className="hidden sm:flex items-center">
              {auth.isPremium ? (
                <div className="flex items-center gap-1.5 rounded-full bg-brand-DEFAULT/10 border border-brand-DEFAULT/40 px-3 py-1 text-xs font-semibold text-brand-DEFAULT shadow-glow">
                  <Sparkles className="h-3.5 w-3.5 fill-brand-DEFAULT" />
                  <span>PREMIUM</span>
                </div>
              ) : (
                <a
                  href="/checkout"
                  className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-all hover:scale-105"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Upgrade (₹100)</span>
                </a>
              )}
            </div>
          )}

          {/* User Profile or Login/Signup buttons */}
          {auth?.user ? (
            <div className="flex items-center gap-2">
              <a
                href="/profile"
                className="flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-700 transition-colors"
              >
                <div className="h-5 w-5 rounded-full bg-brand-DEFAULT/20 text-brand-DEFAULT flex items-center justify-center font-bold text-[10px]">
                  {auth.user.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden md:inline font-medium text-zinc-200">
                  {auth.user.full_name?.split(' ')[0]}
                </span>
              </a>

              <button
                onClick={handleLogout}
                title="Logout"
                className="rounded-lg p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800/80 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <a
                href="/login"
                className="text-xs font-semibold text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
              >
                Sign In
              </a>
              <a
                href="/signup"
                className="btn-primary flex items-center gap-1 px-3.5 py-1.5 text-xs hover:scale-105 strap-primary"
              >
                <span>Get Started</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-b border-zinc-800 bg-zinc-950/95 px-4 pt-3 pb-6 space-y-2">
          {auth?.user && (
            <div className="pb-3 border-b border-zinc-800/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{auth.user.full_name}</p>
                <p className="text-[11px] text-zinc-400">{auth.user.email}</p>
              </div>
              <div>
                {auth.isPremium ? (
                  <span className="text-[10px] font-bold text-brand-DEFAULT bg-brand-DEFAULT/10 border border-brand-DEFAULT/30 px-2 py-0.5 rounded-full">
                    PREMIUM
                  </span>
                ) : (
                  <a
                    href="/checkout"
                    className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full"
                  >
                    UPGRADE (₹100)
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-DEFAULT/10 text-brand-DEFAULT font-semibold border border-brand-DEFAULT/30'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.name}</span>
                </a>
              );
            })}
          </div>

          {auth?.isAdmin && (
            <a
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-2.5 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Admin Management Dashboard</span>
            </a>
          )}

          {!auth?.user && (
            <div className="pt-3 flex flex-col gap-2">
              <a
                href="/login"
                className="w-full text-center py-2 text-xs font-bold text-zinc-300 bg-zinc-900 rounded-lg border border-zinc-800"
              >
                Sign In
              </a>
              <a
                href="/signup"
                className="w-full text-center py-2 text-xs font-bold text-black bg-brand-DEFAULT rounded-lg shadow-glow strap-primary"
              >
                Create Free Account
              </a>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
