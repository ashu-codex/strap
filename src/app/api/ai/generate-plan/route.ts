import { NextRequest } from 'next/server';
import { handleError, json, requirePremium } from '@/lib/api';
import { aiGuard, latestAiPlan, loadFitnessContext, saveAiPlan } from '@/lib/ai-service';
import { generateWorkoutPlanAI } from '@/lib/gemini';
import { buildProfilePlanSnapshot } from '@/lib/plan-sync';

export const dynamic = 'force-dynamic';

async function generateSyncedPlan(userId: string) {
  const ctx = await loadFitnessContext(userId);
  const check = buildProfilePlanSnapshot(ctx);

  if (!check.complete) {
    return {
      profileIncomplete: true as const,
      missingFields: check.missingFields,
      profileSummary: check.snapshot,
    };
  }

  const { plan, isAiGenerated } = await generateWorkoutPlanAI({
    metrics: ctx.metrics,
    goal: {
      ...ctx.goal,
      weekly_workout_days: check.snapshot.weekly_workout_days!,
      primary_goal: check.snapshot.primary_goal as any,
    },
    profile: ctx.profile,
    trainingStyle: check.snapshot.training_style,
    preferredSplit: check.snapshot.preferred_workout_split,
    exercisePreferences: check.snapshot.exercise_preferences,
    actual1RMs: ctx.actual1RMs,
    recentWorkouts: ctx.workouts,
  });

  const stampedPlan = {
    ...plan,
    _profile_hash: check.hash,
    _profile_snapshot: check.snapshot,
    _generated_at: new Date().toISOString(),
  };

  await saveAiPlan(userId, 'workout', stampedPlan);

  return {
    profileIncomplete: false as const,
    plan: stampedPlan,
    isAiGenerated,
    profileSummary: check.snapshot,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await aiGuard(req, 'plan');
    const result = await generateSyncedPlan(user.id);
    if (result.profileIncomplete) {
      return json(
        {
          profileIncomplete: true,
          missingFields: result.missingFields,
          profileSummary: result.profileSummary,
          error: `Please complete your Profile (${result.missingFields.join(', ')}) before generating a workout split.`,
        },
        400
      );
    }
    return json({
      success: true,
      isAiGenerated: result.isAiGenerated,
      plan: result.plan,
      profileSummary: result.profileSummary,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requirePremium(req);
    const autoRegenerate = new URL(req.url).searchParams.get('autoRegenerate') === '1';
    const ctx = await loadFitnessContext(user.id);
    const check = buildProfilePlanSnapshot(ctx);

    if (!check.complete) {
      return json({
        profileIncomplete: true,
        missingFields: check.missingFields,
        profileSummary: check.snapshot,
        plan: null,
      });
    }

    const cached = await latestAiPlan(user.id, 'workout');
    const expectedDays = check.snapshot.weekly_workout_days!;
    const cachedMatchesProfile =
      cached &&
      typeof cached === 'object' &&
      cached._profile_hash === check.hash &&
      Array.isArray(cached.weekly_schedule) &&
      cached.weekly_schedule.length === expectedDays;

    if (cachedMatchesProfile) {
      return json({
        plan: cached,
        cached: true,
        outdatedPlan: false,
        profileSummary: check.snapshot,
      });
    }

    // If an older plan exists from a previous Profile configuration and caller did NOT explicitly request
    // autoRegenerate=1, do NOT present the outdated plan as a newly generated plan—ask the user to regenerate!
    if (cached && typeof cached === 'object' && !autoRegenerate) {
      return json({
        plan: null,
        cached: false,
        outdatedPlan: true,
        previousPlanSummary: {
          split_name: cached.split_name || null,
          weekly_workout_days: Array.isArray(cached.weekly_schedule) ? cached.weekly_schedule.length : null,
          primary_goal: cached._profile_snapshot?.primary_goal || null,
          experience_level: cached._profile_snapshot?.experience_level || null,
          training_style: cached._profile_snapshot?.training_style || null,
          generated_at: cached._generated_at || null,
        },
        profileSummary: check.snapshot,
      });
    }

    // No plan exists yet (or user explicitly requested autoRegenerate=1): generate directly from latest Profile
    await aiGuard(req, 'plan');
    const { plan, isAiGenerated } = await generateWorkoutPlanAI({
      metrics: ctx.metrics,
      goal: {
        ...ctx.goal,
        weekly_workout_days: expectedDays,
        primary_goal: check.snapshot.primary_goal as any,
      },
      profile: ctx.profile,
      trainingStyle: check.snapshot.training_style,
      preferredSplit: check.snapshot.preferred_workout_split,
      exercisePreferences: check.snapshot.exercise_preferences,
      actual1RMs: ctx.actual1RMs,
      recentWorkouts: ctx.workouts,
    });

    const stampedPlan = {
      ...plan,
      _profile_hash: check.hash,
      _profile_snapshot: check.snapshot,
      _generated_at: new Date().toISOString(),
    };

    await saveAiPlan(user.id, 'workout', stampedPlan);
    return json({
      plan: stampedPlan,
      cached: false,
      outdatedPlan: false,
      regeneratedForProfileChange: Boolean(cached),
      isAiGenerated,
      profileSummary: check.snapshot,
    });
  } catch (e) {
    return handleError(e);
  }
}
