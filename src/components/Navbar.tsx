'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  User as UserIcon,
} from 'lucide-react';
import { useApp } from '@/components/Providers';
import BrandLogo from '@/components/ui/BrandLogo';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const { auth, authLoading, clearAuth, theme, resolvedTheme, setTheme } = useApp();

  useEffect(() => {
    setAvatarError(false);
  }, [auth?.user?.avatar_url]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setThemeDropdownOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    clearAuth();
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
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
    { name: 'AI Coach', href: '/ai-assistant', icon: Bot },
  ];

  const mobileBottomTabs = [
    { name: 'Dashboard', href: '/dashboard', icon: Activity },
    { name: 'Tracker', href: '/workout-tracker', icon: Flame },
    { name: 'Nutrition', href: '/nutrition', icon: Sparkles },
    { name: 'Coach', href: '/ai-assistant', icon: Bot },
    { name: 'Profile', href: '/profile', icon: UserIcon },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF]/95 dark:bg-[#101114]/95 backdrop-blur-md transition-colors">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 gap-2">
          {/* Brand Logo */}
          <div className="flex items-center gap-4 xl:gap-6 min-w-0">
            <Link href="/" className="group focus:outline-none shrink-0">
              <BrandLogo size="md" showTagline />
            </Link>

            {/* Desktop Nav Links (Visible when logged in) */}
            {auth?.user && (
              <nav className="hidden xl:flex items-center gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
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
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right Action Icons & Auth Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Theme Selector (Dark, Light, System) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                aria-label="Toggle theme options"
                className="flex items-center justify-center h-9 w-9 rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] text-[#52525B] dark:text-[#9496A1] hover:text-[#111318] dark:hover:text-white transition-colors"
              >
                {resolvedTheme === 'dark' ? (
                  <Moon className="h-4 w-4 text-[#B7F34A]" />
                ) : (
                  <Sun className="h-4 w-4 text-[#6BA814]" />
                )}
              </button>

              {themeDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setThemeDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-40 rounded-[12px] border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] p-1.5 shadow-xl z-50">
                    {[
                      { id: 'dark' as const, label: 'Dark Mode', icon: Moon },
                      { id: 'light' as const, label: 'Light Mode', icon: Sun },
                      { id: 'system' as const, label: 'System', icon: Laptop },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const active = theme === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setTheme(opt.id);
                            setThemeDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 rounded-[8px] px-2.5 py-2 text-xs font-semibold transition-colors ${
                            active
                              ? 'bg-[#B7F34A]/15 text-[#6BA814] dark:text-[#B7F34A]'
                              : 'text-[#52525B] dark:text-[#D1D5DB] hover:bg-[#F0F2F5] dark:hover:bg-[#232630]'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Admin Link if admin */}
            {auth?.isAdmin && (
              <Link
                href="/admin"
                className="hidden sm:flex items-center gap-1.5 rounded-[10px] bg-red-500/15 border border-red-500/35 px-3 py-1.5 text-xs font-bold text-red-500 dark:text-red-400 hover:bg-red-500/25 transition-colors"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Admin</span>
              </Link>
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
                  <Link
                    href="/checkout"
                    className="flex items-center gap-1.5 rounded-[10px] bg-[#B7F34A] text-[#111318] px-3.5 py-1.5 text-xs font-bold hover:bg-[#A7E438] shadow-glow transition-all active:scale-95"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Upgrade (₹100)</span>
                  </Link>
                )}
              </div>
            )}

            {/* User Profile, Loading Skeleton (prevents Sign In flash!), or Login/Signup buttons */}
            {auth?.user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#1B1D22] px-2.5 sm:px-3 py-1.5 text-xs text-[#111318] dark:text-[#F5F5F5] hover:border-[#B7F34A]/50 transition-colors"
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
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Logout"
                  aria-label="Logout"
                  className="hidden sm:inline-flex rounded-[10px] p-2 text-[#52525B] dark:text-[#D1D5DB] hover:text-red-400 hover:bg-[#F0F2F5] dark:hover:bg-[#232630] transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : authLoading ? (
              <div
                aria-hidden="true"
                className="h-9 w-20 sm:w-28 rounded-[10px] bg-[#E5E7EB] dark:bg-[#232630] animate-pulse"
              />
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/login"
                  className="text-xs font-bold text-[#52525B] dark:text-[#E5E7EB] hover:text-[#111318] dark:hover:text-white px-2.5 sm:px-3 py-2 rounded-[10px] hover:bg-[#F0F2F5] dark:hover:bg-[#232630] transition-colors whitespace-nowrap"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="btn-primary flex items-center gap-1 px-3 sm:px-4 py-2 text-xs font-bold whitespace-nowrap"
                >
                  <span>Get Started</span>
                  <ChevronRight className="hidden sm:inline h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="xl:hidden flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] text-[#52525B] dark:text-[#9496A1] hover:text-[#111318] dark:hover:text-white hover:bg-[#F0F2F5] dark:hover:bg-[#1B1D22] transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-b border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#101114] px-4 pt-3 pb-6 space-y-3 shadow-xl max-h-[80dvh] overflow-y-auto">
            {auth?.user && (
              <div className="pb-3 border-b border-[#E1E4E8] dark:border-[#30333A] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#111318] dark:text-[#F5F5F5] truncate">
                    {auth.user.full_name}
                  </p>
                  <p className="text-[11px] text-[#52525B] dark:text-[#9496A1] truncate">
                    {auth.user.email || 'Connected Athlete'}
                  </p>
                </div>
                <div className="shrink-0">
                  {auth.isPremium ? (
                    <span className="text-[10px] font-bold text-[#6BA814] dark:text-[#B7F34A] bg-[#B7F34A]/15 border border-[#B7F34A]/40 px-2.5 py-1 rounded-full">
                      PREMIUM
                    </span>
                  ) : (
                    <Link
                      href="/checkout"
                      onClick={() => setMobileMenuOpen(false)}
                      className="btn-primary px-3 py-1.5 text-[11px]"
                    >
                      UPGRADE (₹100)
                    </Link>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 p-3 rounded-[10px] text-xs font-semibold transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-[#B7F34A]/15 text-[#111318] dark:text-[#B7F34A] border border-[#B7F34A]/40'
                        : 'text-[#52525B] dark:text-[#E5E7EB] bg-[#F5F6F8] dark:bg-[#1B1D22] border border-[#E1E4E8] dark:border-[#30333A]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{link.name}</span>
                  </Link>
                );
              })}
            </div>

            {auth?.isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-3 rounded-[10px] text-xs font-bold text-red-500 dark:text-red-400 bg-red-500/15 border border-red-500/30 min-h-[44px]"
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Admin Operations Console</span>
              </Link>
            )}

            {auth?.user ? (
              <div className="pt-2 grid grid-cols-2 gap-2 border-t border-[#E1E4E8] dark:border-[#30333A]">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] text-xs font-semibold text-[#111318] dark:text-white min-h-[44px]"
                >
                  <UserIcon className="h-4 w-4 text-brand" />
                  <span>Profile &amp; Settings</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] border border-red-500/30 bg-red-500/10 text-xs font-semibold text-red-500 dark:text-red-400 min-h-[44px]"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : !authLoading ? (
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] text-xs font-semibold text-[#111318] dark:text-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary w-full text-center py-3 text-xs font-bold"
                >
                  Create Account
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </header>

      {/* Mobile Native-Style Bottom Navigation Bar (Visible on phones & small tablets when logged in) */}
      {auth?.user && (
        <nav
          aria-label="Mobile quick navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#E1E4E8] dark:border-[#2A2D35] bg-white/95 dark:bg-[#101114]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        >
          <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
            {mobileBottomTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors ${
                    isActive
                      ? 'text-[#6BA814] dark:text-[#B7F34A]'
                      : 'text-[#52525B] dark:text-[#9496A1]'
                  }`}
                >
                  <div
                    className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                      isActive ? 'bg-[#B7F34A]/20' : ''
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="leading-none">{tab.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
