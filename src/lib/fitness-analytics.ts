import { estimate1RM } from '@/lib/utils';

export interface StreakSummary {
  hasWorkouts: boolean;
  /** Consecutive active training days in the current streak (null if user has never logged a workout). */
  currentStreak: number | null;
  /** Longest streak of active training days ever recorded (null if user has never logged a workout). */
  longestStreak: number | null;
  /** Count of unique workout sessions completed in the last 7 local days. */
  workoutsThisWeek: number;
  /** Total completed workouts logged all-time. */
  totalWorkouts: number;
  /** Most recent workout local date (YYYY-MM-DD) or null. */
  lastWorkoutDate: string | null;
}

/**
 * Convert an ISO timestamp or YYYY-MM-DD date string to a local calendar date key (YYYY-MM-DD).
 * Respects the user's local timezone and avoids UTC midnight off-by-one shifts.
 */
export function toLocalDateKey(input: string | Date | null | undefined): string | null {
  if (!input) return null;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    return input.trim();
  }
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Convert YYYY-MM-DD into a UTC-midnight day index so day arithmetic is immune to DST shifts. */
function dateKeyToDayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/**
 * Calculate real workout consistency streak from actual workout_logs records.
 *
 * Rules:
 * - First-time users (0 workouts): returns hasWorkouts=false and null streaks (never invents 0 or 5 days).
 * - Duplicate workouts on the same calendar date are deduplicated into 1 training day.
 * - Rest day tolerance: allows up to 1 planned rest day between training sessions (gap <= 2 calendar days)
 *   without breaking the consistency streak, while counting ONLY actual workout days completed.
 * - Missed days: 2+ consecutive days without a workout (gap >= 3 calendar days) breaks the streak cleanly.
 * - Time zones: all timestamps are normalized to the user's local calendar date.
 */
export function calculateConsistencyStreak(
  workouts: any[],
  now: Date = new Date()
): StreakSummary {
  const validWorkouts = Array.isArray(workouts) ? workouts : [];
  if (validWorkouts.length === 0) {
    return {
      hasWorkouts: false,
      currentStreak: null,
      longestStreak: null,
      workoutsThisWeek: 0,
      totalWorkouts: 0,
      lastWorkoutDate: null,
    };
  }

  const todayKey = toLocalDateKey(now)!;
  const todayDayNum = dateKeyToDayNumber(todayKey);

  // Deduplicate workout dates and count sessions in last 7 days
  const uniqueDateKeys = new Set<string>();
  let workoutsThisWeek = 0;

  for (const w of validWorkouts) {
    const key = toLocalDateKey(w?.completed_at || w?.created_at);
    if (!key) continue;
    uniqueDateKeys.add(key);
    const dayNum = dateKeyToDayNumber(key);
    if (todayDayNum - dayNum >= 0 && todayDayNum - dayNum < 7) {
      workoutsThisWeek += 1;
    }
  }

  if (uniqueDateKeys.size === 0) {
    return {
      hasWorkouts: true,
      currentStreak: 0,
      longestStreak: 0,
      workoutsThisWeek,
      totalWorkouts: validWorkouts.length,
      lastWorkoutDate: null,
    };
  }

  // Sort unique training dates ascending
  const sortedDates = Array.from(uniqueDateKeys).sort();
  const dayNums = sortedDates.map(dateKeyToDayNumber);
  const lastWorkoutDate = sortedDates[sortedDates.length - 1];
  const mostRecentDayNum = dayNums[dayNums.length - 1];

  // Max allowed gap between workout days = 2 (allows 1 rest day without breaking consistency)
  const MAX_GAP_DAYS = 2;

  // Compute longest streak across all historical workout dates
  let longest = 1;
  let running = 1;
  for (let i = 1; i < dayNums.length; i++) {
    const diff = dayNums[i] - dayNums[i - 1];
    if (diff >= 1 && diff <= MAX_GAP_DAYS) {
      running += 1;
      if (running > longest) longest = running;
    } else if (diff > MAX_GAP_DAYS) {
      running = 1;
    }
  }

  // Compute current active streak anchored to today (allows today or yesterday, or 1 rest day)
  let currentStreak = 0;
  const daysSinceLast = todayDayNum - mostRecentDayNum;
  if (daysSinceLast <= MAX_GAP_DAYS) {
    currentStreak = 1;
    for (let i = dayNums.length - 2; i >= 0; i--) {
      const diff = dayNums[i + 1] - dayNums[i];
      if (diff >= 1 && diff <= MAX_GAP_DAYS) {
        currentStreak += 1;
      } else {
        break;
      }
    }
  }

  return {
    hasWorkouts: true,
    currentStreak,
    longestStreak: longest,
    workoutsThisWeek,
    totalWorkouts: validWorkouts.length,
    lastWorkoutDate,
  };
}

