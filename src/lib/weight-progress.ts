export interface BodyMeasurementPoint {
  id?: string;
  recorded_date: string;
  weight_kg: number;
  body_fat_pct?: number | null;
  notes?: string | null;
}

export interface WeeklyWeightAverage {
  weekStart: string;
  label: string;
  avgWeightKg: number;
  entriesCount: number;
}

export interface WeightProgressSummary {
  hasMeasurements: boolean;
  measurementsCount: number;
  currentWeightKg: number | null;
  startingWeightKg: number | null;
  targetWeightKg: number | null;
  /** Signed difference: targetWeightKg - currentWeightKg (+ for gain, - for loss). */
  remainingKg: number | null;
  /** Progress percentage toward target weight (ONLY when >= 2 measurements & valid start != target). */
  progressPct: number | null;
  /** Weekly average weight grouped by ISO week (Mon-Sun). */
  weeklyAverages: WeeklyWeightAverage[];
  /** Average weekly change in kg/week ONLY when >= 2 distinct weeks of real readings exist. */
  weeklyAvgChangeKg: number | null;
  /** Total change from first recorded weight to latest weight (ONLY when >= 2 readings exist). */
  totalChangeKg: number | null;
  /** Trend label strictly derived from multi-week weekly averages (never a single day's reading). */
  trendStatus: 'insufficient_data' | 'gaining' | 'losing' | 'stable';
  /** True ONLY when multi-week trend shows >= 1.5 kg shift from baseline so user can opt in to recalculating calories. */
  shouldOfferRecalculation: boolean;
  recalculationReason: string | null;
  chartSeries: {
    date: string;
    fullDate: string;
    weightKg: number;
    rollingAvgKg: number | null;
  }[];
}

function getIsoWeekStart(dateStr: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dt.getTime())) return null;
  const dow = (dt.getUTCDay() + 6) % 7; // Monday = 0
  dt.setUTCDate(dt.getUTCDate() - dow);
  return dt.toISOString().slice(0, 10);
}

