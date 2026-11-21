'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  Dumbbell,
  Clock,
  Flame,
  Award,
  Save,
  Calendar,
  TrendingUp,
  Search,
  RefreshCw,
  Edit3,
  Copy,
  History,
  Layers,
  X,
  Settings,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SEED_EXERCISES, ExtendedExerciseItem } from '@/lib/exercises';
import { estimate1RM } from '@/lib/utils';
import ThreeDotMenu from '@/components/ui/ThreeDotMenu';

interface WorkoutSet {
  set_number: number;
  weight_kg: number;
  reps: number;
  is_completed: boolean;
  rpe?: number;
  rir?: number;
  pct_1rm?: number;
}

interface WorkoutExercise {
  exercise_name: string;
  target_muscle: string;
  category: string;
  competition_lift?: 'squat' | 'bench' | 'deadlift' | 'accessory';
  recommended_reps: string;
  rest_seconds: number;
  notes: string;
  alternatives: string[];
  sets: WorkoutSet[];
}

const POWERLIFTING_TEMPLATES: Record<string, { name: string; split: string; phase: string; exercises: WorkoutExercise[] }> = {
  sbd_strength: {
    name: 'Competition SBD Heavy Strength Block',
    split: 'Powerlifting SBD',
    phase: 'Heavy Strength (1–5 reps)',
    exercises: [
      {
        exercise_name: 'Low Bar Squat',
        target_muscle: 'Quadriceps, Glutes & Posterior Chain',
        category: 'Quadriceps',
        competition_lift: 'squat',
        recommended_reps: '1–5 reps (Heavy Strength)',
        rest_seconds: 210,
        notes: 'Brace 360° into belt, competition depth below knee crease.',
        alternatives: ['High Bar Squat', 'Pause Squat', 'Box Squat'],
        sets: [
          { set_number: 1, weight_kg: 100, reps: 5, is_completed: true, rpe: 7.5, rir: 2.5 },
          { set_number: 2, weight_kg: 110, reps: 3, is_completed: true, rpe: 8, rir: 2 },
          { set_number: 3, weight_kg: 117.5, reps: 3, is_completed: false, rpe: 8.5, rir: 1.5 },
          { set_number: 4, weight_kg: 122.5, reps: 2, is_completed: false, rpe: 9, rir: 1 },
        ],
      },
      {
        exercise_name: 'Paused Bench Press',
        target_muscle: 'Pectoralis Major & Triceps Lockout',
        category: 'Chest',
        competition_lift: 'bench',
        recommended_reps: '1–5 reps (Competition Pause)',
        rest_seconds: 180,
        notes: 'Motionless 1.5s pause on lower sternum before press command.',
        alternatives: ['Flat Barbell Bench Press', 'Spoto Press', 'Close Grip Bench Press'],
        sets: [
          { set_number: 1, weight_kg: 72.5, reps: 5, is_completed: true, rpe: 7.5, rir: 2.5 },
          { set_number: 2, weight_kg: 77.5, reps: 3, is_completed: false, rpe: 8.5, rir: 1.5 },
          { set_number: 3, weight_kg: 82.5, reps: 2, is_completed: false, rpe: 9, rir: 1 },
        ],
      },
      {
        exercise_name: 'Conventional Deadlift',
        target_muscle: 'Posterior Chain, Glutes & Hamstrings',
        category: 'Back',
        competition_lift: 'deadlift',
        recommended_reps: '1–5 reps (Heavy Pull)',
        rest_seconds: 210,
        notes: 'Pull slack out of bar, wedge hips, drive floor away.',
        alternatives: ['Sumo Deadlift', 'Deficit Deadlift', 'Pause Deadlift'],
        sets: [
          { set_number: 1, weight_kg: 130, reps: 4, is_completed: false, rpe: 8, rir: 2 },
          { set_number: 2, weight_kg: 140, reps: 3, is_completed: false, rpe: 8.5, rir: 1.5 },
          { set_number: 3, weight_kg: 147.5, reps: 2, is_completed: false, rpe: 9, rir: 1 },
        ],
      },
      {
        exercise_name: 'Barbell Row',
        target_muscle: 'Latissimus Dorsi & Upper Back',
        category: 'Back',
        competition_lift: 'accessory',
        recommended_reps: '6–10 reps (Accessory Work)',
        rest_seconds: 120,
        notes: 'Upper back thickness for deadlift & squat shelf stability.',
        alternatives: ['Chest Supported Row', 'T-Bar Row'],
        sets: [
          { set_number: 1, weight_kg: 70, reps: 8, is_completed: false, rpe: 8, rir: 2 },
          { set_number: 2, weight_kg: 72.5, reps: 8, is_completed: false, rpe: 8.5, rir: 1.5 },
        ],
      },
    ],
  },
  squat_bench_volume: {
    name: 'Powerlifting Moderate Strength & Variations',
    split: 'Squat & Bench Variations',
    phase: 'Moderate Strength (3–6 reps)',
    exercises: [
      {
        exercise_name: 'Pause Squat',
        target_muscle: 'Quadriceps, Glutes & Hole Positioning',
        category: 'Quadriceps',
        competition_lift: 'squat',
        recommended_reps: '3–6 reps (Moderate Strength)',
        rest_seconds: 180,
        notes: '2-second dead pause at bottom.',
        alternatives: ['Tempo Squat', 'High Bar Squat', 'Front Squat'],
        sets: [
          { set_number: 1, weight_kg: 95, reps: 5, is_completed: false, rpe: 7.5, rir: 2.5 },
          { set_number: 2, weight_kg: 100, reps: 4, is_completed: false, rpe: 8, rir: 2 },
          { set_number: 3, weight_kg: 100, reps: 4, is_completed: false, rpe: 8.5, rir: 1.5 },
        ],
      },
      {
        exercise_name: 'Close Grip Bench Press',
        target_muscle: 'Triceps & Lockout Power',
        category: 'Triceps',
        competition_lift: 'bench',
        recommended_reps: '4–6 reps (Moderate Strength)',
        rest_seconds: 150,
        notes: 'Tuck elbows, explosive triceps lockout.',
        alternatives: ['Spoto Press', 'Larsen Press', 'Incline Bench Press'],
        sets: [
          { set_number: 1, weight_kg: 67.5, reps: 6, is_completed: false, rpe: 8, rir: 2 },
          { set_number: 2, weight_kg: 70, reps: 5, is_completed: false, rpe: 8.5, rir: 1.5 },
          { set_number: 3, weight_kg: 70, reps: 5, is_completed: false, rpe: 8.5, rir: 1.5 },
        ],
      },
      {
        exercise_name: 'Romanian Deadlift',
        target_muscle: 'Hamstrings & Glutes',
        category: 'Hamstrings',
        competition_lift: 'deadlift',
        recommended_reps: '6–10 reps (Accessory Work)',
        rest_seconds: 120,
        notes: 'Strict hip hinge, keep bar close to shins.',
        alternatives: ['Deficit Deadlift', 'Block Pull'],
        sets: [
          { set_number: 1, weight_kg: 95, reps: 8, is_completed: false, rpe: 8, rir: 2 },
          { set_number: 2, weight_kg: 100, reps: 8, is_completed: false, rpe: 8.5, rir: 1.5 },
        ],
      },
    ],
  },
  deload_week: {
    name: 'Powerlifting Deload & Technique Week',
    split: 'SBD Deload (60–70% 1RM)',
    phase: 'Deload Week (RPE 5–6)',
    exercises: [
      {
        exercise_name: 'High Bar Squat',
        target_muscle: 'Quadriceps & Glutes',
        category: 'Quadriceps',
        competition_lift: 'squat',
        recommended_reps: '5 reps @ RPE 5–6 (Deload)',
        rest_seconds: 120,
        notes: 'Crisp bar speed, shed cumulative CNS fatigue.',
        alternatives: ['Low Bar Squat', 'Tempo Squat'],
        sets: [
          { set_number: 1, weight_kg: 80, reps: 5, is_completed: false, rpe: 5.5, rir: 4.5 },
          { set_number: 2, weight_kg: 80, reps: 5, is_completed: false, rpe: 6, rir: 4 },
        ],
      },
      {
        exercise_name: 'Flat Barbell Bench Press',
        target_muscle: 'Pectoralis Major',
        category: 'Chest',
        competition_lift: 'bench',
        recommended_reps: '5 reps @ RPE 5–6 (Deload)',
        rest_seconds: 120,
        notes: 'Focus on leg drive timing and bar path.',
        alternatives: ['Paused Bench Press'],
        sets: [
          { set_number: 1, weight_kg: 55, reps: 5, is_completed: false, rpe: 5.5, rir: 4.5 },
          { set_number: 2, weight_kg: 55, reps: 5, is_completed: false, rpe: 6, rir: 4 },
        ],
      },
    ],
  },
};

