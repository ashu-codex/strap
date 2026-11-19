import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, json, parseBody, requirePremium } from '@/lib/api';
import { estimate1RM } from '@/lib/utils';

const setSchema = z.object({
  set_number: z.coerce.number().int().min(1).max(50).optional(),
  weight_kg: z.coerce.number().min(0).max(1000),
  reps: z.coerce.number().int().min(0).max(1000),
  is_completed: z.boolean().default(false),
  rpe: z.coerce.number().min(1).max(10).optional(),
});

const schema = z.object({
  name: z.string().trim().max(120).default('Workout'),
  workout_name: z.string().trim().max(120).optional(),
  split_type: z.string().trim().max(60).optional(),
  exercises: z
    .array(
      z
        .object({
          exercise_name: z.string().trim().min(1).max(120),
          target_muscle: z.string().max(120).optional(),
          rest_seconds: z.number().optional(),
          sets: z.array(setSchema).max(50),
        })
        .passthrough()
    )
    .max(60),
});

/** Shared by POST /api/workouts and POST /api/workouts/complete */
export async function logWorkout(req: NextRequest) {
  try {
    const { user } = await requirePremium(req);
    const w = await parseBody(req, schema);

    let totalVolume = 0;
    const newPrs: { exercise: string; weight: number; reps: number; estimated1RM: number }[] = [];

    for (const ex of w.exercises) {
      let best = { rm: 0, weight: 0, reps: 0 };
      for (const s of ex.sets) {
        if (!s.is_completed) continue;
        totalVolume += s.weight_kg * s.reps;
        const rm = estimate1RM(s.weight_kg, s.reps);
        if (rm > best.rm) best = { rm, weight: s.weight_kg, reps: s.reps };
      }
      if (best.rm > 0) {
        const existing = await db.selectOne('progress_records', {
          eq: { user_id: user.id, exercise_name: ex.exercise_name, record_type: '1rm' },
        });
        if (!existing || best.rm > Number(existing.value)) {
          await db.upsert(
            'progress_records',
            { user_id: user.id, exercise_name: ex.exercise_name, record_type: '1rm', value: best.rm, achieved_at: new Date().toISOString().slice(0, 10) },
            'user_id,exercise_name,record_type'
          );
          newPrs.push({ exercise: ex.exercise_name, weight: best.weight, reps: best.reps, estimated1RM: best.rm });
        }
      }
    }

    const saved = await db.insert('workout_logs', {
      user_id: user.id,
      name: w.workout_name || w.name,
      split_type: w.split_type ?? null,
      exercises: w.exercises,
      total_volume_kg: totalVolume,
    });
    return json({ success: true, message: 'Workout logged successfully!', totalVolumeKg: totalVolume, newPrs, workout: saved });
  } catch (e) {
    return handleError(e);
  }
}
