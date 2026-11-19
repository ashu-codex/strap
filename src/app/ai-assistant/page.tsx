'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Lock,
  ArrowRight,
  User,
  HelpCircle,
  Dumbbell,
  HeartPulse,
  Flame,
} from 'lucide-react';
import PremiumModal from '@/components/PremiumModal';

interface Message {
  role: 'user' | 'model';
  parts: string;
}

export default function AiAssistantPage() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      parts: `**Greetings, Athlete!** I am your STRAP AI Coach powered by Google Gemini.\n\nI continuously monitor your training performance, progressive overload requirements, and autonomic recovery. What would you like to calibrate today?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/user/subscription')
      .then((r) => r.json())
      .then((data) => {
        setIsPremium(data.isPremium);
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
          history: newMessages.slice(-6),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to communicate with AI Coach');

      setMessages((prev) => [...prev, { role: 'model', parts: data.reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          parts: `**Notice:** ${err.message || 'Unable to connect with AI coach right now.'}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const quickPrompts = [
    'How should I warm up for heavy squats today?',
    'How do I calculate progressive overload for bench press?',
    'What are optimal post-workout meals for muscle gain?',
    'My lower back feels tight after deadlifts. Any mobility drills?',
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-DEFAULT border-t-transparent shadow-glow" />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="rounded-3xl border border-brand-DEFAULT/30 bg-card p-10 shadow-glow-lg max-w-2xl mx-auto">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-DEFAULT/20 border border-brand-DEFAULT/40 text-brand-DEFAULT mx-auto mb-4 shadow-glow">
            <Lock className="h-7 w-7" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-brand-DEFAULT bg-brand-DEFAULT/10 px-3 py-1 rounded-full border border-brand-DEFAULT/20">
            STRAP Premium Exclusive
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-3 mb-2">
            24/7 Gemini AI Fitness Coach
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
            Get personalized workout modifications, plateau-breaking strategies, exercise substitute recommendations, and biomechanics coaching.
          </p>
          <a
            href="/checkout"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-brand-DEFAULT text-sm font-extrabold text-black hover:bg-brand-400 transition-all shadow-glow hover:scale-105 strap-primary"
          >
            <span>Upgrade to Premium (₹100/mo)</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 flex flex-col h-[calc(100vh-8.5rem)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-DEFAULT/20 border border-brand-DEFAULT text-brand-DEFAULT shadow-glow">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-1.5">
              STRAP AI Fitness Coach
              <span className="text-[10px] font-bold text-brand-DEFAULT bg-brand-DEFAULT/10 px-2 py-0.5 rounded-full border border-brand-DEFAULT/30">
                Gemini 1.5
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400">Context-Aware Exercise Physiologist</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active & Synthesizing</span>
        </div>
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
                  isUser
                    ? 'bg-zinc-800 text-white'
                    : 'bg-brand-DEFAULT text-black shadow-glow'
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div
                className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-brand-DEFAULT/15 border border-brand-DEFAULT/30 text-white'
                    : 'bg-card border border-card-border text-zinc-200'
                }`}
              >
                <div className="whitespace-pre-line font-sans">{msg.parts}</div>
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-DEFAULT text-black shrink-0 shadow-glow">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl p-4 bg-card border border-card-border text-xs text-zinc-400 flex items-center gap-2">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-brand-DEFAULT border-t-transparent" />
              <span>Analyzing biomechanical patterns...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="shrink-0 mb-3 flex items-center gap-2 overflow-x-auto pb-1 text-[11px]">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-brand-DEFAULT/40 whitespace-nowrap transition-colors"
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
          placeholder="Ask STRAP Coach regarding splits, form, recovery, or macros..."
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 py-3.5 pl-4 pr-12 text-xs text-white placeholder-zinc-500 focus:border-brand-DEFAULT focus:outline-none focus:ring-1 focus:ring-brand-DEFAULT shadow-glow"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl bg-brand-DEFAULT flex items-center justify-center text-black hover:bg-brand-400 transition-colors shadow-glow disabled:opacity-40 strap-primary"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