const HYPERTROPHY_TEMPLATES: Record<string, { name: string; split: string; phase: string; exercises: WorkoutExercise[] }> = {
  ppl_push: {
    name: 'Push Hypertrophy (Chest, Shoulders & Triceps)',
    split: 'PPL (Push / Pull / Legs)',
    phase: 'Hypertrophy Block (6–15 reps)',
    exercises: [
      {
        exercise_name: 'Flat Barbell Bench Press',
        target_muscle: 'Pectoralis Major',
        category: 'Chest',
        recommended_reps: '6–8 reps (Primary Compound)',
        rest_seconds: 120,
        notes: 'Full eccentric control, drive to lockout.',
        alternatives: ['Incline Dumbbell Press', 'Machine Chest Press'],
        sets: [
          { set_number: 1, weight_kg: 75, reps: 8, is_completed: true, rpe: 8, rir: 2 },
          { set_number: 2, weight_kg: 77.5, reps: 8, is_completed: true, rpe: 8.5, rir: 1.5 },
          { set_number: 3, weight_kg: 80, reps: 7, is_completed: false, rpe: 9, rir: 1 },
        ],
      },
      {
        exercise_name: 'Incline Dumbbell Press',
        target_muscle: 'Upper Chest (Clavicular Head)',
        category: 'Chest',
        recommended_reps: '8–12 reps (Hypertrophy)',
        rest_seconds: 90,
        notes: 'Deep stretch at bottom, 3-second eccentric.',
        alternatives: ['Incline Bench Press', 'Cable Fly'],
        sets: [
          { set_number: 1, weight_kg: 28, reps: 10, is_completed: false, rpe: 8, rir: 2 },
          { set_number: 2, weight_kg: 28, reps: 10, is_completed: false, rpe: 8.5, rir: 1.5 },
          { set_number: 3, weight_kg: 30, reps: 9, is_completed: false, rpe: 9, rir: 1 },
        ],
      },
      {
        exercise_name: 'Lateral Raises',
        target_muscle: 'Lateral Deltoids',
        category: 'Shoulders',
        recommended_reps: '12–15 reps (Metabolic Isolation)',
        rest_seconds: 60,
        notes: 'Lead with elbows in scapular plane.',
        alternatives: ['Cable Lateral Raises', 'Dumbbell Shoulder Press'],
        sets: [
          { set_number: 1, weight_kg: 12, reps: 15, is_completed: false, rpe: 8.5, rir: 1.5 },
          { set_number: 2, weight_kg: 12, reps: 14, is_completed: false, rpe: 9, rir: 1 },
          { set_number: 3, weight_kg: 12, reps: 12, is_completed: false, rpe: 9.5, rir: 0.5 },
        ],
      },
      {
        exercise_name: 'Rope Pushdown',
        target_muscle: 'Triceps Brachii',
        category: 'Triceps',
        recommended_reps: '10–15 reps (Isolation)',
        rest_seconds: 60,
        notes: 'Spread rope at bottom and squeeze 1 second.',
        alternatives: ['Skull Crushers', 'Overhead Cable Extension'],
        sets: [
          { set_number: 1, weight_kg: 25, reps: 12, is_completed: false, rpe: 8.5, rir: 1.5 },
          { set_number: 2, weight_kg: 25, reps: 12, is_completed: false, rpe: 9, rir: 1 },
        ],
      },
    ],
  },
  upper_lower: {
    name: 'Upper Body Hypertrophy & Density',
    split: 'Upper / Lower',
    phase: 'Progressive Overload Block',
    exercises: [
      {
        exercise_name: 'Barbell Row',
        target_muscle: 'Latissimus Dorsi & Mid-Back',
        category: 'Back',
        recommended_reps: '8–10 reps (Compound Pull)',
        rest_seconds: 90,
        notes: 'Pull bar into lower abdomen, retract scapulae.',
        alternatives: ['Chest Supported Row', 'T-Bar Row'],
        sets: [
          { set_number: 1, weight_kg: 70, reps: 10, is_completed: false, rpe: 8, rir: 2 },
          { set_number: 2, weight_kg: 72.5, reps: 9, is_completed: false, rpe: 8.5, rir: 1.5 },
          { set_number: 3, weight_kg: 75, reps: 8, is_completed: false, rpe: 9, rir: 1 },
        ],
      },
      {
        exercise_name: 'Lat Pulldown',
        target_muscle: 'Latissimus Dorsi',
        category: 'Back',
        recommended_reps: '10–12 reps (Vertical Pull)',
        rest_seconds: 75,
        notes: 'Full stretch at top, drive elbows down.',
        alternatives: ['Pull-ups', 'Straight Arm Pulldown'],
        sets: [
          { set_number: 1, weight_kg: 60, reps: 12, is_completed: false, rpe: 8, rir: 2 },
          { set_number: 2, weight_kg: 65, reps: 10, is_completed: false, rpe: 9, rir: 1 },
        ],
      },
      {
        exercise_name: 'Incline Dumbbell Curl',
        target_muscle: 'Biceps (Long Head)',
        category: 'Biceps',
        recommended_reps: '10–12 reps (Lengthened Isolation)',
        rest_seconds: 60,
        notes: 'Keep elbows behind torso.',
        alternatives: ['Barbell Curl', 'Hammer Curl'],
        sets: [
          { set_number: 1, weight_kg: 14, reps: 12, is_completed: false, rpe: 8.5, rir: 1.5 },
          { set_number: 2, weight_kg: 14, reps: 10, is_completed: false, rpe: 9, rir: 1 },
        ],
      },
    ],
  },
  full_body: {
    name: 'Full Body Foundations & Hypertrophy',
    split: 'Full Body',
    phase: 'Multi-Joint Hypertrophy',
    exercises: [
      {
        exercise_name: 'Squats',
        target_muscle: 'Quadriceps & Glutes',
        category: 'Quadriceps',
        recommended_reps: '6–10 reps (Compound)',
        rest_seconds: 150,
        notes: 'Full depth, controlled tempo.',
        alternatives: ['Leg Press', 'Hack Squat'],
        sets: [
          { set_number: 1, weight_kg: 90, reps: 8, is_completed: false, rpe: 8, rir: 2 },
          { set_number: 2, weight_kg: 95, reps: 8, is_completed: false, rpe: 8.5, rir: 1.5 },
          { set_number: 3, weight_kg: 95, reps: 7, is_completed: false, rpe: 9, rir: 1 },
        ],
      },
      {
        exercise_name: 'Incline Dumbbell Press',
        target_muscle: 'Upper Chest',
        category: 'Chest',
        recommended_reps: '8–12 reps (Compound)',
        rest_seconds: 90,
        notes: '3-second eccentric phase.',
        alternatives: ['Flat Barbell Bench Press'],
        sets: [
          { set_number: 1, weight_kg: 26, reps: 10, is_completed: false, rpe: 8, rir: 2 },
          { set_number: 2, weight_kg: 28, reps: 9, is_completed: false, rpe: 8.5, rir: 1.5 },
        ],
      },
      {
        exercise_name: 'Seated Cable Row',
        target_muscle: 'Mid-Back & Lats',
        category: 'Back',
        recommended_reps: '10–12 reps (Compound)',
        rest_seconds: 75,
        notes: 'Squeeze shoulder blades 1s at peak.',
        alternatives: ['Chest Supported Row'],
        sets: [
          { set_number: 1, weight_kg: 55, reps: 12, is_completed: false, rpe: 8, rir: 2 },
          { set_number: 2, weight_kg: 60, reps: 10, is_completed: false, rpe: 9, rir: 1 },
        ],
      },
    ],
  },
  bro_split_legs: {
    name: 'Bro Split — Dedicated Leg & Posterior Session',
    split: 'Bro Split',
    phase: 'High-Volume Hypertrophy',
    exercises: [
      {
        exercise_name: 'Hack Squat',
        target_muscle: 'Quadriceps',
        category: 'Quadriceps',
        recommended_reps: '8–10 reps (Compound)',
        rest_seconds: 120,
        notes: 'Keep lower back glued to pad.',
        alternatives: ['Leg Press', 'Squats'],
        sets: [
          { set_number: 1, weight_kg: 100, reps: 10, is_completed: false, rpe: 8, rir: 2 },
          { set_number: 2, weight_kg: 110, reps: 8, is_completed: false, rpe: 9, rir: 1 },
        ],
      },
      {
        exercise_name: 'Romanian Deadlift',
        target_muscle: 'Hamstrings & Glutes',
        category: 'Hamstrings',
        recommended_reps: '8–10 reps (Hinge)',
        rest_seconds: 120,
        notes: 'Maximal hamstring stretch at mid-shin.',
        alternatives: ['Leg Curl', 'Barbell Hip Thrust'],
        sets: [
          { set_number: 1, weight_kg: 90, reps: 10, is_completed: false, rpe: 8, rir: 2 },
          { set_number: 2, weight_kg: 95, reps: 8, is_completed: false, rpe: 8.5, rir: 1.5 },
        ],
      },
      {
        exercise_name: 'Leg Extension',
        target_muscle: 'Quadriceps Isolation',
        category: 'Quadriceps',
        recommended_reps: '12–15 reps (Isolation)',
        rest_seconds: 60,
        notes: '1-second pause at top contraction.',
        alternatives: ['Bulgarian Split Squat'],
        sets: [
          { set_number: 1, weight_kg: 45, reps: 15, is_completed: false, rpe: 8.5, rir: 1.5 },
          { set_number: 2, weight_kg: 50, reps: 12, is_completed: false, rpe: 9.5, rir: 0.5 },
        ],
      },
      {
        exercise_name: 'Calf Raises',
        target_muscle: 'Gastrocnemius & Soleus',
        category: 'Calves',
        recommended_reps: '12–15 reps (Isolation)',
        rest_seconds: 60,
        notes: '2-second pause in bottom stretch.',
        alternatives: [],
        sets: [
          { set_number: 1, weight_kg: 60, reps: 15, is_completed: false, rpe: 8.5, rir: 1.5 },
          { set_number: 2, weight_kg: 60, reps: 15, is_completed: false, rpe: 9, rir: 1 },
        ],
      },
    ],
  },
};

