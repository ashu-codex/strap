import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, HttpError, json, parseBody, requireUser } from '@/lib/api';
import { logWorkout } from '@/lib/workout-service';

export async function GET(req: NextRequest) {
  try {
    const { user, isPremium } = await requireUser(req);
    const [workouts, prs, prefRow, metricsRow] = await Promise.all([
      db.select('workout_logs', { eq: { user_id: user.id }, order: ['completed_at', 'desc'], limit: 100 }),
      db.select('progress_records', { eq: { user_id: user.id } }),
      db.selectOne('user_preferences', { eq: { user_id: user.id } }).catch(() => null),
      db.selectOne('fitness_metrics', { eq: { user_id: user.id } }).catch(() => null),
    ]);

    const prefs = prefRow?.preferences || {};
    const trainingStyle = prefs.training_style || null;
    const customTemplates = Array.isArray(prefs.workout_templates) ? prefs.workout_templates : [];
    const actual1RMs = prefs.actual_1rms || {
      squat: metricsRow?.strength_levels?.squat_kg || 120,
      bench: metricsRow?.strength_levels?.bench_press_kg || 85,
      deadlift: metricsRow?.strength_levels?.deadlift_kg || 150,
    };

    return json({
      workouts,
      prs,
      isPremium,
      trainingStyle,
      hasSelectedTrainingStyle: Boolean(prefs.training_style),
      experienceLevel: metricsRow?.experience_level || 'intermediate',
      customTemplates,
      actual1RMs,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  return logWorkout(req);
}

const putSchema = z.object({
  action: z.enum(['set_training_style', 'save_template', 'delete_template', 'update_1rms', 'edit_workout']),
  training_style: z.enum(['powerlifting', 'muscle_building']).optional(),
  template: z
    .object({
      id: z.string().optional(),
      name: z.string().trim().min(1).max(100),
      split_type: z.string().trim().max(60),
      training_style: z.enum(['powerlifting', 'muscle_building']).optional(),
      exercises: z.array(z.any()),
    })
    .optional(),
  template_id: z.string().optional(),
  actual_1rms: z
    .object({
      squat: z.coerce.number().min(20).max(600),
      bench: z.coerce.number().min(15).max(500),
      deadlift: z.coerce.number().min(20).max(600),
    })
    .optional(),
  workout_id: z.string().optional(),
  workout_patch: z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      split_type: z.string().trim().max(60).optional(),
      exercises: z.array(z.any()).optional(),
      total_volume_kg: z.number().min(0).optional(),
    })
    .optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const body = await parseBody(req, putSchema);

    if (body.action === 'edit_workout' && body.workout_id && body.workout_patch) {
      const existing = await db.selectOne('workout_logs', { eq: { id: body.workout_id, user_id: user.id } });
      if (!existing) throw new HttpError(404, 'Workout not found.');
      const updated = await db.update('workout_logs', { id: body.workout_id, user_id: user.id }, body.workout_patch);
      return json({ success: true, workout: updated[0] });
    }

    const existingPref = await db.selectOne('user_preferences', { eq: { user_id: user.id } }).catch(() => null);
    const prefs = existingPref?.preferences || {};
    const nextPrefs = { ...prefs };

    if (body.action === 'set_training_style' && body.training_style) {
      nextPrefs.training_style = body.training_style;
    } else if (body.action === 'save_template' && body.template) {
      const list = Array.isArray(prefs.workout_templates) ? prefs.workout_templates : [];
      const newTpl = { ...body.template, id: body.template.id || `tpl-${Date.now()}` };
      nextPrefs.workout_templates = [newTpl, ...list.filter((t: any) => t.id !== newTpl.id)];
    } else if (body.action === 'delete_template' && body.template_id) {
      const list = Array.isArray(prefs.workout_templates) ? prefs.workout_templates : [];
      nextPrefs.workout_templates = list.filter((t: any) => t.id !== body.template_id);
    } else if (body.action === 'update_1rms' && body.actual_1rms) {
      nextPrefs.actual_1rms = body.actual_1rms;
    }

    await db.upsert(
      'user_preferences',
      {
        user_id: user.id,
        theme: existingPref?.theme || 'system',
        preferences: nextPrefs,
      },
      'user_id'
    );

    return json({
      success: true,
      trainingStyle: nextPrefs.training_style,
      customTemplates: nextPrefs.workout_templates || [],
      actual1RMs: nextPrefs.actual_1rms,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const id = new URL(req.url).searchParams.get('id');
    if (!id) throw new HttpError(400, 'Workout ID is required.');
    await db.delete('workout_logs', { id, user_id: user.id });
    return json({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
