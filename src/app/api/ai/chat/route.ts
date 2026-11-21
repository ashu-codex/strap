import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, json, parseBody, requireUser } from '@/lib/api';
import { aiGuard, loadFitnessContext } from '@/lib/ai-service';
import { chatWithAIAssistant } from '@/lib/gemini';

const schema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message is required.')
    .max(1000, 'Message is too long (max 1000 characters).'),
});

export async function POST(req: NextRequest) {
  try {
    const { message } = await parseBody(req, schema);
    const { user, subscription } = await aiGuard(req, 'chat');

    // Conversation history comes from the database, not from client-supplied data.
    const past = await db
      .select('ai_chat_messages', { eq: { user_id: user.id }, order: ['created_at', 'desc'], limit: 8 })
      .catch(() => []);
    const history = past
      .reverse()
      .map((m) => ({ role: m.role as 'user' | 'model', parts: String(m.content).slice(0, 1500) }));

    const ctx = await loadFitnessContext(user.id);
    const reply = await chatWithAIAssistant(message, history, {
      name: user.full_name || ctx.profile?.full_name || 'Athlete',
      age: ctx.metrics?.age ?? ctx.profile?.age,
      gender: ctx.metrics?.gender ?? ctx.profile?.gender,
      heightCm: ctx.metrics?.height_cm ?? ctx.profile?.height,
      weight: ctx.metrics?.current_weight_kg ?? ctx.profile?.weight,
      goal: ctx.goal?.primary_goal ?? ctx.profile?.fitness_goal,
      experienceLevel:
        ctx.metrics?.fitness_level ?? ctx.metrics?.experience_level ?? ctx.profile?.experience_level,
      trainingStyle: ctx.trainingStyle,
      weeklyDays: ctx.goal?.workout_days_per_week ?? ctx.goal?.weekly_workout_days ?? 4,
      actual1RMs: ctx.actual1RMs,
      nutritionTargets: ctx.nutritionTargets,
      todayNutrition: ctx.todayNutrition,
      workouts: ctx.workouts,
      prs: ctx.prs,
      recoveryLogs: ctx.recoveryLogs,
      plan: subscription?.plan,
    });

    await db.insert('ai_chat_messages', { user_id: user.id, role: 'user', content: message }).catch(() => null);
    await db
      .insert('ai_chat_messages', { user_id: user.id, role: 'model', content: reply.slice(0, 8000) })
      .catch(() => null);
    return json({ reply });
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const rows = await db
      .select('ai_chat_messages', { eq: { user_id: user.id }, order: ['created_at', 'desc'], limit: 30 })
      .catch(() => []);
    const ctx = await loadFitnessContext(user.id);
    return json({
      messages: rows.reverse().map((m) => ({ role: m.role, parts: m.content })),
      athleteSummary: {
        name: user.full_name || ctx.profile?.full_name || 'Athlete',
        trainingStyle: ctx.trainingStyle,
        goalLabel: ctx.nutritionTargets.goal_label,
        targetCalories: ctx.nutritionTargets.target_calories,
        targetProteinG: ctx.nutritionTargets.protein_g,
        todayCalories: ctx.todayNutrition.calories,
        todayProteinG: ctx.todayNutrition.protein_g,
        workoutsLogged: ctx.workouts.length,
        prsLogged: ctx.prs.length,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