export default function WorkoutTrackerPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'logger' | 'history' | 'analytics'>('logger');

  // Training Style State (Powerlifting vs Muscle Building)
  const [trainingStyle, setTrainingStyle] = useState<'powerlifting' | 'muscle_building'>('muscle_building');
  const [showStylePrompt, setShowStylePrompt] = useState(false);
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [periodizationPhase, setPeriodizationPhase] = useState('Heavy Strength (1–5 reps)');

  // Powerlifting Competition 1RMs
  const [actual1RMs, setActual1RMs] = useState({ squat: 140, bench: 100, deadlift: 180 });
  const [editing1RMs, setEditing1RMs] = useState(false);

  // Active Workout Session State
  const [workoutName, setWorkoutName] = useState(HYPERTROPHY_TEMPLATES.ppl_push.name);
  const [splitType, setSplitType] = useState(HYPERTROPHY_TEMPLATES.ppl_push.split);
  const [exercises, setExercises] = useState<WorkoutExercise[]>(HYPERTROPHY_TEMPLATES.ppl_push.exercises);
  const [sessionNotes, setSessionNotes] = useState('');

  // History, PRs & Templates from DB
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [catalogExercises, setCatalogExercises] = useState<ExtendedExerciseItem[]>(SEED_EXERCISES);

  // Modals: Add Exercise, Create Custom Exercise, Exercise History
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseCatFilter, setExerciseCatFilter] = useState('All');
  const [customExerciseOpen, setCustomExerciseOpen] = useState(false);
  const [newCustomEx, setNewCustomEx] = useState({
    name: '',
    target_muscle: '',
    category: 'Chest',
    equipment: 'Barbell',
    default_reps: '8-12',
    competition_lift: 'accessory',
  });
  const [historyModalExercise, setHistoryModalExercise] = useState<string | null>(null);

  // Rest Timer State
  const [timerSeconds, setTimerSeconds] = useState(90);
  const [timerActive, setTimerActive] = useState(false);

  // Completion & Feedback
  const [finishing, setFinishing] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<any | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const loadWorkoutsData = async () => {
    try {
      const [wRes, exRes] = await Promise.all([
        fetch('/api/workouts', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/exercises').then((r) => r.json()),
      ]);
      if (Array.isArray(wRes.workouts)) setWorkoutHistory(wRes.workouts);
      if (Array.isArray(wRes.prs)) setPrs(wRes.prs);
      if (Array.isArray(wRes.customTemplates)) setCustomTemplates(wRes.customTemplates);
      if (wRes.actual1RMs) setActual1RMs(wRes.actual1RMs);
      if (wRes.experienceLevel) setExperienceLevel(wRes.experienceLevel);
      if (Array.isArray(exRes.exercises) && exRes.exercises.length) {
        setCatalogExercises(exRes.exercises);
      }

      if (!wRes.hasSelectedTrainingStyle) {
        setShowStylePrompt(true);
      } else if (wRes.trainingStyle === 'powerlifting' || wRes.trainingStyle === 'muscle_building') {
        applyTrainingStyleTemplate(wRes.trainingStyle, false);
      }
    } catch {
      // fallback to defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkoutsData();
  }, []);

  // Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const applyTrainingStyleTemplate = (style: 'powerlifting' | 'muscle_building', persist = true) => {
    setTrainingStyle(style);
    if (style === 'powerlifting') {
      const tpl = POWERLIFTING_TEMPLATES.sbd_strength;
      setWorkoutName(tpl.name);
      setSplitType(tpl.split);
      setPeriodizationPhase(tpl.phase);
      setExercises(JSON.parse(JSON.stringify(tpl.exercises)));
    } else {
      const tpl = HYPERTROPHY_TEMPLATES.ppl_push;
      setWorkoutName(tpl.name);
      setSplitType(tpl.split);
      setPeriodizationPhase(tpl.phase);
      setExercises(JSON.parse(JSON.stringify(tpl.exercises)));
    }
    if (persist) {
      setShowStylePrompt(false);
      fetch('/api/workouts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_training_style', training_style: style }),
      }).catch(() => null);
      setStatusNotice(
        `Switched primary tracker mode to ${
          style === 'powerlifting' ? 'Powerlifting (Competition SBD)' : 'Muscle Building (Hypertrophy)'
        }.`
      );
    }
  };

  const handleLoadBuiltInTemplate = (key: string) => {
    const map = trainingStyle === 'powerlifting' ? POWERLIFTING_TEMPLATES : HYPERTROPHY_TEMPLATES;
    const tpl = map[key];
    if (!tpl) return;
    setWorkoutName(tpl.name);
    setSplitType(tpl.split);
    setPeriodizationPhase(tpl.phase);
    setExercises(JSON.parse(JSON.stringify(tpl.exercises)));
    setStatusNotice(`Loaded template: ${tpl.name}`);
  };

  const startTimer = (seconds: number) => {
    setTimerSeconds(seconds);
    setTimerActive(true);
  };

  // Previous workout performance lookup for each exercise
  const previousPerformanceByExercise = useMemo(() => {
    const map = new Map<string, { weight_kg: number; reps: number; date: string; setsCount: number }>();
    for (const w of workoutHistory) {
      const dateStr = w.completed_at ? new Date(w.completed_at).toLocaleDateString() : 'Recent';
      const exList = Array.isArray(w.exercises) ? w.exercises : [];
      for (const ex of exList) {
        const key = String(ex.exercise_name || '').toLowerCase();
        if (!key || map.has(key)) continue;
        const sets = Array.isArray(ex.sets) ? ex.sets.filter((s: any) => s.is_completed !== false) : [];
        if (sets.length > 0) {
          const topSet = sets.reduce(
            (best: any, cur: any) => (Number(cur.weight_kg) > Number(best.weight_kg) ? cur : best),
            sets[0]
          );
          map.set(key, {
            weight_kg: Number(topSet.weight_kg) || 0,
            reps: Number(topSet.reps) || 0,
            date: dateStr,
            setsCount: sets.length,
          });
        }
      }
    }
    return map;
  }, [workoutHistory]);

  // Helper to get reference 1RM for %1RM calculation in Powerlifting mode
  const getReference1RM = (ex: WorkoutExercise): number => {
    const name = ex.exercise_name.toLowerCase();
    if (ex.competition_lift === 'squat' || name.includes('squat')) return actual1RMs.squat || 140;
    if (ex.competition_lift === 'bench' || name.includes('bench') || name.includes('spoto') || name.includes('larsen'))
      return actual1RMs.bench || 100;
    if (
      ex.competition_lift === 'deadlift' ||
      name.includes('deadlift') ||
      name.includes('block pull') ||
      name.includes('rack pull')
    )
      return actual1RMs.deadlift || 180;
    const pr = prs.find((p) => String(p.exercise_name).toLowerCase() === name && p.record_type === '1rm');
    return pr ? Number(pr.value) : 0;
  };

  // Recommended rep range tailored to exercise, training style, and experience
  const getRecommendedRepRange = (ex: ExtendedExerciseItem): string => {
    if (trainingStyle === 'powerlifting') {
      if (ex.competition_lift && ex.competition_lift !== 'accessory') {
        return experienceLevel === 'beginner' ? '3–5 reps @ RPE 7.5–8' : '1–5 reps @ RPE 8–9';
      }
      return '6–12 reps (Powerlifting Accessory)';
    }
    if (ex.exercise_type === 'Compound') {
      return experienceLevel === 'advanced' ? '6–10 reps @ 1–2 RIR' : '8–10 reps @ 2 RIR';
    }
    return '10–15 reps @ 0–2 RIR (Isolation)';
  };

  const handleToggleSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        const nextSets = ex.sets.map((s, j) => {
          if (j !== setIdx) return s;
          const nextCompleted = !s.is_completed;
          if (nextCompleted) startTimer(ex.rest_seconds || 90);
          return { ...s, is_completed: nextCompleted };
        });
        return { ...ex, sets: nextSets };
      })
    );
  };

  const handleUpdateSet = (
    exIdx: number,
    setIdx: number,
    field: 'weight_kg' | 'reps' | 'rpe' | 'rir',
    val: number
  ) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        const nextSets = ex.sets.map((s, j) => {
          if (j !== setIdx) return s;
          const updated: WorkoutSet = { ...s, [field]: val };
          if (field === 'rpe') {
            updated.rir = Math.max(0, Math.round((10 - val) * 10) / 10);
          } else if (field === 'rir') {
            updated.rpe = Math.min(10, Math.max(5, Math.round((10 - val) * 10) / 10));
          }
          return updated;
        });
        return { ...ex, sets: nextSets };
      })
    );
  };

  const handleAddSet = (exIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              set_number: ex.sets.length + 1,
              weight_kg: last?.weight_kg ?? 60,
              reps: last?.reps ?? (trainingStyle === 'powerlifting' ? 5 : 10),
              is_completed: false,
              rpe: last?.rpe ?? 8,
              rir: last?.rir ?? 2,
            },
          ],
        };
      })
    );
  };

  const handleRemoveSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx || ex.sets.length <= 1) return ex;
        const filtered = ex.sets.filter((_, j) => j !== setIdx).map((s, idx) => ({ ...s, set_number: idx + 1 }));
        return { ...ex, sets: filtered };
      })
    );
  };

  const handleAddExerciseFromCatalog = (item: ExtendedExerciseItem) => {
    const defaultRepsNum =
      trainingStyle === 'powerlifting' && item.competition_lift !== 'accessory'
        ? 5
        : parseInt(String(item.default_reps).split('-')[0], 10) || 10;

    const newEx: WorkoutExercise = {
      exercise_name: item.name,
      target_muscle: item.target_muscle,
      category: item.category,
      competition_lift: item.competition_lift || 'accessory',
      recommended_reps: getRecommendedRepRange(item),
      rest_seconds: item.default_rest_sec || 90,
      notes: '',
      alternatives: Array.isArray(item.alternatives) ? item.alternatives : [],
      sets: [
        { set_number: 1, weight_kg: 60, reps: defaultRepsNum, is_completed: false, rpe: 8, rir: 2 },
        { set_number: 2, weight_kg: 60, reps: defaultRepsNum, is_completed: false, rpe: 8, rir: 2 },
        { set_number: 3, weight_kg: 60, reps: defaultRepsNum, is_completed: false, rpe: 8.5, rir: 1.5 },
      ],
    };
    setExercises((prev) => [...prev, newEx]);
    setAddExerciseOpen(false);
    setStatusNotice(`Added ${item.name} to current workout.`);
  };

  const handleSwapAlternative = (exIdx: number, altName: string) => {
    const found = catalogExercises.find((c) => c.name.toLowerCase() === altName.toLowerCase());
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        return {
          ...ex,
          exercise_name: found?.name || altName,
          target_muscle: found?.target_muscle || ex.target_muscle,
          alternatives: found?.alternatives || ex.alternatives,
        };
      })
    );
    setStatusNotice(`Swapped exercise to ${altName}.`);
  };

  const handleCreateCustomExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomEx.name.trim()) return;
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCustomEx,
          target_muscle: newCustomEx.target_muscle || newCustomEx.category,
          training_styles: ['powerlifting', 'muscle_building'],
        }),
      });
      const data = await res.json();
      if (res.ok && data.exercise) {
        setCatalogExercises((prev) => [data.exercise, ...prev]);
        handleAddExerciseFromCatalog(data.exercise);
        setCustomExerciseOpen(false);
        setNewCustomEx({
          name: '',
          target_muscle: '',
          category: 'Chest',
          equipment: 'Barbell',
          default_reps: '8-12',
          competition_lift: 'accessory',
        });
      }
    } catch {
      // ignore
    }
  };

  const handleSaveAsTemplate = async () => {
    try {
      const res = await fetch('/api/workouts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_template',
          template: {
            name: workoutName,
            split_type: splitType,
            training_style: trainingStyle,
            exercises,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.customTemplates) {
        setCustomTemplates(data.customTemplates);
        setStatusNotice(`Saved "${workoutName}" to your custom templates.`);
      }
    } catch {
      // ignore
    }
  };

  const handleSave1RMs = async () => {
    setEditing1RMs(false);
    await fetch('/api/workouts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_1rms', actual_1rms: actual1RMs }),
    }).catch(() => null);
    setStatusNotice('Updated Powerlifting Competition 1RM maxes.');
  };

  const handleDeleteWorkoutHistory = async (id: string) => {
    try {
      const res = await fetch(`/api/workouts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        setWorkoutHistory((prev) => prev.filter((w) => w.id !== id));
        setStatusNotice('Workout entry deleted.');
      }
    } catch {
      // ignore
    }
  };

  const liveSessionMetrics = useMemo(() => {
    let totalVol = 0;
    let completedSets = 0;
    let peakEst1RM = 0;
    for (const ex of exercises) {
      for (const s of ex.sets) {
        if (s.is_completed) {
          totalVol += (Number(s.weight_kg) || 0) * (Number(s.reps) || 0);
          completedSets += 1;
          const e1rm = estimate1RM(Number(s.weight_kg) || 0, Number(s.reps) || 0);
          if (e1rm > peakEst1RM) peakEst1RM = e1rm;
        }
      }
    }
    return { totalVol: Math.round(totalVol), completedSets, peakEst1RM };
  }, [exercises]);

  // Weekly & Monthly muscle-group volume analytics
  const volumeAnalytics = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 86400_000;
    const monthMs = 30 * 86400_000;
    const weeklyByMuscle: Record<string, { sets: number; volume: number }> = {};
    let weeklyVolumeKg = 0;
    let monthlyVolumeKg = 0;
    let weeklySessions = 0;
    let monthlySessions = 0;

    for (const w of workoutHistory) {
      const ts = w.completed_at ? new Date(w.completed_at).getTime() : now;
      const ageMs = now - ts;
      const vol = Number(w.total_volume_kg) || 0;
      if (ageMs <= monthMs) {
        monthlyVolumeKg += vol;
        monthlySessions += 1;
      }
      if (ageMs <= weekMs) {
        weeklyVolumeKg += vol;
        weeklySessions += 1;
        for (const ex of Array.isArray(w.exercises) ? w.exercises : []) {
          const cat = ex.category || ex.target_muscle || 'General';
          if (!weeklyByMuscle[cat]) weeklyByMuscle[cat] = { sets: 0, volume: 0 };
          for (const s of Array.isArray(ex.sets) ? ex.sets : []) {
            if (s.is_completed !== false) {
              weeklyByMuscle[cat].sets += 1;
              weeklyByMuscle[cat].volume += (Number(s.weight_kg) || 0) * (Number(s.reps) || 0);
            }
          }
        }
      }
    }
    return {
      weeklyVolumeKg: Math.round(weeklyVolumeKg),
      monthlyVolumeKg: Math.round(monthlyVolumeKg),
      weeklySessions,
      monthlySessions,
      weeklyByMuscle,
    };
  }, [workoutHistory]);

  const handleFinishWorkout = async () => {
    setFinishing(true);
    setStatusNotice(null);
    try {
      const res = await fetch('/api/workouts/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workoutName,
          split_type: splitType,
          training_style: trainingStyle,
          program_level: experienceLevel,
          periodization_phase: periodizationPhase,
          notes: sessionNotes,
          exercises,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log workout');

      setCompletedSummary(data);
      await loadWorkoutsData();

      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#B7F34A', '#a3e635', '#ffffff'],
        });
      } catch {
        // ignore confetti error
      }
    } catch (err: any) {
      setStatusNotice(err.message || 'Could not log workout.');
    } finally {
      setFinishing(false);
    }
  };

  const filteredCatalog = useMemo(() => {
    return catalogExercises.filter((ex) => {
      if (exerciseCatFilter !== 'All' && ex.category.toLowerCase() !== exerciseCatFilter.toLowerCase()) {
        return false;
      }
      if (
        exerciseSearch.trim() &&
        !ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) &&
        !ex.target_muscle.toLowerCase().includes(exerciseSearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [catalogExercises, exerciseCatFilter, exerciseSearch]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B7F34A] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* First-Time Training Style Selection Modal (Requirement 4) */}
      {showStylePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#B7F34A]/40 bg-[#FFFFFF] dark:bg-[#1B1D22] p-6 sm:p-8 shadow-glow space-y-5">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#6BA814] dark:text-[#B7F34A] bg-[#B7F34A]/15 px-3 py-1 rounded-full border border-[#B7F34A]/30">
                Primary Training Style Selection
              </span>
              <h2 className="text-2xl font-black text-[#111318] dark:text-white pt-2">
                Select Your Primary Training Mode
              </h2>
              <p className="text-xs text-[#52525B] dark:text-[#9496A1]">
                Your exercise selection, rep ranges, %1RM calculations, and progression charts will adapt automatically. You can switch modes anytime in Settings or from the tracker bar.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => applyTrainingStyleTemplate('powerlifting', true)}
                className="p-5 rounded-xl border-2 border-[#E1E4E8] dark:border-[#30333A] hover:border-[#B7F34A] bg-[#F5F6F8] dark:bg-[#141519] text-left space-y-2 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-[#111318] dark:text-white group-hover:text-[#6BA814] dark:group-hover:text-[#B7F34A]">
                    Powerlifting
                  </span>
                  <Award className="h-5 w-5 text-[#6BA814] dark:text-[#B7F34A]" />
                </div>
                <p className="text-xs text-[#52525B] dark:text-[#9496A1] leading-relaxed">
                  Dedicated Squat, Bench Press & Deadlift variations, % of 1RM loading, RPE/RIR, Estimated & Actual 1RM tracking, and strength periodization (1–5 & 3–6 rep blocks).
                </p>
              </button>

              <button
                type="button"
                onClick={() => applyTrainingStyleTemplate('muscle_building', true)}
                className="p-5 rounded-xl border-2 border-[#E1E4E8] dark:border-[#30333A] hover:border-[#B7F34A] bg-[#F5F6F8] dark:bg-[#141519] text-left space-y-2 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-[#111318] dark:text-white group-hover:text-[#6BA814] dark:group-hover:text-[#B7F34A]">
                    Muscle Building
                  </span>
                  <Dumbbell className="h-5 w-5 text-[#6BA814] dark:text-[#B7F34A]" />
                </div>
                <p className="text-xs text-[#52525B] dark:text-[#9496A1] leading-relaxed">
                  Hypertrophy-focused tracker with PPL, Upper/Lower, Full Body & Bro Splits, 12+ muscle-group catalog, previous session comparison, and weekly muscle-group volume.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E1E4E8] dark:border-[#30333A] pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6BA814] dark:text-[#B7F34A] bg-[#B7F34A]/15 border border-[#B7F34A]/30 px-2.5 py-0.5 rounded-full">
              {trainingStyle === 'powerlifting' ? 'Powerlifting SBD System' : 'Muscle Building Hypertrophy System'}
            </span>
            <span className="text-xs font-mono text-[#52525B] dark:text-[#9496A1] capitalize">
              Level: {experienceLevel} • {periodizationPhase}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111318] dark:text-white">
            STRAP Advanced Workout Tracker
          </h1>
        </div>

        {/* Mode Segmented Toggle + Rest Timer */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] p-1">
            <button
              type="button"
              onClick={() => applyTrainingStyleTemplate('powerlifting', true)}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all ${
                trainingStyle === 'powerlifting'
                  ? 'bg-[#B7F34A] text-[#111318] shadow-glow'
                  : 'text-[#52525B] dark:text-[#9496A1] hover:text-[#111318] dark:hover:text-white'
              }`}
            >
              Powerlifting
            </button>
            <button
              type="button"
              onClick={() => applyTrainingStyleTemplate('muscle_building', true)}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all ${
                trainingStyle === 'muscle_building'
                  ? 'bg-[#B7F34A] text-[#111318] shadow-glow'
                  : 'text-[#52525B] dark:text-[#9496A1] hover:text-[#111318] dark:hover:text-white'
              }`}
            >
              Muscle Building
            </button>
          </div>

          {/* Live Rest Timer Pill */}
          <div className="flex items-center gap-2 rounded-[10px] border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] px-3 py-1.5">
            <Clock className={`h-4 w-4 ${timerActive ? 'text-[#B7F34A] animate-spin' : 'text-[#9496A1]'}`} />
            <span className="font-mono text-sm font-black text-[#111318] dark:text-white">
              {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => setTimerActive(!timerActive)}
              className="p-1 rounded bg-[#F5F6F8] dark:bg-[#141519] text-[#111318] dark:text-white"
              title={timerActive ? 'Pause Rest Timer' : 'Start Rest Timer'}
            >
              {timerActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimerActive(false);
                setTimerSeconds(trainingStyle === 'powerlifting' ? 180 : 90);
              }}
              className="p-1 rounded bg-[#F5F6F8] dark:bg-[#141519] text-[#52525B] dark:text-[#9496A1]"
              title="Reset Rest Timer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {statusNotice && (
        <div className="rounded-xl border border-[#B7F34A]/40 bg-[#B7F34A]/10 p-3 text-xs text-[#4d7c0f] dark:text-[#B7F34A] flex items-center justify-between">
          <span>{statusNotice}</span>
          <button type="button" onClick={() => setStatusNotice(null)} className="text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('logger')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-bold transition-all ${
              activeTab === 'logger'
                ? 'bg-[#B7F34A] text-[#111318] shadow-glow'
                : 'bg-[#FFFFFF] dark:bg-[#1B1D22] border border-[#E1E4E8] dark:border-[#30333A] text-[#52525B] dark:text-[#D1D5DB]'
            }`}
          >
            <Dumbbell className="h-3.5 w-3.5" />
            <span>Active Session Logger</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-[#B7F34A] text-[#111318] shadow-glow'
                : 'bg-[#FFFFFF] dark:bg-[#1B1D22] border border-[#E1E4E8] dark:border-[#30333A] text-[#52525B] dark:text-[#D1D5DB]'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Workout History & Calendar ({workoutHistory.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-bold transition-all ${
              activeTab === 'analytics'
                ? 'bg-[#B7F34A] text-[#111318] shadow-glow'
                : 'bg-[#FFFFFF] dark:bg-[#1B1D22] border border-[#E1E4E8] dark:border-[#30333A] text-[#52525B] dark:text-[#D1D5DB]'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>PRs, 1RM & Volume Reports</span>
          </button>
        </div>

        <a
          href="/profile"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#52525B] dark:text-[#9496A1] hover:text-[#111318] dark:hover:text-white"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Training Settings</span>
        </a>
      </div>

      {/* Powerlifting Competition 1RM Bar (Shown in Powerlifting Mode) */}
      {trainingStyle === 'powerlifting' && (
        <div className="rounded-2xl border border-[#B7F34A]/35 bg-[#FFFFFF] dark:bg-[#1B1D22] p-4 sm:p-5 shadow-glow space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6BA814] dark:text-[#B7F34A]">
                Competition SBD 1RM Reference & Periodization
              </span>
              <h3 className="text-sm font-black text-[#111318] dark:text-white">
                SBD Total: {actual1RMs.squat + actual1RMs.bench + actual1RMs.deadlift} kg
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={periodizationPhase}
                onChange={(e) => setPeriodizationPhase(e.target.value)}
                className="rounded-lg border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] px-2.5 py-1.5 text-xs font-semibold text-[#111318] dark:text-white"
              >
                <option value="Heavy Strength (1–5 reps)">Heavy Strength Work (1–5 reps)</option>
                <option value="Moderate Strength (3–6 reps)">Moderate Strength Work (3–6 reps)</option>
                <option value="Accessory Hypertrophy (6–15 reps)">Accessory Hypertrophy (6–15 reps)</option>
                <option value="Peaking & Singlet Prep (1–3 reps)">Peaking & Overreaching (1–3 reps)</option>
                <option value="Deload Week (60–70% 1RM)">Deload Week (60–70% 1RM @ RPE 5–6)</option>
              </select>
              {editing1RMs ? (
                <button
                  type="button"
                  onClick={handleSave1RMs}
                  className="px-3 py-1.5 rounded-lg bg-[#B7F34A] text-[#111318] text-xs font-extrabold"
                >
                  Save 1RMs
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing1RMs(true)}
                  className="px-3 py-1.5 rounded-lg border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] text-xs font-bold text-[#111318] dark:text-white"
                >
                  Edit Actual 1RMs
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(['squat', 'bench', 'deadlift'] as const).map((lift) => (
              <div
                key={lift}
                className="rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] p-3"
              >
                <span className="text-[10px] font-bold uppercase text-[#52525B] dark:text-[#9496A1] block">
                  {lift === 'squat' ? '1. Squat 1RM' : lift === 'bench' ? '2. Bench Press 1RM' : '3. Deadlift 1RM'}
                </span>
                {editing1RMs ? (
                  <input
                    type="number"
                    value={actual1RMs[lift]}
                    onChange={(e) => setActual1RMs({ ...actual1RMs, [lift]: Number(e.target.value) })}
                    className="mt-1 w-full rounded border border-[#B7F34A] bg-white dark:bg-[#1B1D22] px-2 py-1 text-sm font-black text-[#111318] dark:text-white"
                  />
                ) : (
                  <div className="text-lg font-black text-[#111318] dark:text-white mt-0.5">
                    {actual1RMs[lift]} <span className="text-xs font-normal text-[#9496A1]">kg</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1: ACTIVE LOGGER */}
      {activeTab === 'logger' && (
        <div className="space-y-6">
          {completedSummary && (
            <div className="rounded-2xl border border-[#B7F34A]/50 bg-[#FFFFFF] dark:bg-[#1B1D22] p-6 shadow-glow space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#B7F34A]/20 text-[#6BA814] dark:text-[#B7F34A]">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6BA814] dark:text-[#B7F34A]">
                      Session Saved to Database
                    </span>
                    <h3 className="text-lg font-black text-[#111318] dark:text-white">
                      Workout Completed — {completedSummary.totalVolumeKg?.toLocaleString()} kg Total Volume
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCompletedSummary(null)}
                  className="text-xs font-bold text-[#52525B] dark:text-[#9496A1]"
                >
                  Dismiss
                </button>
              </div>
              {completedSummary.newPrs?.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {completedSummary.newPrs.map((pr: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-[#B7F34A]/30 bg-[#B7F34A]/10 p-2.5 text-xs text-[#111318] dark:text-white"
                    >
                      <strong className="block text-[#6BA814] dark:text-[#B7F34A]">NEW PR: {pr.exercise}</strong>
                      <span>
                        {pr.weight} kg × {pr.reps} reps (Est. 1RM: <strong>{pr.estimated1RM} kg</strong>)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Template & Split Bar */}
          <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[#111318] dark:text-white">Presets & Splits:</span>
                {trainingStyle === 'powerlifting' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleLoadBuiltInTemplate('sbd_strength')}
                      className="px-3 py-1.5 rounded-lg border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] text-xs font-semibold text-[#111318] dark:text-white hover:border-[#B7F34A]"
                    >
                      SBD Heavy (1–5 Reps)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadBuiltInTemplate('squat_bench_volume')}
                      className="px-3 py-1.5 rounded-lg border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] text-xs font-semibold text-[#111318] dark:text-white hover:border-[#B7F34A]"
                    >
                      Variations (3–6 Reps)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadBuiltInTemplate('deload_week')}
                      className="px-3 py-1.5 rounded-lg border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] text-xs font-semibold text-[#111318] dark:text-white hover:border-[#B7F34A]"
                    >
                      Deload Week
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleLoadBuiltInTemplate('ppl_push')}
                      className="px-3 py-1.5 rounded-lg border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] text-xs font-semibold text-[#111318] dark:text-white hover:border-[#B7F34A]"
                    >
                      PPL Split
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadBuiltInTemplate('upper_lower')}
                      className="px-3 py-1.5 rounded-lg border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] text-xs font-semibold text-[#111318] dark:text-white hover:border-[#B7F34A]"
                    >
                      Upper / Lower
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadBuiltInTemplate('full_body')}
                      className="px-3 py-1.5 rounded-lg border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] text-xs font-semibold text-[#111318] dark:text-white hover:border-[#B7F34A]"
                    >
                      Full Body
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadBuiltInTemplate('bro_split_legs')}
                      className="px-3 py-1.5 rounded-lg border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] text-xs font-semibold text-[#111318] dark:text-white hover:border-[#B7F34A]"
                    >
                      Bro Split
                    </button>
                  </>
                )}
                {customTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setWorkoutName(tpl.name);
                      setSplitType(tpl.split_type || 'Custom Split');
                      setExercises(JSON.parse(JSON.stringify(tpl.exercises || [])));
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#B7F34A]/40 bg-[#B7F34A]/10 text-xs font-bold text-[#6BA814] dark:text-[#B7F34A]"
                  >
                    ★ {tpl.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAsTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] text-xs font-bold text-[#111318] dark:text-white hover:border-[#B7F34A]"
                >
                  <Layers className="h-3.5 w-3.5 text-[#6BA814] dark:text-[#B7F34A]" />
                  <span>Save as Template</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddExerciseOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#B7F34A] text-[#111318] text-xs font-extrabold shadow-glow"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Exercise</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-[#52525B] dark:text-[#9496A1] block mb-1">
                  Session Title
                </label>
                <input
                  type="text"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] p-2.5 text-xs font-bold text-[#111318] dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-[#52525B] dark:text-[#9496A1] block mb-1">
                  Workout Split Type
                </label>
                <input
                  type="text"
                  value={splitType}
                  onChange={(e) => setSplitType(e.target.value)}
                  placeholder="PPL, Upper/Lower, SBD, Custom..."
                  className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] p-2.5 text-xs text-[#111318] dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-[#52525B] dark:text-[#9496A1] block mb-1">
                  Live Session Telemetry
                </label>
                <div className="rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] p-2.5 text-xs font-mono text-[#111318] dark:text-white flex items-center justify-between">
                  <span>Vol: {liveSessionMetrics.totalVol.toLocaleString()} kg</span>
                  <span>Sets: {liveSessionMetrics.completedSets}</span>
                  <span>Peak 1RM: {liveSessionMetrics.peakEst1RM} kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Exercise Cards List */}
          <div className="space-y-4">
            {exercises.map((ex, exIdx) => {
              const prevPerf = previousPerformanceByExercise.get(ex.exercise_name.toLowerCase());
              const ref1RM = getReference1RM(ex);
              const bestSet = ex.sets.reduce(
                (best, cur) => {
                  const rm = estimate1RM(Number(cur.weight_kg) || 0, Number(cur.reps) || 0);
                  return rm > best.rm ? { rm, weight: cur.weight_kg, reps: cur.reps } : best;
                },
                { rm: 0, weight: 0, reps: 0 }
              );
              const exVol = ex.sets.reduce(
                (acc, s) => acc + (s.is_completed ? (Number(s.weight_kg) || 0) * (Number(s.reps) || 0) : 0),
                0
              );

              return (
                <div
                  key={`${ex.exercise_name}-${exIdx}`}
                  className="rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] p-5 space-y-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#E1E4E8] dark:border-[#30333A] pb-3.5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-[#B7F34A]/20 text-[#6BA814] dark:text-[#B7F34A]">
                          #{exIdx + 1} {ex.category}
                        </span>
                        <h3 className="text-base font-black text-[#111318] dark:text-white">{ex.exercise_name}</h3>
                        <span className="text-[11px] font-semibold text-[#6BA814] dark:text-[#B7F34A] bg-[#B7F34A]/10 px-2 py-0.5 rounded-full">
                          Target: {ex.recommended_reps}
                        </span>
                      </div>
                      <p className="text-xs text-[#52525B] dark:text-[#9496A1] mt-1">
                        Primary Muscle: <strong>{ex.target_muscle}</strong> • Volume: <strong>{exVol} kg</strong>
                        {bestSet.rm > 0 && (
                          <>
                            {' '}
                            • Best Set: <strong>{bestSet.weight} kg × {bestSet.reps}</strong> (Est. 1RM:{' '}
                            <strong className="text-[#6BA814] dark:text-[#B7F34A]">{bestSet.rm} kg</strong>)
                          </>
                        )}
                      </p>
                      {prevPerf && (
                        <p className="text-[11px] font-mono text-[#6BA814] dark:text-[#B7F34A] mt-0.5">
                          Previous Session ({prevPerf.date}): {prevPerf.weight_kg} kg × {prevPerf.reps} reps ({prevPerf.setsCount} sets)
                        </p>
                      )}
                    </div>

                    {/* Rest selector + Three-Dot Contextual Menu (Phase 6 Requirement 17) */}
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={ex.rest_seconds}
                        onChange={(e) => {
                          const sec = Number(e.target.value);
                          setExercises((prev) =>
                            prev.map((item, i) => (i === exIdx ? { ...item, rest_seconds: sec } : item))
                          );
                        }}
                        className="rounded-lg border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] px-2.5 py-1.5 text-xs text-[#111318] dark:text-white"
                        title="Rest time between sets"
                      >
                        <option value={60}>Rest: 60s</option>
                        <option value={90}>Rest: 90s</option>
                        <option value={120}>Rest: 120s</option>
                        <option value={180}>Rest: 180s</option>
                        <option value={240}>Rest: 240s</option>
                      </select>

                      <ThreeDotMenu
                        ariaLabel={`Actions for ${ex.exercise_name}`}
                        actions={[
                          {
                            label: 'View Exercise History',
                            icon: <History className="h-3.5 w-3.5" />,
                            onClick: () => setHistoryModalExercise(ex.exercise_name),
                          },
                          {
                            label: 'Add Set',
                            icon: <Plus className="h-3.5 w-3.5" />,
                            onClick: () => handleAddSet(exIdx),
                          },
                          ...(ex.alternatives?.slice(0, 2).map((alt) => ({
                            label: `Swap: ${alt}`,
                            icon: <RefreshCw className="h-3.5 w-3.5" />,
                            onClick: () => handleSwapAlternative(exIdx, alt),
                          })) || []),
                          {
                            label: 'Remove Exercise',
                            icon: <Trash2 className="h-3.5 w-3.5" />,
                            destructive: true,
                            onClick: () => setExercises((prev) => prev.filter((_, i) => i !== exIdx)),
                          },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Sets Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#E1E4E8] dark:border-[#30333A] text-[10px] uppercase text-[#52525B] dark:text-[#9496A1]">
                          <th className="py-2 pr-2">Set</th>
                          <th className="py-2 px-2">Weight (kg)</th>
                          <th className="py-2 px-2">Reps</th>
                          <th className="py-2 px-2">RPE / RIR</th>
                          {trainingStyle === 'powerlifting' && <th className="py-2 px-2">% 1RM</th>}
                          <th className="py-2 px-2">Est. 1RM</th>
                          <th className="py-2 pl-2 text-right">Done</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E1E4E8]/60 dark:divide-[#30333A]/60">
                        {ex.sets.map((s, sIdx) => {
                          const est1rm = estimate1RM(Number(s.weight_kg) || 0, Number(s.reps) || 0);
                          const pct1rm = ref1RM > 0 ? Math.round(((Number(s.weight_kg) || 0) / ref1RM) * 100) : null;
                          return (
                            <tr
                              key={sIdx}
                              className={s.is_completed ? 'bg-[#B7F34A]/10' : ''}
                            >
                              <td className="py-2.5 pr-2 font-mono font-bold text-[#111318] dark:text-white">
                                #{s.set_number}
                              </td>
                              <td className="py-2.5 px-2">
                                <input
                                  type="number"
                                  step="0.5"
                                  min={0}
                                  value={s.weight_kg}
                                  onChange={(e) =>
                                    handleUpdateSet(exIdx, sIdx, 'weight_kg', Number(e.target.value))
                                  }
                                  className="w-20 rounded-lg border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] px-2.5 py-1.5 text-xs font-bold text-[#111318] dark:text-white"
                                />
                              </td>
                              <td className="py-2.5 px-2">
                                <input
                                  type="number"
                                  min={0}
                                  value={s.reps}
                                  onChange={(e) => handleUpdateSet(exIdx, sIdx, 'reps', Number(e.target.value))}
                                  className="w-16 rounded-lg border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] px-2.5 py-1.5 text-xs font-bold text-[#111318] dark:text-white"
                                />
                              </td>
                              <td className="py-2.5 px-2">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min={5}
                                    max={10}
                                    value={s.rpe ?? 8}
                                    onChange={(e) => handleUpdateSet(exIdx, sIdx, 'rpe', Number(e.target.value))}
                                    className="w-14 rounded-lg border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] px-2 py-1.5 text-xs text-[#111318] dark:text-white"
                                    title="RPE (Rate of Perceived Exertion 6-10)"
                                  />
                                  <span className="text-[10px] font-mono text-[#52525B] dark:text-[#9496A1]">
                                    ({s.rir ?? Math.max(0, 10 - (s.rpe ?? 8))} RIR)
                                  </span>
                                </div>
                              </td>
                              {trainingStyle === 'powerlifting' && (
                                <td className="py-2.5 px-2 font-mono text-xs font-bold text-[#6BA814] dark:text-[#B7F34A]">
                                  {pct1rm ? `${pct1rm}%` : '—'}
                                </td>
                              )}
                              <td className="py-2.5 px-2 font-mono text-xs text-[#111318] dark:text-zinc-200">
                                {est1rm > 0 ? `${est1rm} kg` : '—'}
                              </td>
                              <td className="py-2.5 pl-2 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSet(exIdx, sIdx)}
                                    className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${
                                      s.is_completed
                                        ? 'bg-[#B7F34A] text-[#111318] font-black shadow-glow'
                                        : 'border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] text-[#9496A1]'
                                    }`}
                                    title="Mark set complete"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  {ex.sets.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSet(exIdx, sIdx)}
                                      className="p-1 text-[#9496A1] hover:text-red-400"
                                      title="Delete set"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Exercise Notes & Add Set Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                    <input
                      type="text"
                      value={ex.notes || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExercises((prev) =>
                          prev.map((item, i) => (i === exIdx ? { ...item, notes: val } : item))
                        );
                      }}
                      placeholder="Add exercise notes (e.g. belt on top set, pause count, seat height)..."
                      className="flex-1 rounded-lg border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] px-3 py-1.5 text-xs text-[#111318] dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSet(exIdx)}
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] text-xs font-bold text-[#111318] dark:text-white hover:border-[#B7F34A]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Set</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Complete & Log Workout Footer */}
          <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Overall session notes (energy, recovery feel, sleep quality)..."
                className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] p-2.5 text-xs text-[#111318] dark:text-white"
              />
            </div>
            <button
              type="button"
              disabled={finishing}
              onClick={handleFinishWorkout}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#B7F34A] text-[#111318] text-xs font-extrabold shadow-glow hover:bg-[#A7E438] transition-all shrink-0 strap-primary"
            >
              <Save className="h-4 w-4" />
              <span>{finishing ? 'Saving Session...' : 'Finish & Record Workout'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: WORKOUT HISTORY & TRAINING CALENDAR */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* 30-Day Training Calendar Strip */}
          <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] p-5 space-y-3">
            <h3 className="text-sm font-black text-[#111318] dark:text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#6BA814] dark:text-[#B7F34A]" />
              <span>30-Day Training Consistency Calendar</span>
            </h3>
            <div className="grid grid-cols-10 sm:grid-cols-15 gap-1.5">
              {Array.from({ length: 30 }).map((_, idx) => {
                const day = new Date(Date.now() - (29 - idx) * 86400_000);
                const iso = day.toISOString().slice(0, 10);
                const hasWorkout = workoutHistory.some((w) => String(w.completed_at || '').slice(0, 10) === iso);
                return (
                  <div
                    key={iso}
                    title={`${iso}${hasWorkout ? ' — Workout Completed' : ''}`}
                    className={`rounded-lg p-2 text-center border text-[10px] font-mono ${
                      hasWorkout
                        ? 'border-[#B7F34A] bg-[#B7F34A]/20 text-[#111318] dark:text-[#B7F34A] font-black'
                        : 'border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] text-[#9496A1]'
                    }`}
                  >
                    {day.getDate()}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Past Logged Workouts with Three-Dot Menu (⋮) */}
          <div className="space-y-3">
            {workoutHistory.length === 0 ? (
              <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] p-10 text-center text-xs text-[#9496A1]">
                No workouts logged yet. Complete a session in the Active Session Logger to populate your history.
              </div>
            ) : (
              workoutHistory.map((w) => (
                <div
                  key={w.id}
                  className="rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-[#111318] dark:text-white">{w.name}</h4>
                        {w.split_type && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#B7F34A]/15 text-[#6BA814] dark:text-[#B7F34A]">
                            {w.split_type}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#52525B] dark:text-[#9496A1] mt-0.5">
                        {w.completed_at ? new Date(w.completed_at).toLocaleString() : 'Logged Session'} • Total Volume:{' '}
                        <strong>{Number(w.total_volume_kg || 0).toLocaleString()} kg</strong>
                      </p>
                    </div>

                    <ThreeDotMenu
                      ariaLabel={`Workout options for ${w.name}`}
                      actions={[
                        {
                          label: 'Load into Active Logger',
                          icon: <Copy className="h-3.5 w-3.5" />,
                          onClick: () => {
                            setWorkoutName(w.name);
                            setSplitType(w.split_type || splitType);
                            if (Array.isArray(w.exercises) && w.exercises.length) {
                              setExercises(
                                w.exercises.map((ex: any) => ({
                                  exercise_name: ex.exercise_name,
                                  target_muscle: ex.target_muscle || ex.category || 'General',
                                  category: ex.category || 'Full Body',
                                  recommended_reps: ex.recommended_reps || '6–10 reps',
                                  rest_seconds: ex.rest_seconds || 90,
                                  notes: ex.notes || '',
                                  alternatives: ex.alternatives || [],
                                  sets: Array.isArray(ex.sets) ? ex.sets : [],
                                }))
                              );
                            }
                            setActiveTab('logger');
                            setStatusNotice(`Loaded "${w.name}" into Active Logger.`);
                          },
                        },
                        {
                          label: 'Edit Workout Title',
                          icon: <Edit3 className="h-3.5 w-3.5" />,
                          onClick: async () => {
                            const nextTitle = window.prompt('Edit workout title:', w.name);
                            if (!nextTitle || !nextTitle.trim()) return;
                            const res = await fetch('/api/workouts', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'edit_workout',
                                workout_id: w.id,
                                workout_patch: { name: nextTitle.trim() },
                              }),
                            });
                            if (res.ok) {
                              setWorkoutHistory((prev) =>
                                prev.map((item) => (item.id === w.id ? { ...item, name: nextTitle.trim() } : item))
                              );
                            }
                          },
                        },
                        {
                          label: 'Delete Workout',
                          icon: <Trash2 className="h-3.5 w-3.5" />,
                          destructive: true,
                          onClick: () => handleDeleteWorkoutHistory(w.id),
                        },
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {(Array.isArray(w.exercises) ? w.exercises : []).map((ex: any, i: number) => (
                      <div
                        key={i}
                        className="rounded-lg border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] p-2.5"
                      >
                        <strong className="text-[#111318] dark:text-white block">{ex.exercise_name}</strong>
                        <span className="text-[11px] font-mono text-[#52525B] dark:text-[#9496A1]">
                          {(Array.isArray(ex.sets) ? ex.sets : [])
                            .map((s: any) => `${s.weight_kg}kg×${s.reps}`)
                            .join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PRS, STRENGTH PROGRESSION & WEEKLY/MONTHLY VOLUME REPORTS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Weekly & Monthly Progress Report Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] p-5">
              <span className="text-[10px] font-bold uppercase text-[#52525B] dark:text-[#9496A1]">
                7-Day Training Volume
              </span>
              <div className="text-2xl font-black text-[#111318] dark:text-white mt-1">
                {volumeAnalytics.weeklyVolumeKg.toLocaleString()} <span className="text-xs font-normal">kg</span>
              </div>
              <p className="text-[11px] text-[#6BA814] dark:text-[#B7F34A] mt-0.5">
                {volumeAnalytics.weeklySessions} sessions logged this week
              </p>
            </div>

            <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] p-5">
              <span className="text-[10px] font-bold uppercase text-[#52525B] dark:text-[#9496A1]">
                30-Day Monthly Volume
              </span>
              <div className="text-2xl font-black text-[#111318] dark:text-white mt-1">
                {volumeAnalytics.monthlyVolumeKg.toLocaleString()} <span className="text-xs font-normal">kg</span>
              </div>
              <p className="text-[11px] text-[#52525B] dark:text-[#9496A1] mt-0.5">
                {volumeAnalytics.monthlySessions} sessions in last 30 days
              </p>
            </div>

            <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] p-5">
              <span className="text-[10px] font-bold uppercase text-[#52525B] dark:text-[#9496A1]">
                Powerlifting SBD Total
              </span>
              <div className="text-2xl font-black text-[#6BA814] dark:text-[#B7F34A] mt-1">
                {actual1RMs.squat + actual1RMs.bench + actual1RMs.deadlift} <span className="text-xs font-normal">kg</span>
              </div>
              <p className="text-[11px] text-[#52525B] dark:text-[#9496A1] mt-0.5">
                S: {actual1RMs.squat} • B: {actual1RMs.bench} • D: {actual1RMs.deadlift} kg
              </p>
            </div>

            <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] p-5">
              <span className="text-[10px] font-bold uppercase text-[#52525B] dark:text-[#9496A1]">
                All-Time Logged PRs
              </span>
              <div className="text-2xl font-black text-[#111318] dark:text-white mt-1">{prs.length}</div>
              <p className="text-[11px] text-[#52525B] dark:text-[#9496A1] mt-0.5">
                Verified 1RM & Volume milestones
              </p>
            </div>
          </div>

          {/* Weekly Muscle-Group Volume Breakdown */}
          <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] p-6 space-y-4">
            <h3 className="text-base font-black text-[#111318] dark:text-white flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#6BA814] dark:text-[#B7F34A]" />
              <span>Weekly Muscle-Group Working Sets & Tonnage</span>
            </h3>
            {Object.keys(volumeAnalytics.weeklyByMuscle).length === 0 ? (
              <p className="text-xs text-[#9496A1]">
                Complete a workout session to view your weekly muscle-group set and volume breakdown.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(volumeAnalytics.weeklyByMuscle).map(([muscle, stat]) => (
                  <div
                    key={muscle}
                    className="rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-[#111318] dark:text-white">
                      <span>{muscle}</span>
                      <span className="text-[#6BA814] dark:text-[#B7F34A]">{stat.sets} sets</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#E1E4E8] dark:bg-[#252830] overflow-hidden">
                      <div
                        className="h-full bg-[#B7F34A]"
                        style={{ width: `${Math.min(100, (stat.sets / 16) * 100)}%` }}
                      />
                    </div>
                    <div className="text-[10px] font-mono text-[#52525B] dark:text-[#9496A1]">
                      Weekly Volume: {Math.round(stat.volume).toLocaleString()} kg
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Personal Records Dashboard */}
          <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] p-6 space-y-4">
            <h3 className="text-base font-black text-[#111318] dark:text-white flex items-center gap-2">
              <Award className="h-4 w-4 text-[#6BA814] dark:text-[#B7F34A]" />
              <span>Personal Records (1RM & Max Tonnage)</span>
            </h3>
            {prs.length === 0 ? (
              <p className="text-xs text-[#9496A1]">
                Your best sets and estimated 1RMs will automatically appear here as you log workouts.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {prs.map((pr, idx) => (
                  <div
                    key={pr.id || idx}
                    className="rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] p-4 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#6BA814] dark:text-[#B7F34A]">
                        {pr.record_type === '1rm' ? 'Estimated 1RM' : 'Max Exercise Volume'}
                      </span>
                      <h4 className="text-xs font-black text-[#111318] dark:text-white mt-0.5">
                        {pr.exercise_name}
                      </h4>
                      <span className="text-[10px] text-[#9496A1]">{pr.achieved_at}</span>
                    </div>
                    <div className="text-lg font-black text-[#111318] dark:text-white">
                      {pr.value} <span className="text-xs font-normal text-[#9496A1]">kg</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD EXERCISE MODAL */}
      {addExerciseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#111318] dark:text-white">
                Add Exercise to Workout ({catalogExercises.length} Available)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomExerciseOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#B7F34A] text-[#111318] text-xs font-extrabold"
                >
                  + Create Custom Exercise
                </button>
                <button
                  type="button"
                  onClick={() => setAddExerciseOpen(false)}
                  className="p-1 text-[#9496A1] hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9496A1]" />
              <input
                type="text"
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                placeholder="Search Squat, Paused Bench, Spoto, Sumo Deadlift, Lat Pulldown, Rear Delt..."
                className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] py-2.5 pl-9 pr-4 text-xs text-[#111318] dark:text-white"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                'All',
                'Chest',
                'Back',
                'Shoulders',
                'Biceps',
                'Triceps',
                'Forearms',
                'Quadriceps',
                'Hamstrings',
                'Glutes',
                'Calves',
                'Abs',
              ].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setExerciseCatFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                    exerciseCatFilter === cat
                      ? 'bg-[#B7F34A] text-[#111318]'
                      : 'bg-[#F5F6F8] dark:bg-[#141519] text-[#52525B] dark:text-[#9496A1]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredCatalog.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] p-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-black text-[#111318] dark:text-white">{item.name}</strong>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#B7F34A]/15 text-[#6BA814] dark:text-[#B7F34A] font-bold">
                        {item.category}
                      </span>
                      <span className="text-[10px] text-[#9496A1]">{item.equipment}</span>
                    </div>
                    <p className="text-[11px] text-[#52525B] dark:text-[#9496A1] mt-0.5">
                      {item.target_muscle} • Recommended: {getRecommendedRepRange(item)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddExerciseFromCatalog(item)}
                    className="px-3 py-1.5 rounded-lg bg-[#B7F34A] text-[#111318] text-xs font-extrabold shrink-0"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CREATE CUSTOM EXERCISE MODAL */}
      {customExerciseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateCustomExercise}
            className="w-full max-w-md rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#111318] dark:text-white">Create Custom Exercise</h3>
              <button type="button" onClick={() => setCustomExerciseOpen(false)} className="text-[#9496A1]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1">
                Exercise Name
              </label>
              <input
                type="text"
                required
                value={newCustomEx.name}
                onChange={(e) => setNewCustomEx({ ...newCustomEx, name: e.target.value })}
                placeholder="e.g. Safety Bar Pause Squat"
                className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] p-2.5 text-xs text-[#111318] dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1">
                  Category
                </label>
                <select
                  value={newCustomEx.category}
                  onChange={(e) => setNewCustomEx({ ...newCustomEx, category: e.target.value })}
                  className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] p-2.5 text-xs text-[#111318] dark:text-white"
                >
                  {[
                    'Chest',
                    'Back',
                    'Shoulders',
                    'Biceps',
                    'Triceps',
                    'Forearms',
                    'Quadriceps',
                    'Hamstrings',
                    'Glutes',
                    'Calves',
                    'Abs',
                    'Full Body',
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1">
                  Equipment
                </label>
                <select
                  value={newCustomEx.equipment}
                  onChange={(e) => setNewCustomEx({ ...newCustomEx, equipment: e.target.value })}
                  className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] p-2.5 text-xs text-[#111318] dark:text-white"
                >
                  {['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Resistance Band'].map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#111318] dark:text-zinc-300 mb-1">
                Primary Muscle Target
              </label>
              <input
                type="text"
                value={newCustomEx.target_muscle}
                onChange={(e) => setNewCustomEx({ ...newCustomEx, target_muscle: e.target.value })}
                placeholder="e.g. Quadriceps & Glutes"
                className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] p-2.5 text-xs text-[#111318] dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#B7F34A] text-[#111318] text-xs font-extrabold"
            >
              Save & Add to Session
            </button>
          </form>
        </div>
      )}

      {/* EXERCISE HISTORY MODAL */}
      {historyModalExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#FFFFFF] dark:bg-[#1B1D22] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#111318] dark:text-white">
                History: {historyModalExercise}
              </h3>
              <button type="button" onClick={() => setHistoryModalExercise(null)} className="text-[#9496A1]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {workoutHistory
                .filter((w) =>
                  (Array.isArray(w.exercises) ? w.exercises : []).some(
                    (e: any) => String(e.exercise_name).toLowerCase() === historyModalExercise.toLowerCase()
                  )
                )
                .map((w) => {
                  const match = (w.exercises || []).find(
                    (e: any) => String(e.exercise_name).toLowerCase() === historyModalExercise.toLowerCase()
                  );
                  return (
                    <div
                      key={w.id}
                      className="rounded-xl border border-[#E1E4E8] dark:border-[#30333A] bg-[#F5F6F8] dark:bg-[#141519] p-3 text-xs"
                    >
                      <div className="flex justify-between font-bold text-[#111318] dark:text-white">
                        <span>{w.name}</span>
                        <span>{w.completed_at ? new Date(w.completed_at).toLocaleDateString() : ''}</span>
                      </div>
                      <div className="font-mono text-[#6BA814] dark:text-[#B7F34A] mt-1">
                        {(match?.sets || []).map((s: any) => `${s.weight_kg}kg × ${s.reps} (RPE ${s.rpe || 8})`).join(' • ')}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
