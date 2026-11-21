'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  Eye,
  EyeOff,
  Flame,
  Info,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Scale,
  Target,
  User,
} from 'lucide-react';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import BrandLogo from '@/components/ui/BrandLogo';
import { PrimaryButton } from '@/components/ui/Buttons';
import HeightInput from '@/components/ui/HeightInput';
import { HeightUnit } from '@/lib/height';
import { calculateNutritionTargets } from '@/lib/nutrition-calc';

const CALLBACK_ERRORS: Record<string, string> = {
  oauth_cancelled: 'Google sign-in was cancelled. You can try again anytime.',
  oauth_failed: 'Google sign-in could not be completed. Please try again.',
  email_password_account:
    'This email is already registered using Email & Password. Please sign in using your password.',
  link_expired: 'That verification or recovery link has expired. Please request a new one.',
  auth_unavailable: 'Authentication service is not configured yet. Please contact the administrator.',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AuthFormProps {
  initialMode: 'login' | 'signup';
}

export default function AuthForm({ initialMode }: AuthFormProps) {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '';
  const urlError = searchParams.get('error');
  const prefillEmail = searchParams.get('email') || '';

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Registration biometric & preference fields (Phase 2 & Phase 5)
  const [age, setAge] = useState<string>('25');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say'>('male');
  const [heightCm, setHeightCm] = useState<number>(175);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm');
  const [heightValid, setHeightValid] = useState<boolean>(true);
  const [weightKg, setWeightKg] = useState<string>('72');
  const [fitnessGoal, setFitnessGoal] = useState<
    'fat_loss' | 'muscle_gain' | 'recomposition' | 'maintenance' | 'strength' | 'general_fitness'
  >('muscle_gain');
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [trainingStyle, setTrainingStyle] = useState<'powerlifting' | 'muscle_building'>('muscle_building');
  const [activityLevel, setActivityLevel] = useState<
    'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'
  >('moderately_active');

  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
    checkedEmail: string;
    exists: boolean;
    oauthOnly: boolean;
    hasEmailPassword: boolean;
    googleLinked: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);
  const [resending, setResending] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [suggestSwitch, setSuggestSwitch] = useState<'login' | 'signup' | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const lastCheckedRef = useRef<string>('');

  useEffect(() => {
    if (urlError) {
      if (urlError === 'email_password_account') {
        setMode('login');
      }
      setError(CALLBACK_ERRORS[urlError] || 'Authentication could not be completed. Please try again.');
    }
  }, [urlError]);

  // Live preview of personalized calorie & macro targets on Create Account
  const previewTargets = useMemo(
    () =>
      calculateNutritionTargets({
        age: Number(age) || 25,
        gender,
        height_cm: heightCm,
        weight_kg: Number(weightKg) || 72,
        activity_level: activityLevel,
        weekly_workout_days: 4,
        experience_level: experienceLevel,
        primary_goal: fitnessGoal,
        training_style: trainingStyle,
      }),
    [age, gender, heightCm, weightKg, activityLevel, experienceLevel, fitnessGoal, trainingStyle]
  );

  // Password strength assessment
  const passwordChecks = useMemo(() => {
    const len = password.length >= 8;
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialOrUpper = /[A-Z]/.test(password) && /[^A-Za-z0-9]/.test(password);
    const score = (len ? 1 : 0) + (hasLetter ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecialOrUpper ? 1 : 0);
    return {
      len,
      hasLetter,
      hasNumber,
      valid: len && hasLetter && hasNumber,
      score,
      label: score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong',
    };
  }, [password]);

  const checkEmailRegistration = async (rawEmail: string) => {
    const normalized = rawEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized) || lastCheckedRef.current === normalized) return;
    lastCheckedRef.current = normalized;
    setCheckingEmail(true);
    setSuggestSwitch(null);

    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const providers: string[] = Array.isArray(data.providers) ? data.providers : [];
      const hasEmail = Boolean(data.hasEmailPassword || providers.includes('email'));
      const hasGoogle = providers.includes('google');
      const googleLinked = Boolean(data.googleLinked);
      const oauthOnly = Boolean(data.exists && !hasEmail && hasGoogle);

      setEmailStatus({
        checkedEmail: normalized,
        exists: Boolean(data.exists),
        oauthOnly,
        hasEmailPassword: hasEmail,
        googleLinked,
      });
      setError(null);

      if (data.exists) {
        setMode('login');
        if (oauthOnly) {
          setInfoMessage(
            'This email is registered with Google. Click "Continue with Google" above to sign in.'
          );
        } else {
          setInfoMessage(
            'This email is already registered. Sign in below to access your existing STRAP account.'
          );
        }
      } else {
        setMode('signup');
        setInfoMessage('New email detected. Complete your STRAP account details below.');
      }
    } catch {
      // Non-blocking: submit handlers still enforce all rules server-side
    } finally {
      setCheckingEmail(false);
    }
  };

  const switchMode = (nextMode: 'login' | 'signup') => {
    setMode(nextMode);
    setError(null);
    setSuggestSwitch(null);
    setNeedsVerification(false);
    setInfoMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfoMessage(null);
    setNeedsVerification(false);
    setSuggestSwitch(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (mode === 'signup') {
      if (!fullName.trim() || fullName.trim().length < 2) {
        setError('Please enter your full name.');
        setLoading(false);
        return;
      }
      if (!passwordChecks.valid) {
        setError('Password must be at least 8 characters and include both letters and numbers.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please verify your Confirm Password field.');
        setLoading(false);
        return;
      }
      const parsedAge = Number(age);
      if (!Number.isFinite(parsedAge) || parsedAge < 10 || parsedAge > 100) {
        setError('Please enter a valid age between 10 and 100.');
        setLoading(false);
        return;
      }
      if (!heightValid) {
        setError('Please enter a valid height before creating your account.');
        setLoading(false);
        return;
      }
      const parsedWeight = Number(weightKg);
      if (!Number.isFinite(parsedWeight) || parsedWeight < 20 || parsedWeight > 500) {
        setError('Please enter a valid body weight between 20 kg and 500 kg.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName.trim(),
            email: normalizedEmail,
            password,
            confirm_password: confirmPassword,
            age: Math.round(parsedAge),
            gender,
            height_cm: heightCm,
            height_unit: heightUnit,
            weight_kg: Math.round(parsedWeight * 10) / 10,
            fitness_goal: fitnessGoal,
            experience_level: experienceLevel,
            training_style: trainingStyle,
            activity_level: activityLevel,
            weekly_workout_days: 4,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.code === 'ACCOUNT_EXISTS' || data.code === 'DUPLICATE') {
            setSuggestSwitch('login');
          }
          throw new Error(data.error || 'Could not create your account. Please try again.');
        }

        if (data.requiresEmailVerification) {
          setVerificationNotice(
            data.message || `We sent a verification link to ${normalizedEmail}. Open it to activate your account, then sign in.`
          );
          return;
        }

        window.location.href = data.redirectTo || '/dashboard';
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Login mode
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          next: nextParam || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          setNeedsVerification(true);
        } else if (data.code === 'ACCOUNT_NOT_FOUND') {
          setSuggestSwitch('signup');
        }
        throw new Error(data.error || 'Unable to sign in. Please try again.');
      }

      window.location.href = data.redirectTo || '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Enter your email address first.');
      return;
    }
    setResending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not resend verification email.');
      if (verificationNotice) {
        setVerificationNotice(data.message || 'Verification email sent again.');
      } else {
        setInfoMessage(data.message || 'Verification email sent. Please check your inbox.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const buildOAuthCallbackUrl = () => {
    const callbackUrl = new URL('/auth/callback', window.location.origin);
    if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
      callbackUrl.searchParams.set('next', nextParam);
    }
    return callbackUrl.toString();
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setInfoMessage(null);

    // Check if an email was entered and belongs to an unlinked Email & Password account
    const normalized = email.trim().toLowerCase();
    if (EMAIL_RE.test(normalized)) {
      try {
        const checkRes = await fetch('/api/auth/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalized }),
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.exists && checkData.hasEmailPassword && !checkData.googleLinked) {
            setMode('login');
            setError(CALLBACK_ERRORS.email_password_account);
            return;
          }
        }
      } catch {
        // Proceed to backend callback guard
      }
    }

    const supabase = createBrowserClient();
    if (!supabase) {
      setError('Google sign-in is not available until Supabase is configured.');
      return;
    }
    setOauthLoading('google');
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: buildOAuthCallbackUrl() },
    });
    if (oauthErr) {
      setOauthLoading(null);
      setError('Could not start Google sign-in. Please try again.');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div
        className={`w-full ${
          mode === 'signup' ? 'max-w-2xl' : 'max-w-md'
        } rounded-[14px] border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] p-6 sm:p-8 shadow-glow transition-all`}
      >
        {/* Brand Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <BrandLogo size="lg" showTagline={false} className="mb-3" />
          <h1 className="text-2xl font-black text-[#111318] dark:text-white">
            {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
          </h1>
          <p className="text-xs text-[#52525B] dark:text-[#9496A1] mt-1">
            {mode === 'login'
              ? 'Sign in to access your STRAP profile, workouts & recovery data'
              : 'Configure your personal profile, training style & metabolic targets'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        {!verificationNotice && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[10px] bg-[#F0F2F5] dark:bg-[#141519] border border-[#E1E4E8] dark:border-[#30333A] mb-5">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`py-2 rounded-[8px] text-xs font-bold transition-all ${
                mode === 'login'
                  ? 'bg-[#B7F34A] text-[#111318] shadow-glow'
                  : 'text-[#52525B] dark:text-[#D1D5DB] hover:text-[#111318] dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`py-2 rounded-[8px] text-xs font-bold transition-all ${
                mode === 'signup'
                  ? 'bg-[#B7F34A] text-[#111318] shadow-glow'
                  : 'text-[#52525B] dark:text-[#D1D5DB] hover:text-[#111318] dark:hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {verificationNotice ? (
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[10px] bg-[#B7F34A]/20 text-[#6BA814] dark:text-[#B7F34A] shadow-glow">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="text-base font-bold text-[#111318] dark:text-white">Verify Your Email</h2>
            <p className="text-xs text-[#52525B] dark:text-[#9496A1] leading-relaxed">{verificationNotice}</p>
            {error && (
              <div className="rounded-[10px] border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            <div className="pt-2 space-y-3">
              <PrimaryButton
                fullWidth
                onClick={() => {
                  setVerificationNotice(null);
                  switchMode('login');
                }}
              >
                Go to Sign In
              </PrimaryButton>
              <button
                type="button"
                disabled={resending}
                onClick={handleResendVerification}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6BA814] dark:text-[#B7F34A] hover:underline disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                <span>{resending ? 'Sending...' : 'Resend verification email'}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-[10px] border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 leading-relaxed space-y-2">
                <p>{error}</p>
                {needsVerification && (
                  <button
                    type="button"
                    disabled={resending}
                    onClick={handleResendVerification}
                    className="inline-flex items-center gap-1.5 font-bold text-[#6BA814] dark:text-[#B7F34A] hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                    <span>{resending ? 'Sending...' : 'Resend verification email'}</span>
                  </button>
                )}
                {suggestSwitch === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="inline-flex items-center gap-1.5 font-bold text-[#6BA814] dark:text-[#B7F34A] hover:underline"
                  >
                    <span>Switch to Sign In with this email</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
                {suggestSwitch === 'signup' && (
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="inline-flex items-center gap-1.5 font-bold text-[#6BA814] dark:text-[#B7F34A] hover:underline"
                  >
                    <span>Create a new account with this email</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {infoMessage && (
              <div className="mb-4 rounded-[10px] border border-[#B7F34A]/40 bg-[#B7F34A]/10 p-3 text-xs text-[#4d7c0f] dark:text-[#B7F34A] leading-relaxed flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{infoMessage}</span>
              </div>
            )}

            {/* Social Authentication Options */}
            <div className="space-y-2.5 mb-4">
              <button
                onClick={handleGoogleAuth}
                type="button"
                disabled={oauthLoading !== null || loading}
                className="w-full flex items-center justify-center gap-2.5 rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#232630] py-2.5 px-4 text-xs font-bold text-[#111318] dark:text-white hover:border-[#B7F34A]/60 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {oauthLoading === 'google' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>{oauthLoading === 'google' ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>
            </div>

            {/* OR continue with Email */}
            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-[#E1E4E8] dark:bg-[#30333A]" />
              <span className="text-[10px] uppercase font-bold text-[#71717A] dark:text-[#9496A1] whitespace-nowrap">
                Or continue with email
              </span>
              <div className="h-px flex-1 bg-[#E1E4E8] dark:bg-[#30333A]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Account Credentials Section */}
              <div className={mode === 'signup' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-4'}>
                {mode === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A] dark:text-[#9496A1]" />
                      <input
                        type="text"
                        required
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Alex Mercer"
                        className="w-full rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#141519] py-2.5 pl-9 pr-3 text-xs text-[#111318] dark:text-white placeholder-[#71717A] dark:placeholder-[#9496A1] focus:border-[#B7F34A] focus:outline-none focus:ring-1 focus:ring-[#B7F34A]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300">
                      Email Address
                    </label>
                    {checkingEmail && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#71717A] dark:text-[#9496A1]">
                        <Loader2 className="h-3 w-3 animate-spin" /> Checking...
                      </span>
                    )}
                    {!checkingEmail && emailStatus && emailStatus.checkedEmail === email.trim().toLowerCase() && (
                      <span className="text-[10px] font-semibold text-[#6BA814] dark:text-[#B7F34A]">
                        {emailStatus.exists ? 'Account found' : 'New email'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A] dark:text-[#9496A1]" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (lastCheckedRef.current && e.target.value.trim().toLowerCase() !== lastCheckedRef.current) {
                          lastCheckedRef.current = '';
                        }
                      }}
                      onBlur={(e) => checkEmailRegistration(e.target.value)}
                      placeholder="athlete@example.com"
                      className="w-full rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#141519] py-2.5 pl-9 pr-3 text-xs text-[#111318] dark:text-white placeholder-[#71717A] dark:placeholder-[#9496A1] focus:border-[#B7F34A] focus:outline-none focus:ring-1 focus:ring-[#B7F34A]"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className={mode === 'signup' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-4'}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300">
                      Password
                    </label>
                    {mode === 'login' && (
                      <a
                        href="/forgot-password"
                        className="text-[11px] font-semibold text-[#6BA814] dark:text-[#B7F34A] hover:underline"
                      >
                        Forgot password?
                      </a>
                    )}
                    {mode === 'signup' && password.length > 0 && (
                      <span
                        className={`text-[10px] font-bold ${
                          passwordChecks.valid ? 'text-[#6BA814] dark:text-[#B7F34A]' : 'text-amber-400'
                        }`}
                      >
                        Strength: {passwordChecks.label}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A] dark:text-[#9496A1]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={mode === 'signup' ? 8 : 1}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'Min 8 chars, letters & numbers' : '••••••••'}
                      className="w-full rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#141519] py-2.5 pl-9 pr-9 text-xs text-[#111318] dark:text-white placeholder-[#71717A] dark:placeholder-[#9496A1] focus:border-[#B7F34A] focus:outline-none focus:ring-1 focus:ring-[#B7F34A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#71717A] dark:text-[#9496A1] hover:text-[#111318] dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300">
                        Confirm Password
                      </label>
                      {confirmPassword.length > 0 && (
                        <span
                          className={`text-[10px] font-bold ${
                            password === confirmPassword ? 'text-[#6BA814] dark:text-[#B7F34A]' : 'text-red-400'
                          }`}
                        >
                          {password === confirmPassword ? 'Passwords match' : 'Does not match'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A] dark:text-[#9496A1]" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#141519] py-2.5 pl-9 pr-9 text-xs text-[#111318] dark:text-white placeholder-[#71717A] dark:placeholder-[#9496A1] focus:border-[#B7F34A] focus:outline-none focus:ring-1 focus:ring-[#B7F34A]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#71717A] dark:text-[#9496A1] hover:text-[#111318] dark:hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Biometrics, Goals & Training Style Section (Create Account Mode) */}
              {mode === 'signup' && (
                <div className="pt-3 border-t border-[#E1E4E8] dark:border-[#30333A] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#6BA814] dark:text-[#B7F34A] flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5" />
                      <span>Athlete Biometrics & Training Profile</span>
                    </span>
                    <span className="text-[10px] text-[#71717A] dark:text-[#9496A1]">
                      Calibrates BMR, TDEE & Workout Tracker
                    </span>
                  </div>

                  {/* Age, Gender, Weight */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1">
                        Age (years)
                      </label>
                      <input
                        type="number"
                        required
                        min={10}
                        max={100}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#141519] p-2.5 text-xs text-[#111318] dark:text-white focus:border-[#B7F34A] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1">
                        Gender
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as any)}
                        className="w-full rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#141519] p-2.5 text-xs text-[#111318] dark:text-white focus:border-[#B7F34A] focus:outline-none"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        required
                        step="0.1"
                        min={20}
                        max={500}
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="w-full rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#141519] p-2.5 text-xs text-[#111318] dark:text-white focus:border-[#B7F34A] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Height (CM | FT + IN) & Activity Level */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                    <HeightInput
                      heightCm={heightCm}
                      unit={heightUnit}
                      onChange={(nextCm, nextUnit, isValid) => {
                        setHeightCm(nextCm);
                        setHeightUnit(nextUnit);
                        setHeightValid(isValid);
                      }}
                    />

                    <div>
                      <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1">
                        Daily Activity Level
                      </label>
                      <select
                        value={activityLevel}
                        onChange={(e) => setActivityLevel(e.target.value as any)}
                        className="w-full rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#141519] p-2.5 text-xs text-[#111318] dark:text-white focus:border-[#B7F34A] focus:outline-none"
                      >
                        <option value="sedentary">Sedentary (Desk job, low movement)</option>
                        <option value="lightly_active">Lightly Active (1–3 days/wk exercise)</option>
                        <option value="moderately_active">Moderately Active (3–5 days/wk training)</option>
                        <option value="very_active">Very Active (6–7 days/wk hard training)</option>
                      </select>
                    </div>
                  </div>

                  {/* Fitness Goal & Training Experience */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1 flex items-center gap-1">
                        <Target className="h-3.5 w-3.5 text-[#6BA814] dark:text-[#B7F34A]" />
                        <span>Fitness Goal</span>
                      </label>
                      <select
                        value={fitnessGoal}
                        onChange={(e) => setFitnessGoal(e.target.value as any)}
                        className="w-full rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#141519] p-2.5 text-xs text-[#111318] dark:text-white focus:border-[#B7F34A] focus:outline-none"
                      >
                        <option value="fat_loss">Fat Loss</option>
                        <option value="muscle_gain">Muscle Gain</option>
                        <option value="recomposition">Body Recomposition</option>
                        <option value="maintenance">Weight Maintenance</option>
                        <option value="strength">Strength Improvement</option>
                        <option value="general_fitness">General Fitness</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1">
                        Training Experience
                      </label>
                      <select
                        value={experienceLevel}
                        onChange={(e) => setExperienceLevel(e.target.value as any)}
                        className="w-full rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-white dark:bg-[#141519] p-2.5 text-xs text-[#111318] dark:text-white focus:border-[#B7F34A] focus:outline-none"
                      >
                        <option value="beginner">Beginner (0–1 year lifting)</option>
                        <option value="intermediate">Intermediate (1–3 years lifting)</option>
                        <option value="advanced">Advanced (3+ years structured training)</option>
                      </select>
                    </div>
                  </div>

                  {/* Preferred Training Type (Powerlifting vs Muscle Building) */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1.5 flex items-center gap-1">
                      <Dumbbell className="h-3.5 w-3.5 text-[#6BA814] dark:text-[#B7F34A]" />
                      <span>Preferred Training Type</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setTrainingStyle('muscle_building')}
                        className={`p-3 rounded-[10px] border text-left transition-all ${
                          trainingStyle === 'muscle_building'
                            ? 'border-[#B7F34A] bg-[#B7F34A]/15 text-[#111318] dark:text-white shadow-glow'
                            : 'border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] text-[#52525B] dark:text-[#9496A1]'
                        }`}
                      >
                        <div className="text-xs font-extrabold text-[#111318] dark:text-white flex items-center justify-between">
                          <span>Muscle Building (Hypertrophy)</span>
                          {trainingStyle === 'muscle_building' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#B7F34A] text-[#111318] font-black">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#52525B] dark:text-[#9496A1] mt-1">
                          PPL, Upper/Lower & Bro Splits • Muscular volume, isolation & progressive rep ranges.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTrainingStyle('powerlifting')}
                        className={`p-3 rounded-[10px] border text-left transition-all ${
                          trainingStyle === 'powerlifting'
                            ? 'border-[#B7F34A] bg-[#B7F34A]/15 text-[#111318] dark:text-white shadow-glow'
                            : 'border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] text-[#52525B] dark:text-[#9496A1]'
                        }`}
                      >
                        <div className="text-xs font-extrabold text-[#111318] dark:text-white flex items-center justify-between">
                          <span>Powerlifting (SBD Strength)</span>
                          {trainingStyle === 'powerlifting' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#B7F34A] text-[#111318] font-black">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#52525B] dark:text-[#9496A1] mt-1">
                          Squat, Bench & Deadlift competition variations • %1RM, RPE/RIR & peaking periodization.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Live Calculated Calorie & Macro Target Preview */}
                  <div className="rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6BA814] dark:text-[#B7F34A] flex items-center gap-1">
                        <Flame className="h-3 w-3" />
                        <span>Estimated Daily Targets ({previewTargets.goal_label})</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#52525B] dark:text-[#9496A1]">
                        BMR {previewTargets.bmr} • TDEE {previewTargets.tdee} kcal
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="rounded-[8px] bg-white dark:bg-[#1B1D22] p-2 border border-[#E1E4E8] dark:border-[#30333A]">
                        <span className="text-[9px] uppercase text-[#71717A] dark:text-[#9496A1] block">Calories</span>
                        <span className="text-xs font-black text-[#111318] dark:text-white">
                          {previewTargets.target_calories} kcal
                        </span>
                      </div>
                      <div className="rounded-[8px] bg-white dark:bg-[#1B1D22] p-2 border border-[#E1E4E8] dark:border-[#30333A]">
                        <span className="text-[9px] uppercase text-blue-500 dark:text-blue-400 block">Protein</span>
                        <span className="text-xs font-black text-[#111318] dark:text-white">
                          {previewTargets.protein_g}g
                        </span>
                      </div>
                      <div className="rounded-[8px] bg-white dark:bg-[#1B1D22] p-2 border border-[#E1E4E8] dark:border-[#30333A]">
                        <span className="text-[9px] uppercase text-amber-500 dark:text-amber-400 block">Carbs</span>
                        <span className="text-xs font-black text-[#111318] dark:text-white">
                          {previewTargets.carbs_g}g
                        </span>
                      </div>
                      <div className="rounded-[8px] bg-white dark:bg-[#1B1D22] p-2 border border-[#E1E4E8] dark:border-[#30333A]">
                        <span className="text-[9px] uppercase text-rose-500 dark:text-rose-400 block">Fat</span>
                        <span className="text-xs font-black text-[#111318] dark:text-white">
                          {previewTargets.fats_g}g
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#71717A] dark:text-[#9496A1] leading-tight">
                      {previewTargets.disclaimer}
                    </p>
                  </div>
                </div>
              )}

              <PrimaryButton
                type="submit"
                fullWidth
                loading={loading}
                disabled={oauthLoading !== null}
                icon={<ArrowRight className="h-4 w-4" />}
              >
                {mode === 'login' ? 'Sign In to STRAP' : 'Create STRAP Account'}
              </PrimaryButton>
            </form>

            <p className="text-center text-xs text-[#71717A] dark:text-[#9496A1] mt-6">
              {mode === 'login' ? (
                <>
                  New to STRAP?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-bold text-[#6BA814] dark:text-[#B7F34A] hover:underline"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-bold text-[#6BA814] dark:text-[#B7F34A] hover:underline"
                  >
                    Sign In
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
