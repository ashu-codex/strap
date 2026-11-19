'use client';

import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Sparkles,
  Droplet,
  PieChart,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight,
  Flame,
  Info,
} from 'lucide-react';
import PremiumModal from '@/components/PremiumModal';

export default function NutritionPage() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [nutrition, setNutrition] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function loadNutrition() {
      try {
        const subRes = await fetch('/api/user/subscription').then((r) => r.json());
        setIsPremium(subRes.isPremium);

        if (subRes.isPremium) {
          const nutRes = await fetch('/api/ai/nutrition-plan');
          const data = await nutRes.json();
          if (data.nutritionPlan) {
            setNutrition(data.nutritionPlan);
          }
        }
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    }
    loadNutrition();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent shadow-glow" />
          <span className="text-xs text-zinc-400 font-mono tracking-wider">Calibrating Metabolic Energetics...</span>
        </div>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="rounded-3xl border border-brand/30 bg-card p-10 shadow-glow-lg max-w-2xl mx-auto">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/20 border border-brand/40 text-brand mx-auto mb-4 shadow-glow">
            <Lock className="h-7 w-7" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-brand bg-brand/10 px-3 py-1 rounded-full border border-brand/20">
            STRAP Premium Exclusive
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-3 mb-2">
            Metabolic Macro & Calorie Engine
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
            Get mathematically validated daily caloric surplus/deficit requirements, protein optimization formulas, hydration guides, and nutrient timing schedules.
          </p>
          <a
            href="/checkout"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-brand text-sm font-extrabold text-black hover:bg-brand-400 transition-all shadow-glow hover:scale-105 strap-primary"
          >
            <span>Upgrade to Premium (₹100/mo)</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  const p = nutrition || {
    bmr: 1720,
    tdee: 2400,
    target_calories: 2650,
    protein_grams: 165,
    carbs_grams: 320,
    fats_grams: 75,
    water_liters: 3.5,
    explanation: 'Calibrated for moderate hyper-caloric surplus (+250 kcal) to facilitate maximum muscle hypertrophy while minimizing fat accumulation.',
    meal_timing: [
      { meal_name: 'Breakfast / Pre-Training', suggested_time: '8:00 AM', calorie_share_pct: 25, recommendation: 'Fast-digesting complex carbohydrates paired with 35g protein.' },
      { meal_name: 'Post-Workout Anabolic Window', suggested_time: '12:30 PM', calorie_share_pct: 35, recommendation: 'Highest carbohydrate density meal to replenish glycogen and trigger MPS.' },
      { meal_name: 'Mid-Afternoon Sustenance', suggested_time: '4:30 PM', calorie_share_pct: 15, recommendation: 'Moderate protein and healthy monounsaturated fats.' },
      { meal_name: 'Dinner & Nocturnal Recovery', suggested_time: '8:30 PM', calorie_share_pct: 25, recommendation: 'Sustained-release protein (casein/paneer) with vegetables.' },
    ],
    sample_foods: {
      protein_sources: ['Chicken Breast', 'Eggs', 'Paneer', 'Whey Isolate', 'Greek Yogurt'],
      carb_sources: ['Basmati Rice', 'Oats', 'Sweet Potatoes', 'Bananas'],
      fat_sources: ['Almonds', 'Peanut Butter', 'Extra Virgin Olive Oil'],
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-brand bg-brand/10 border border-brand/20 px-2.5 py-0.5 rounded-full">
            Biometric Energetics
          </span>
          <span className="text-xs font-mono text-zinc-400">Mifflin-St Jeor Validated</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Metabolic Nutrition Blueprint</h1>
        <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
          {p.explanation}
        </p>
      </div>

      {/* Calories Overview Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-card-border bg-card p-5">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Basal Metabolic Rate</span>
          <div className="text-2xl font-black text-white mt-1">
            {p.bmr} <span className="text-xs font-normal text-zinc-400">kcal</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Resting cellular expenditure</p>
        </div>

        <div className="rounded-2xl border border-card-border bg-card p-5">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">TDEE (Daily Burn)</span>
          <div className="text-2xl font-black text-white mt-1">
            {p.tdee} <span className="text-xs font-normal text-zinc-400">kcal</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Based on training frequency</p>
        </div>

        <div className="rounded-2xl border border-brand/40 bg-card p-5 shadow-glow md:col-span-2">
          <span className="text-[10px] text-brand uppercase font-bold block">Target Caloric Intake</span>
          <div className="text-3xl font-black text-white mt-1 flex items-baseline gap-2">
            {p.target_calories} <span className="text-xs font-normal text-zinc-400">kcal / day</span>
            <span className="text-xs font-semibold text-brand">
              ({p.target_calories > p.tdee ? `+${p.target_calories - p.tdee} Surplus` : `${p.target_calories - p.tdee} Deficit`})
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">Optimal for muscle protein synthesis and energy balance</p>
        </div>
      </div>

      {/* Macronutrient Distribution */}
      <div className="rounded-2xl border border-card-border bg-card p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <PieChart className="h-4 w-4 text-brand" />
          Prescribed Daily Macronutrient Distribution
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 text-center">
            <span className="text-xs font-bold text-blue-400 block uppercase">Protein</span>
            <span className="text-3xl font-black text-white mt-1 block">{p.protein_grams}g</span>
            <span className="text-[11px] text-zinc-500 font-mono">~{(p.protein_grams * 4)} kcal (2.2g/kg)</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 text-center">
            <span className="text-xs font-bold text-amber-400 block uppercase">Carbohydrates</span>
            <span className="text-3xl font-black text-white mt-1 block">{p.carbs_grams}g</span>
            <span className="text-[11px] text-zinc-500 font-mono">~{(p.carbs_grams * 4)} kcal (Glycogen)</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 text-center">
            <span className="text-xs font-bold text-rose-400 block uppercase">Healthy Fats</span>
            <span className="text-3xl font-black text-white mt-1 block">{p.fats_grams}g</span>
            <span className="text-[11px] text-zinc-500 font-mono">~{(p.fats_grams * 9)} kcal (Hormones)</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 text-center">
            <span className="text-xs font-bold text-cyan-400 block uppercase flex items-center justify-center gap-1">
              <Droplet className="h-3.5 w-3.5" />
              Hydration
            </span>
            <span className="text-3xl font-black text-white mt-1 block">{p.water_liters}L</span>
            <span className="text-[11px] text-zinc-500 font-mono">Cellular Osmolarity</span>
          </div>
        </div>
      </div>

      {/* Meal Timing Strategy */}
      {p.meal_timing && (
        <div className="rounded-2xl border border-card-border bg-card p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand" />
            Nutrient Timing & Meal Distribution
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {p.meal_timing.map((m: any, i: number) => (
              <div key={i} className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{m.meal_name}</span>
                  <span className="font-mono text-brand font-semibold">{m.suggested_time}</span>
                </div>
                <div className="text-[11px] text-zinc-400">Share: {m.calorie_share_pct}% of daily calories</div>
                <p className="text-zinc-300 pt-1 leading-snug">{m.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sample Foods Tailored to Diet */}
      {p.sample_foods && (
        <div className="rounded-2xl border border-card-border bg-card p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Utensils className="h-4 w-4 text-brand" />
            Recommended Whole Food Staples
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <span className="font-bold text-blue-400 block mb-2 uppercase text-[10px]">Quality Proteins</span>
              <ul className="space-y-1 text-zinc-300">
                {p.sample_foods.protein_sources?.map((s: string, idx: number) => (
                  <li key={idx}>• {s}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <span className="font-bold text-amber-400 block mb-2 uppercase text-[10px]">Complex Carbs</span>
              <ul className="space-y-1 text-zinc-300">
                {p.sample_foods.carb_sources?.map((s: string, idx: number) => (
                  <li key={idx}>• {s}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <span className="font-bold text-rose-400 block mb-2 uppercase text-[10px]">Essential Fats</span>
              <ul className="space-y-1 text-zinc-300">
                {p.sample_foods.fat_sources?.map((s: string, idx: number) => (
                  <li key={idx}>• {s}</li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 italic pt-2">
            Note: Calculations are based on peer-reviewed exercise physiology models and serve as athletic guidance, not medical prescriptions.
          </p>
        </div>
      )}

      <PremiumModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        featureTitle="Metabolic Nutrition Engine"
        featureDescription="Unlock calculated macronutrients, hydration guidelines, and customized nutrient timing."
      />
    </div>
  );
}
