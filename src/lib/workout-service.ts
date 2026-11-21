import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, json, parseBody, requireUser } from '@/lib/api';
import { estimate1RM } from '@/lib/utils';

const setSchema = z.object({
  set_number: z.coerce.number().int().min(1).max(50).optional(),
  weight_kg: z.coerce.number().min(0).max(1000),
  reps: z.coerce.number().int().min(0).max(1000),
  is_completed: z.boolean().default(false),
  rpe: z.coerce.number().min(1).max(10).optional(),
  rir: z.coerce.number().min(0).max(10).optional(),
  pct_1rm: z.coerce.number().min(0).max(150).optional(),
});

const schema = z.object({
  name: z.string().trim().max(120).default('Workout'),
  workout_name: z.string().trim().max(120).optional(),
  split_type: z.string().trim().max(60).optional(),
  training_style: z.enum(['powerlifting', 'muscle_building']).optional(),
  program_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  periodization_phase: z.string().max(40).optional(),
  duration_minutes: z.coerce.number().min(0).max(600).optional(),
  notes: z.string().max(1000).optional(),
  exercises: z
    .array(
      z
        .object({
          exercise_name: z.string().trim().min(1).max(120),
          target_muscle: z.string().max(120).optional(),
          category: z.string().max(60).optional(),
          rest_seconds: z.number().optional(),
          notes: z.string().max(500).optional(),
          sets: z.array(setSchema).max(50),
        })
        .passthrough()
    )
    .max(60),
});

/** Shared by POST /api/workouts and POST /api/workouts/complete */
export async function logWorkout(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const w = await parseBody(req, schema);

    let totalVolume = 0;
    const newPrs: {
      exercise: string;
      weight: number;
      reps: number;
      estimated1RM: number;
      actual1RM?: number;
      recordType: string;
    }[] = [];

    for (const ex of w.exercises) {
      let best = { rm: 0, weight: 0, reps: 0 };
      let bestActual1RM = 0;
      let exVolume = 0;
      let maxReps = 0;

      for (const s of ex.sets) {
        if (!s.is_completed) continue;
        const vol = s.weight_kg * s.reps;
        totalVolume += vol;
        exVolume += vol;
        if (s.reps > maxReps) maxReps = s.reps;
        if (s.reps === 1 && s.weight_kg > bestActual1RM) {
          bestActual1RM = s.weight_kg;
        }
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
            {
              user_id: user.id,
              exercise_name: ex.exercise_name,
              record_type: '1rm',
              value: best.rm,
              achieved_at: new Date().toISOString().slice(0, 10),
            },
            'user_id,exercise_name,record_type'
          );
          newPrs.push({
            exercise: ex.exercise_name,
            weight: best.weight,
            reps: best.reps,
            estimated1RM: best.rm,
            actual1RM: bestActual1RM || undefined,
            recordType: '1rm',
          });
        }
      }

      if (exVolume > 0) {
        const existingVol = await db.selectOne('progress_records', {
          eq: { user_id: user.id, exercise_name: ex.exercise_name, record_type: 'max_volume' },
        });
        if (!existingVol || exVolume > Number(existingVol.value)) {
          await db
            .upsert(
              'progress_records',
              {
                user_id: user.id,
                exercise_name: ex.exercise_name,
                record_type: 'max_volume',
                value: Math.round(exVolume * 10) / 10,
                achieved_at: new Date().toISOString().slice(0, 10),
              },
              'user_id,exercise_name,record_type'
            )
            .catch(() => null);
        }
      }
    }

    const saved = await db.insert('workout_logs', {
      user_id: user.id,
      name: w.workout_name || w.name,
      split_type: w.split_type ?? (w.training_style === 'powerlifting' ? 'Powerlifting SBD' : 'Hypertrophy'),
      exercises: w.exercises,
      total_volume_kg: Math.round(totalVolume * 10) / 10,
    });

    return json({
      success: true,
      message: 'Workout logged successfully!',
      totalVolumeKg: Math.round(totalVolume * 10) / 10,
      newPrs,
      workout: saved,
    });
  } catch (e) {
    return handleError(e);
  }
}
