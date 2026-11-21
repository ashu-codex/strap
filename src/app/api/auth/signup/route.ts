import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { ConfigError, getSiteUrl, isDevFallbackAllowed, isSupabaseConfigured } from '@/lib/config';
import { burstLimit, clientIp, emailSchema, handleError, HttpError, json, parseBody, passwordSchema } from '@/lib/api';
import { ensureProfile, lookupAuthAccount } from '@/lib/auth-flow';
import { DEV_SESSION_COOKIE, devCreateUser, signSession } from '@/lib/dev-auth';
import { db } from '@/lib/db';
import { MAX_HEIGHT_CM, MIN_HEIGHT_CM } from '@/lib/height';
import { calculateNutritionTargets } from '@/lib/nutrition-calc';

const optNum = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(min).max(max).optional()
  );

const schema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirm_password: z.string().optional(),
  full_name: z.string().trim().max(80).optional(),
  age: optNum(10, 100),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  height_cm: optNum(MIN_HEIGHT_CM, MAX_HEIGHT_CM),
  height_unit: z.enum(['cm', 'ft_in']).optional(),
  weight_kg: optNum(20, 500),
  fitness_goal: z
    .enum(['fat_loss', 'muscle_gain', 'recomposition', 'maintenance', 'strength', 'general_fitness', 'endurance'])
    .optional(),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  training_style: z.enum(['powerlifting', 'muscle_building']).optional(),
  activity_level: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active']).optional(),
  weekly_workout_days: optNum(1, 7),
  next: z.string().optional(),
});

async function persistRegistrationProfile(
  userId: string,
  email: string,
  name: string,
  body: z.infer<typeof schema>
): Promise<boolean> {
  const hasBiometrics = Boolean(body.age && body.height_cm && body.weight_kg);
  const heightCm = body.height_cm ? Math.round(body.height_cm * 10) / 10 : 175;
  const heightUnit = body.height_unit || 'cm';
  const weightKg = body.weight_kg || 72;
  const age = body.age ? Math.round(body.age) : 26;
  const gender = body.gender || 'male';
  const goal = body.fitness_goal || 'muscle_gain';
  const exp = body.experience_level || 'beginner';
  const trainingStyle = body.training_style || 'muscle_building';
  const activity = body.activity_level || 'moderately_active';
  const workoutDays = body.weekly_workout_days ? Math.round(body.weekly_workout_days) : 4;

  const targets = calculateNutritionTargets({
    age,
    gender,
    height_cm: heightCm,
    weight_kg: weightKg,
    activity_level: activity,
    weekly_workout_days: workoutDays,
    experience_level: exp,
    primary_goal: goal,
    training_style: trainingStyle,
  });

  // 1. Always save user_preferences (auth_origin = 'email', google_linked = false, training_style, targets)
  try {
    const existingPref = await db.selectOne('user_preferences', { eq: { user_id: userId } }).catch(() => null);
    await db.upsert(
      'user_preferences',
      {
        user_id: userId,
        theme: existingPref?.theme || 'system',
        preferences: {
          ...(existingPref?.preferences || {}),
          auth_origin: 'email',
          google_linked: false,
          height_unit: heightUnit,
          training_style: trainingStyle,
          nutrition_targets: targets,
        },
      },
      'user_id'
    );
  } catch {
    // non-fatal
  }

  // 2. If registration included biometrics & goal, persist fitness_metrics, fitness_goals, and user_profiles
  if (hasBiometrics) {
    const baseMetrics = {
      user_id: userId,
      age,
      gender,
      height_cm: heightCm,
      current_weight_kg: weightKg,
      experience_level: exp,
      workout_location: 'gym',
      workout_duration_mins: 60,
      equipment: ['Barbell', 'Dumbbell', 'Cable', 'Machine'],
      strength_levels: {},
      limitations: '',
      diet_preference: 'non_vegetarian',
      sleep_hours_avg: 7.5,
      daily_activity_level: activity,
      daily_steps_avg: 8000,
      rest_days_preferred: Math.max(1, 7 - workoutDays),
    };

    try {
      await db.upsert('fitness_metrics', { ...baseMetrics, height_unit: heightUnit }, 'user_id');
    } catch {
      await db.upsert('fitness_metrics', baseMetrics, 'user_id').catch(() => null);
    }

    await db
      .upsert(
        'fitness_goals',
        {
          user_id: userId,
          primary_goal: goal,
          target_weight_kg:
            goal === 'fat_loss'
              ? Math.max(40, Math.round((weightKg - 5) * 10) / 10)
              : goal === 'muscle_gain'
              ? Math.round((weightKg + 4) * 10) / 10
              : weightKg,
          weekly_workout_days: workoutDays,
          target_date: null,
        },
        'user_id'
      )
      .catch(() => null);

    const profilePatch = {
      full_name: name,
      age,
      gender,
      height: heightCm,
      weight: weightKg,
      fitness_goal: goal,
      experience_level: exp,
      activity_level: activity,
    };
    try {
      await db.update('user_profiles', { id: userId }, { ...profilePatch, height_unit: heightUnit });
    } catch {
      await db.update('user_profiles', { id: userId }, profilePatch).catch(() => null);
    }
  }

  return hasBiometrics;
}

