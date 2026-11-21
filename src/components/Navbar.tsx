'use client';

import React, { useEffect, useState } from 'react';
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
  Laptop,
} from 'lucide-react';
import { useApp } from '@/components/Providers';
import BrandLogo from '@/components/ui/BrandLogo';
import { PrimaryButton } from '@/components/ui/Buttons';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const { auth, theme, resolvedTheme, setTheme, toggleTheme } = useApp();

  useEffect(() => {
    setAvatarError(false);
  }, [auth?.user?.avatar_url]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
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
    <header className="sticky top-0 z-50 w-full border-b border-[#30333A] bg-[#101114]/95 dark:bg-[#101114]/95 light:bg-[#FFFFFF]/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <a href="/" className="group focus:outline-none">
            <BrandLogo size="md" showTagline />
          </a>

          {/* Desktop Nav Links (Visible when logged in) */}
          {auth?.user && (
            <nav className="hidden xl:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#B7F34A]/15 text-[#111318] dark:text-[#B7F34A] border border-[#B7F34A]/40 shadow-glow'
                        : 'text-[#52525B] dark:text-[#D1D5DB] hover:text-[#111318] dark:hover:text-[#FFFFFF] hover:bg-[#F0F2F5] dark:hover:bg-[#232630]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{link.name}</span>
                    {link.badge && (
                      <span className="text-[9px] px-1 py-0.2 rounded-[4px] bg-[#B7F34A]/25 text-[#111318] dark:text-[#B7F34A] font-extrabold">
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
          {/* Theme Selector (Dark, Light, System) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              aria-label="Toggle theme options"
              className="flex items-center justify-center h-9 w-9 rounded-[10px] border border-[#30333A] bg-[#1B1D22] dark:border-[#30333A] dark:bg-[#1B1D22] light:border-[#E1E4E8] light:bg-[#FFFFFF] text-[#9496A1] hover:text-[#F5F5F5] dark:hover:text-white light:hover:text-[#111318] transition-colors"
            >
              {resolvedTheme === 'dark' ? (
                <Moon className="h-4 w-4 text-[#B7F34A]" />
              ) : (
                <Sun className="h-4 w-4 text-[#6BA814]" />
              )}
            </button>

            {themeDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-36 rounded-[10px] border border-[#30333A] bg-[#1B1D22] dark:bg-[#1B1D22] light:bg-white light:border-[#E1E4E8] shadow-xl py-1 text-xs z-50"
                onClick={() => setThemeDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#252830] light:hover:bg-[#F5F6F8] ${
                    theme === 'dark' ? 'text-[#B7F34A] font-bold' : 'text-[#9496A1]'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />
                  <span>Dark Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#252830] light:hover:bg-[#F5F6F8] ${
                    theme === 'light' ? 'text-[#6BA814] font-bold' : 'text-[#9496A1]'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  <span>Light Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#252830] light:hover:bg-[#F5F6F8] ${
                    theme === 'system' ? 'text-[#B7F34A] font-bold' : 'text-[#9496A1]'
                  }`}
                >
                  <Laptop className="h-3.5 w-3.5" />
                  <span>System Auto</span>
                </button>
              </div>
            )}
          </div>

          {/* Admin Link if admin */}
          {auth?.isAdmin && (
            <a
              href="/admin"
              className="hidden sm:flex items-center gap-1.5 rounded-[10px] bg-red-500/15 border border-red-500/35 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/25 transition-colors"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Admin Console</span>
            </a>
          )}

          {/* Subscription Status Badge */}
          {auth?.user && (
            <div className="hidden sm:flex items-center">
              {auth.isPremium ? (
                <div className="flex items-center gap-1.5 rounded-full bg-[#B7F34A]/15 border border-[#B7F34A]/40 px-3 py-1 text-xs font-bold text-[#6BA814] dark:text-[#B7F34A] shadow-[0_0_15px_-4px_rgba(183,243,74,0.3)]">
                  <Sparkles className="h-3.5 w-3.5 fill-current" />
                  <span>PREMIUM</span>
                </div>
              ) : (
                <a
                  href="/checkout"
                  className="flex items-center gap-1.5 rounded-[10px] bg-[#B7F34A] text-[#111318] px-3.5 py-1.5 text-xs font-bold hover:bg-[#A7E438] shadow-glow transition-all active:scale-95"
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
                className="flex items-center gap-2 rounded-[10px] border border-[#30333A] bg-[#1B1D22] dark:border-[#30333A] dark:bg-[#1B1D22] light:border-[#E1E4E8] light:bg-white px-3 py-1.5 text-xs text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111318] hover:border-[#B7F34A]/50 transition-colors"
              >
                {auth.user.avatar_url && !avatarError ? (
                  <img
                    src={auth.user.avatar_url}
                    alt={auth.user.full_name || 'Athlete'}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    className="h-5 w-5 rounded-full object-cover border border-[#B7F34A]/50"
                  />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-[#B7F34A] text-[#111318] flex items-center justify-center font-bold text-[10px]">
                    {auth.user.full_name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                )}
                <span className="hidden md:inline font-semibold">
                  {auth.user.full_name?.split(' ')[0]}
                </span>
              </a>

              <button
                onClick={handleLogout}
                title="Logout"
                className="rounded-[10px] p-2 text-[#52525B] dark:text-[#D1D5DB] hover:text-red-400 hover:bg-[#F0F2F5] dark:hover:bg-[#232630] transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <a
                href="/login"
                className="text-xs font-bold text-[#52525B] dark:text-[#E5E7EB] hover:text-[#111318] dark:hover:text-white px-3 py-1.5 rounded-[10px] hover:bg-[#F0F2F5] dark:hover:bg-[#232630] transition-colors"
              >
                Sign In
              </a>
              <a
                href="/signup"
                className="btn-primary flex items-center gap-1 px-4 py-2 text-xs font-bold"
              >
                <span>Get Started</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden rounded-[10px] p-2 text-[#9496A1] hover:text-white hover:bg-[#1B1D22] transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-b border-[#30333A] bg-[#101114] dark:bg-[#101114] light:bg-white px-4 pt-3 pb-6 space-y-3">
          {auth?.user && (
            <div className="pb-3 border-b border-[#30333A] light:border-[#E1E4E8] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111318]">
                  {auth.user.full_name}
                </p>
                <p className="text-[11px] text-[#9496A1]">{auth.user.email || 'Connected via Social Login'}</p>
              </div>
              <div>
                {auth.isPremium ? (
                  <span className="text-[10px] font-bold text-[#B7F34A] bg-[#B7F34A]/15 border border-[#B7F34A]/40 px-2 py-0.5 rounded-full">
                    PREMIUM
                  </span>
                ) : (
                  <a
                    href="/checkout"
                    className="btn-primary px-3 py-1 text-[11px]"
                  >
                    UPGRADE (₹100)
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 p-2.5 rounded-[10px] text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#B7F34A]/15 text-[#111318] dark:text-[#B7F34A] border border-[#B7F34A]/40'
                      : 'text-[#52525B] dark:text-[#E5E7EB] dark:bg-[#1B1D22] dark:border dark:border-[#30333A] hover:text-[#111318] dark:hover:text-white dark:hover:bg-[#232630]'
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
              className="flex items-center gap-2 p-2.5 rounded-[10px] text-xs font-bold text-red-400 bg-red-500/15 border border-red-500/30"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Admin Operations Console</span>
            </a>
          )}

          {!auth?.user && (
            <div className="pt-2 flex flex-col gap-2">
              <a
                href="/login"
                className="w-full text-center py-2.5 rounded-[10px] border border-[#30333A] text-xs font-semibold text-white"
              >
                Sign In
              </a>
              <a
                href="/signup"
                className="btn-primary w-full text-center py-2.5 text-xs font-bold"
              >
                Create Account
              </a>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
