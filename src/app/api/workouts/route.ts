import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { handleError, json, requireUser } from '@/lib/api';
import { logWorkout } from '@/lib/workout-service';

export async function GET(req: NextRequest) {
  try {
    const { user, isPremium } = await requireUser(req);
    const [workouts, prs] = await Promise.all([
      db.select('workout_logs', { eq: { user_id: user.id }, order: ['completed_at', 'desc'], limit: 100 }),
      db.select('progress_records', { eq: { user_id: user.id } }),
    ]);
    return json({ workouts, prs, isPremium });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  return logWorkout(req);
}
