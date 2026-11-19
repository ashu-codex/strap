import { NextRequest } from 'next/server';
import { logWorkout } from '@/lib/workout-service';

export async function POST(req: NextRequest) {
  return logWorkout(req);
}