/**
 * Compute real analytics datasets exclusively from the authenticated user's Supabase records.
 * Never returns mock/sample/fallback records.
 */
export function buildRealAnalytics(params: {
  workouts: any[];
  measurements: any[];
  prs: any[];
  sleepLogs: any[];
  recoveryLogs: any[];
}) {
  const workouts = Array.isArray(params.workouts) ? params.workouts : [];
  const measurements = Array.isArray(params.measurements) ? params.measurements : [];
  const prs = Array.isArray(params.prs) ? params.prs : [];
  const sleepLogs = Array.isArray(params.sleepLogs) ? params.sleepLogs : [];
  const recoveryLogs = Array.isArray(params.recoveryLogs) ? params.recoveryLogs : [];

  const streak = calculateConsistencyStreak(workouts);

  // 1. Body Weight Progression (real measurements sorted chronologically)
  const sortedMeasurements = [...measurements]
    .filter((m) => Number.isFinite(Number(m?.weight_kg)) && Number(m.weight_kg) > 0)
    .sort((a, b) => String(a.recorded_date || '').localeCompare(String(b.recorded_date || '')));

  const weightSeries = sortedMeasurements.map((m) => ({
    date: String(m.recorded_date || '').slice(5) || String(m.recorded_date || ''),
    fullDate: String(m.recorded_date || ''),
    weight: Math.round(Number(m.weight_kg) * 10) / 10,
    bodyFat: m.body_fat_pct != null && Number.isFinite(Number(m.body_fat_pct))
      ? Math.round(Number(m.body_fat_pct) * 10) / 10
      : null,
  }));

  const weightDeltaKg =
    weightSeries.length >= 2
      ? Math.round((weightSeries[weightSeries.length - 1].weight - weightSeries[0].weight) * 10) / 10
      : null;

  // 2. Weekly Volume & Weekly Training Frequency (grouped by ISO week start Monday)
  const weeklyMap = new Map<string, { weekStart: string; label: string; volume: number; sessions: number }>();
  let totalVolumeKg = 0;

  // 3. Muscle Group Training Frequency & Volume
  const muscleMap = new Map<string, { muscle: string; sessions: number; sets: number; volume: number }>();

  // 4. Strength Progression (estimated 1RM per workout session)
  const chronologicalWorkouts = [...workouts].sort((a, b) =>
    String(a.completed_at || a.created_at || '').localeCompare(String(b.completed_at || b.created_at || ''))
  );

  const strengthSeries: { date: string; bestEst1RM: number; topExercise: string; volume: number }[] = [];

  for (const w of chronologicalWorkouts) {
    const vol = Math.max(0, Number(w.total_volume_kg) || 0);
    totalVolumeKg += vol;

    const dateKey = toLocalDateKey(w.completed_at || w.created_at);
    if (dateKey) {
      const [y, m, d] = dateKey.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const dayOfWeek = (dt.getDay() + 6) % 7; // Monday = 0
      dt.setDate(dt.getDate() - dayOfWeek);
      const weekStart = toLocalDateKey(dt)!;
      const existing = weeklyMap.get(weekStart) || {
        weekStart,
        label: weekStart.slice(5),
        volume: 0,
        sessions: 0,
      };
      existing.volume = Math.round(existing.volume + vol);
      existing.sessions += 1;
      weeklyMap.set(weekStart, existing);
    }

    const sessionMuscles = new Set<string>();
    let bestSession1RM = 0;
    let bestSessionExercise = '';

    for (const ex of Array.isArray(w.exercises) ? w.exercises : []) {
      const muscle = String(ex.category || ex.target_muscle || 'General').trim() || 'General';
      sessionMuscles.add(muscle);
      const mStat = muscleMap.get(muscle) || { muscle, sessions: 0, sets: 0, volume: 0 };

      for (const s of Array.isArray(ex.sets) ? ex.sets : []) {
        if (s.is_completed === false) continue;
        const wt = Number(s.weight_kg) || 0;
        const reps = Number(s.reps) || 0;
        mStat.sets += 1;
        mStat.volume = Math.round(mStat.volume + wt * reps);
        const e1rm = estimate1RM(wt, reps);
        if (e1rm > bestSession1RM) {
          bestSession1RM = e1rm;
          bestSessionExercise = ex.exercise_name || muscle;
        }
      }
      muscleMap.set(muscle, mStat);
    }

    for (const muscle of Array.from(sessionMuscles)) {
      const mStat = muscleMap.get(muscle);
      if (mStat) mStat.sessions += 1;
    }

    if (dateKey && (bestSession1RM > 0 || vol > 0)) {
      strengthSeries.push({
        date: dateKey.slice(5),
        bestEst1RM: bestSession1RM,
        topExercise: bestSessionExercise || w.name || 'Workout',
        volume: Math.round(vol),
      });
    }
  }

  const weeklySeries = Array.from(weeklyMap.values())
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .slice(-8);

  const avgWeeklyFrequency =
    weeklySeries.length > 0
      ? Math.round(
          (weeklySeries.reduce((acc, w) => acc + w.sessions, 0) / weeklySeries.length) * 10
        ) / 10
      : null;

  const muscleGroupFrequency = Array.from(muscleMap.values()).sort(
    (a, b) => b.sets - a.sets || b.volume - a.volume
  );

  // 5. Real Sleep Series (sorted chronologically, up to last 14 entries)
  const sleepSeries = [...sleepLogs]
    .filter((s) => Number.isFinite(Number(s?.sleep_hours)) && Number(s.sleep_hours) > 0)
    .sort((a, b) => String(a.log_date || '').localeCompare(String(b.log_date || '')))
    .slice(-14)
    .map((s) => ({
      date: String(s.log_date || '').slice(5) || String(s.log_date || ''),
      hours: Math.round(Number(s.sleep_hours) * 10) / 10,
      quality: Number(s.sleep_quality) || null,
    }));

  const avgSleepHours =
    sleepSeries.length > 0
      ? Math.round((sleepSeries.reduce((acc, s) => acc + s.hours, 0) / sleepSeries.length) * 10) / 10
      : null;

  // 6. Real Verified PRs (deduplicated 1RM & volume records)
  const realPrs = prs.filter((p) => Number.isFinite(Number(p?.value)) && Number(p.value) > 0);

  const hasAnyData =
    workouts.length > 0 ||
    weightSeries.length > 0 ||
    sleepSeries.length > 0 ||
    realPrs.length > 0 ||
    recoveryLogs.length > 0;

  return {
    hasAnyData,
    streak,
    totalWorkouts: workouts.length,
    totalVolumeKg: Math.round(totalVolumeKg),
    avgWeeklyFrequency,
    weightSeries,
    weightDeltaKg,
    weeklySeries,
    strengthSeries: strengthSeries.slice(-12),
    muscleGroupFrequency,
    sleepSeries,
    avgSleepHours,
    realPrs,
  };
}
