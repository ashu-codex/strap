'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  User,
  Dumbbell,
  Utensils,
  Flame,
  Trophy,
} from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  parts: string;
}

export default function AiAssistantPage() {
  const [loading, setLoading] = useState(true);
  const [athleteSummary, setAthleteSummary] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      parts: `**Greetings, Athlete!** I am your **STRAP Coach**.\n\nI continuously monitor your training style, logged workouts, personal records, and daily nutrition diary. Ask me anything about your Bench Press, Squat, Deadlift, protein & calorie targets, exercise selection, or next training week!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/ai/chat')
      .then((r) => r.json())
      .then((data) => {
        if (data.athleteSummary) {
          setAthleteSummary(data.athleteSummary);
        }
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages([
            {
              role: 'model',
              parts: `**Welcome back, ${data.athleteSummary?.name || 'Athlete'}!** I am your **STRAP Coach**.\n\nYour profile is synced with your **${
                data.athleteSummary?.trainingStyle === 'powerlifting'
                  ? 'Powerlifting'
                  : 'Muscle Building'
              }** tracker and daily nutrition targets (**${data.athleteSummary?.targetCalories || 2300} kcal** • **${
                data.athleteSummary?.targetProteinG || 150
              }g protein**). What would you like to analyze today?`,
            },
            ...data.messages,
          ]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || sending) return;

    const newMessages: Message[] = [...messages, { role: 'user', parts: textToSend }];
    setMessages(newMessages);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to communicate with STRAP Coach');

      setMessages((prev) => [...prev, { role: 'model', parts: data.reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          parts: `**Notice:** ${err.message || 'Unable to connect with STRAP Coach right now.'}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const quickPrompts = [
    'How should I increase my bench press?',
    'Am I eating enough protein?',
    'Why is my squat not progressing?',
    'Suggest exercises for rear delts.',
    'Create my next training week.',
    'Analyze my logged nutrition today.',
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent shadow-glow" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 flex flex-col h-[calc(100vh-7.5rem)]">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E1E4E8] dark:border-zinc-800 pb-4 mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/20 border border-brand text-brand shadow-glow">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#111318] dark:text-white flex items-center gap-2">
              <span>STRAP Coach</span>
              <span className="text-[10px] font-bold text-brand bg-brand/10 px-2.5 py-0.5 rounded-full border border-brand/30">
                Personalized Intelligence
              </span>
            </h1>
            <p className="text-[11px] text-[#5A6069] dark:text-zinc-400">
              Context-Aware Strength, Hypertrophy &amp; Nutrition Physiologist
            </p>
          </div>
        </div>

        {/* Athlete Telemetry Pills */}
        {athleteSummary && (
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#F3F4F6] dark:bg-zinc-900 border border-[#E1E4E8] dark:border-zinc-800 px-2.5 py-1 font-semibold">
              <Dumbbell className="h-3 w-3 text-brand" />
              {athleteSummary.trainingStyle === 'powerlifting' ? 'Powerlifting' : 'Muscle Building'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#F3F4F6] dark:bg-zinc-900 border border-[#E1E4E8] dark:border-zinc-800 px-2.5 py-1 font-semibold">
              <Flame className="h-3 w-3 text-amber-400" />
              Today: {Math.round(athleteSummary.todayCalories || 0)} / {athleteSummary.targetCalories} kcal
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#F3F4F6] dark:bg-zinc-900 border border-[#E1E4E8] dark:border-zinc-800 px-2.5 py-1 font-semibold">
              <Utensils className="h-3 w-3 text-rose-400" />
              Protein: {athleteSummary.todayProteinG || 0}g / {athleteSummary.targetProteinG}g
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#F3F4F6] dark:bg-zinc-900 border border-[#E1E4E8] dark:border-zinc-800 px-2.5 py-1 font-semibold">
              <Trophy className="h-3 w-3 text-emerald-400" />
              {athleteSummary.prsLogged || 0} PRs
            </span>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={i}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 text-xs font-bold ${
                  isUser ? 'bg-zinc-800 text-white' : 'bg-brand text-black shadow-glow'
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-brand/15 border border-brand/30 text-[#111318] dark:text-white'
                    : 'bg-white dark:bg-card border border-[#E1E4E8] dark:border-card-border text-[#111318] dark:text-zinc-200 shadow-sm'
                }`}
              >
                <div className="whitespace-pre-line font-sans">{msg.parts}</div>
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-black shrink-0 shadow-glow">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl p-4 bg-white dark:bg-card border border-[#E1E4E8] dark:border-card-border text-xs text-[#5A6069] dark:text-zinc-400 flex items-center gap-2">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              <span>Analyzing your biometrics, lifts &amp; nutrition logs...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="shrink-0 mb-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(prompt)}
            className="px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-[#E1E4E8] dark:border-zinc-800 text-[#5A6069] dark:text-zinc-300 hover:text-[#111318] dark:hover:text-white hover:border-brand/50 whitespace-nowrap transition-colors font-medium"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="shrink-0 relative"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask STRAP Coach about bench press, squat, deadlift, protein, today's logged nutrition, or next training week..."
          className="w-full rounded-2xl border border-[#E1E4E8] dark:border-zinc-800 bg-white dark:bg-zinc-950 py-3.5 pl-4 pr-12 text-xs sm:text-sm text-[#111318] dark:text-white placeholder-zinc-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand shadow-sm"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl bg-brand flex items-center justify-center text-black hover:bg-brand-400 transition-colors shadow-glow disabled:opacity-40 strap-primary"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
