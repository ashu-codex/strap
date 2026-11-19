'use client';

import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  Search,
  Filter,
  Lock,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Layers,
  CheckCircle2,
  X,
} from 'lucide-react';
import PremiumModal from '@/components/PremiumModal';

export default function ExerciseLibraryPage() {
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [exercises, setExercises] = useState<any[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<any | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedEquipment, setSelectedEquipment] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Premium Modal
  const [modalOpen, setModalOpen] = useState(false);

  const categories = [
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
    'Full Body',
  ];

  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  const equipmentOptions = ['All', 'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight'];

  useEffect(() => {
    async function fetchExercises() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (selectedCategory !== 'All') query.set('category', selectedCategory);
        if (selectedDifficulty !== 'All') query.set('difficulty', selectedDifficulty);
        if (selectedEquipment !== 'All') query.set('equipment', selectedEquipment);
        if (searchQuery.trim()) query.set('search', searchQuery.trim());

        const res = await fetch(`/api/exercises?${query.toString()}`);
        const data = await res.json();

        if (data.locked) {
          setIsLocked(true);
          setPreview(data.preview || []);
        } else {
          setIsLocked(false);
          setExercises(data.exercises || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchExercises();
  }, [selectedCategory, selectedDifficulty, selectedEquipment, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand bg-brand/10 border border-brand/20 px-2.5 py-0.5 rounded-full">
              Biomechanical Movement Library
            </span>
            <span className="text-xs text-zinc-400 font-mono">12 Target Categories</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">STRAP Exercise Catalog</h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Every movement documented with primary & secondary muscular targets, execution cues, and progression alternatives.
          </p>
        </div>

        {isLocked && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand text-xs font-bold text-black hover:bg-brand-400 transition-colors shadow-glow shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            <span>Unlock Full Library (₹100)</span>
          </button>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exercises by name, muscle group, or equipment (e.g. Bench, Squat, Delts)..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-brand text-black font-bold shadow-glow'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Equipment & Difficulty Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-zinc-400">Equipment:</span>
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-white focus:border-brand focus:outline-none"
            >
              {equipmentOptions.map((eq) => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-zinc-400">Difficulty:</span>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-white focus:border-brand focus:outline-none"
            >
              {difficulties.map((diff) => (
                <option key={diff} value={diff}>{diff}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* LOCKED VIEW FOR FREE USERS */}
      {isLocked ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-brand/30 bg-card p-8 text-center shadow-glow">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/20 text-brand mx-auto mb-3 shadow-glow">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Full Exercise Catalog Locked</h2>
            <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1 mb-6 leading-relaxed">
              STRAP Premium members receive unrestricted access to all 25+ biomechanical movement guides, target muscle breakdowns, and form instructions.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand text-xs font-extrabold text-black hover:bg-brand-400 transition-all shadow-glow hover:scale-105"
            >
              <span>Unlock STRAP Premium (₹100)</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Teaser Previews */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-50">
            {preview.map((ex) => (
              <div key={ex.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold text-brand">{ex.category}</span>
                  <Lock className="h-3.5 w-3.5 text-zinc-500" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">{ex.name}</h3>
                <p className="text-xs text-zinc-400">Target: {ex.target_muscle}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* UNLOCKED PREMIUM EXERCISES GRID */
        <div>
          {loading ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            </div>
          ) : exercises.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-xs">
              No exercises match your filter criteria. Try clearing search or changing filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exercises.map((ex) => (
                <div
                  key={ex.id}
                  onClick={() => setSelectedExercise(ex)}
                  className="rounded-2xl border border-card-border bg-card p-5 hover:border-brand/50 transition-all cursor-pointer hover:-translate-y-0.5 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full">
                      {ex.category}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded">
                      {ex.equipment}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-brand transition-colors mb-1">
                    {ex.name}
                  </h3>
                  <p className="text-xs text-zinc-300 font-medium mb-3">
                    Target: <span className="text-zinc-100">{ex.target_muscle}</span>
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-3 border-t border-zinc-900">
                    <span>{ex.difficulty} • {ex.exercise_type}</span>
                    <span className="text-brand font-semibold flex items-center gap-1 group-hover:underline">
                      Form Guide →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detailed Exercise Modal */}
      {selectedExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-2xl border border-brand/30 bg-card p-6 shadow-glow-lg text-white max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedExercise(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand bg-brand/10 border border-brand/20 px-2.5 py-0.5 rounded-full">
                {selectedExercise.category}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2.5 py-0.5 rounded-full">
                {selectedExercise.equipment}
              </span>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-0.5 rounded-full">
                {selectedExercise.difficulty}
              </span>
            </div>

            <h2 className="text-2xl font-black text-white mb-2">{selectedExercise.name}</h2>
            <p className="text-xs text-zinc-300 font-semibold mb-4">
              Primary Target: <span className="text-brand">{selectedExercise.target_muscle}</span>
            </p>

            {selectedExercise.secondary_muscles?.length > 0 && (
              <div className="mb-4">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Secondary Muscle Synergy
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedExercise.secondary_muscles.map((sec: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
                      {sec}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Prescribed Dosage */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center mb-5">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase">Standard Sets</span>
                <strong className="block text-sm text-white">{selectedExercise.default_sets} Sets</strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase">Target Reps</span>
                <strong className="block text-sm text-white">{selectedExercise.default_reps} Reps</strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase">Rest Interval</span>
                <strong className="block text-sm text-brand">{selectedExercise.default_rest_sec} Sec</strong>
              </div>
            </div>

            {/* Step by step instructions */}
            <div className="space-y-2 mb-5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Biomechanical Form Instructions
              </span>
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed whitespace-pre-line font-sans">
                {selectedExercise.instructions}
              </div>
            </div>

            {/* Alternatives */}
            {selectedExercise.alternatives?.length > 0 && (
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Joint-Friendly / Equipment Alternatives
                </span>
                <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
                  {selectedExercise.alternatives.map((alt: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
                      {alt}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <PremiumModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        featureTitle="Unlock 12-Category Movement Library"
        featureDescription="Gain complete form breakdowns, muscle maps, and exercise cues across Chest, Back, Quads, Hamstrings, Shoulders, and more."
      />
    </div>
  );
}