export async function POST(req: NextRequest) {
  try {
    if (!burstLimit(`signup:${clientIp(req)}`, 10, 10 * 60_000)) {
      return json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, 429);
    }
    const body = await parseBody(req, schema);
    const { email, password, confirm_password, full_name } = body;

    if (confirm_password !== undefined && password !== confirm_password) {
      throw new HttpError(400, 'Passwords do not match. Please confirm your password carefully.', 'PASSWORD_MISMATCH');
    }

    const name = full_name || email.split('@')[0];

    // Check if the email is already registered BEFORE attempting signup (prevents duplicates)
    const existingAccount = await lookupAuthAccount(email);
    if (existingAccount.exists) {
      const hasEmail = existingAccount.providers.includes('email');
      const msg = hasEmail
        ? 'This email is already registered. Please sign in to your existing account.'
        : 'This email is already registered with Google. Please click "Continue with Google" to sign in.';
      return json(
        {
          error: msg,
          code: 'ACCOUNT_EXISTS',
          providers: existingAccount.providers,
        },
        409
      );
    }

    // ---------------------------------------------------------------- Supabase
    if (isSupabaseConfigured()) {
      const supabase = createServerClient();
      if (!supabase) throw new ConfigError();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            auth_origin: 'email',
            google_linked: false,
            training_style: body.training_style || 'muscle_building',
          },
          emailRedirectTo: `${getSiteUrl(new URL(req.url).origin)}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        const code = (error as any).code as string | undefined;
        if (code === 'user_already_exists' || /already registered/i.test(error.message)) {
          return json(
            { error: 'This email is already registered. Please sign in to your existing account.', code: 'ACCOUNT_EXISTS' },
            409
          );
        }
        if (code === 'weak_password') {
          return json({ error: 'That password is too weak. Use at least 8 characters with letters and numbers.', code: 'WEAK_PASSWORD' }, 400);
        }
        if (code === 'over_email_send_rate_limit' || (error as any).status === 429) {
          return json({ error: 'Too many emails requested. Please wait a few minutes and try again.', code: 'RATE_LIMITED' }, 429);
        }
        if (code === 'email_address_invalid') {
          return json({ error: 'Please enter a valid email address.', code: 'INVALID_EMAIL' }, 400);
        }
        if (code === 'signup_disabled') {
          return json({ error: 'Sign-ups are currently disabled.', code: 'SIGNUP_DISABLED' }, 403);
        }
        if (error.name === 'AuthRetryableFetchError' || (error as any).status === 0 || ((error as any).status ?? 0) >= 500) {
          return json({ error: 'Cannot reach the authentication service. Please try again shortly.', code: 'AUTH_UNAVAILABLE' }, 503);
        }
        console.error('[signup] supabase error:', code, error.message);
        return json({ error: 'Could not create your account. Please try again.', code: 'SIGNUP_FAILED' }, 400);
      }

      // Supabase returns an obfuscated user with empty identities if the email already exists.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return json(
          { error: 'This email is already registered. Please sign in to your existing account.', code: 'ACCOUNT_EXISTS' },
          409
        );
      }

      let hasBiometrics = false;
      if (data.user) {
        try {
          await ensureProfile(data.user.id, email, { full_name: name });
          hasBiometrics = await persistRegistrationProfile(data.user.id, email, name, body);
        } catch {
          console.error('[signup] profile creation deferred');
        }
      }

      const needsVerification = !data.session;
      return json({
        success: true,
        requiresEmailVerification: needsVerification,
        message: needsVerification
          ? `We sent a verification link to ${email}. Open it (on any device) to activate your account, then sign in.`
          : 'Account created.',
        redirectTo: needsVerification ? null : hasBiometrics ? '/dashboard' : '/onboarding',
      });
    }

    // ---------------------------------------------------------------- Dev fallback
    if (isDevFallbackAllowed()) {
      const id = await devCreateUser(email, password, name);
      if (!id) {
        return json(
          { error: 'This email is already registered. Please sign in to your existing account.', code: 'ACCOUNT_EXISTS' },
          409
        );
      }
      await db.selectOne('user_profiles', { eq: { id } });
      const hasBiometrics = await persistRegistrationProfile(id, email, name, body);
      const res = json({
        success: true,
        requiresEmailVerification: false,
        redirectTo: hasBiometrics ? '/dashboard' : '/onboarding',
        devMode: true,
      });
      res.cookies.set(DEV_SESSION_COOKIE, signSession(id), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
      return res;
    }

    throw new ConfigError();
  } catch (e) {
    return handleError(e);
  }
}