function daysBetweenIso(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.round((db - da) / 86_400_000);
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Analyze real historical body-weight measurements from Supabase.
 *
 * Rules:
 * - Never fabricates measurements or assumes progress from 1 reading.
 * - Uses weekly averages across >= 2 distinct weeks before reporting weekly change or trend.
 * - Never auto-changes calorie targets on a single day's fluctuation; only flags
 *   `shouldOfferRecalculation` when multi-week evidence justifies an optional recalculation.
 */
export function analyzeWeightProgress(params: {
  measurements: BodyMeasurementPoint[];
  profileWeightKg?: number | null;
  targetWeightKg?: number | null;
  primaryGoal?: string | null;
}): WeightProgressSummary {
  const valid = (Array.isArray(params.measurements) ? params.measurements : [])
    .filter(
      (m) =>
        m &&
        typeof m.recorded_date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(m.recorded_date.slice(0, 10)) &&
        Number.isFinite(Number(m.weight_kg)) &&
        Number(m.weight_kg) > 0
    )
    .map((m) => ({
      ...m,
      recorded_date: m.recorded_date.slice(0, 10),
      weight_kg: Number(m.weight_kg),
    }))
    .sort((a, b) => a.recorded_date.localeCompare(b.recorded_date));

  const latestRecorded = valid.length > 0 ? valid[valid.length - 1].weight_kg : null;
  const profileWeight =
    params.profileWeightKg != null &&
    Number.isFinite(Number(params.profileWeightKg)) &&
    Number(params.profileWeightKg) > 0
      ? Number(params.profileWeightKg)
      : null;

  const currentWeightKg = latestRecorded ?? profileWeight;
  const startingWeightKg = valid.length > 0 ? valid[0].weight_kg : null;
  const targetWeightKg =
    params.targetWeightKg != null &&
    Number.isFinite(Number(params.targetWeightKg)) &&
    Number(params.targetWeightKg) > 0
      ? Number(params.targetWeightKg)
      : null;

  const remainingKg =
    currentWeightKg !== null && targetWeightKg !== null ? r1(targetWeightKg - currentWeightKg) : null;

  const totalChangeKg =
    valid.length >= 2 ? r1(valid[valid.length - 1].weight_kg - valid[0].weight_kg) : null;

  let progressPct: number | null = null;
  if (
    valid.length >= 2 &&
    startingWeightKg !== null &&
    currentWeightKg !== null &&
    targetWeightKg !== null &&
    Math.abs(targetWeightKg - startingWeightKg) >= 0.1
  ) {
    const totalNeeded = targetWeightKg - startingWeightKg;
    const achieved = currentWeightKg - startingWeightKg;
    const rawPct = (achieved / totalNeeded) * 100;
    progressPct = Math.max(0, Math.min(100, Math.round(rawPct)));
  }

  // Group real readings into ISO weeks
  const weekBuckets = new Map<string, number[]>();
  for (const m of valid) {
    const wk = getIsoWeekStart(m.recorded_date);
    if (!wk) continue;
    const list = weekBuckets.get(wk) || [];
    list.push(m.weight_kg);
    weekBuckets.set(wk, list);
  }

  const weeklyAverages: WeeklyWeightAverage[] = Array.from(weekBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, weights]) => ({
      weekStart,
      label: weekStart.slice(5),
      avgWeightKg: r1(weights.reduce((s, w) => s + w, 0) / weights.length),
      entriesCount: weights.length,
    }));

  // Compute weekly average rate ONLY when >= 2 distinct weeks exist
  let weeklyAvgChangeKg: number | null = null;
  let trendStatus: WeightProgressSummary['trendStatus'] = 'insufficient_data';

  if (weeklyAverages.length >= 2) {
    const recentWeeks = weeklyAverages.slice(-4);
    const firstWk = recentWeeks[0];
    const lastWk = recentWeeks[recentWeeks.length - 1];
    const spanWeeks = Math.max(1, daysBetweenIso(firstWk.weekStart, lastWk.weekStart) / 7);
    weeklyAvgChangeKg = r2((lastWk.avgWeightKg - firstWk.avgWeightKg) / spanWeeks);

    if (weeklyAvgChangeKg >= 0.1) trendStatus = 'gaining';
    else if (weeklyAvgChangeKg <= -0.1) trendStatus = 'losing';
    else trendStatus = 'stable';
  }

  // Offer optional recalculation ONLY with >= 2 weeks of data and a meaningful shift (>= 1.5 kg)
  let shouldOfferRecalculation = false;
  let recalculationReason: string | null = null;
  if (weeklyAverages.length >= 2) {
    const firstAvg = weeklyAverages[0].avgWeightKg;
    const latestAvg = weeklyAverages[weeklyAverages.length - 1].avgWeightKg;
    const shiftKg = r1(latestAvg - firstAvg);
    if (Math.abs(shiftKg) >= 1.5) {
      shouldOfferRecalculation = true;
      recalculationReason = `Your weekly average body weight has shifted by ${shiftKg > 0 ? `+${shiftKg}` : shiftKg} kg across ${weeklyAverages.length} weeks. You can recalculate your BMR/TDEE estimates using your latest weight.`;
    }
  }

  // Build chart series with 7-day rolling average (only where >= 2 entries exist in the trailing 7 days)
  const chartSeries = valid.map((pt, idx) => {
    const windowPts = valid.slice(0, idx + 1).filter((p) => {
      const diff = daysBetweenIso(p.recorded_date, pt.recorded_date);
      return diff >= 0 && diff <= 6;
    });
    const rollingAvgKg =
      windowPts.length >= 2
        ? r1(windowPts.reduce((s, p) => s + p.weight_kg, 0) / windowPts.length)
        : null;
    return {
      date: pt.recorded_date.slice(5),
      fullDate: pt.recorded_date,
      weightKg: r1(pt.weight_kg),
      rollingAvgKg,
    };
  });

  return {
    hasMeasurements: valid.length > 0,
    measurementsCount: valid.length,
    currentWeightKg: currentWeightKg !== null ? r1(currentWeightKg) : null,
    startingWeightKg: startingWeightKg !== null ? r1(startingWeightKg) : null,
    targetWeightKg: targetWeightKg !== null ? r1(targetWeightKg) : null,
    remainingKg,
    progressPct,
    weeklyAverages,
    weeklyAvgChangeKg,
    totalChangeKg,
    trendStatus,
    shouldOfferRecalculation,
    recalculationReason,
    chartSeries,
  };
}
