import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { strapStore } from '@/lib/store';
import { estimate1RM } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { user, isPremium } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isPremium) {
      return NextResponse.json(
        { error: 'Workout tracking is a STRAP Premium feature.' },
        { status: 403 }
      );
    }

    const workout = await req.json();

    // Calculate total volume and PRs
    let totalVolume = 0;
    const newPrs: { exercise: string; weight: number; reps: number; estimated1RM: number }[] = [];

    if (workout.exercises && Array.isArray(workout.exercises)) {
      for (const ex of workout.exercises) {
        let max1RMForExercise = 0;
        let bestWeight = 0;
        let bestReps = 0;

        for (const set of ex.sets || []) {
          if (set.is_completed) {
            const w = Number(set.weight_kg) || 0;
            const r = Number(set.reps) || 0;
            totalVolume += w * r;

            const calc1RM = estimate1RM(w, r);
            if (calc1RM > max1RMForExercise) {
              max1RMForExercise = calc1RM;
              bestWeight = w;
              bestReps = r;
            }
          }
        }

        // Check if this exceeds previous PR
        const existingPR = strapStore.progressRecords.find(
          (p) => p.user_id === user.id && p.exercise_name === ex.exercise_name && p.record_type === '1rm'
        );

        if (max1RMForExercise > 0 && (!existingPR || max1RMForExercise > existingPR.value)) {
          if (existingPR) {
            existingPR.value = max1RMForExercise;
            existingPR.achieved_at = new Date().toISOString().split('T')[0];
          } else {
            strapStore.progressRecords.push({
              id: 'pr-' + Date.now(),
              user_id: user.id,
              exercise_name: ex.exercise_name,
              record_type: '1rm',
              value: max1RMForExercise,
              achieved_at: new Date().toISOString().split('T')[0],
            });
          }

          newPrs.push({
            exercise: ex.exercise_name,
            weight: bestWeight,
            reps: bestReps,
            estimated1RM: max1RMForExercise,
          });
        }
      }
    }

    // Save completed workout
    const completedWorkout = {
      ...workout,
      id: 'w-' + Date.now(),
      completed_at: new Date().toISOString(),
      total_volume_kg: totalVolume,
    };
    strapStore.workouts.unshift(completedWorkout);

    return NextResponse.json({
      success: true,
      message: 'Workout logged successfully!',
      totalVolumeKg: totalVolume,
      newPrs,
      workout: completedWorkout,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
