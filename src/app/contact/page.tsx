'use client';

import React, { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2, MapPin } from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Payment Verification / Support');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 space-y-8">
      <div className="text-center max-w-xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-widest text-brand bg-brand/10 px-3 py-1 rounded-full border border-brand/20">
          Athlete Support
        </span>
        <h1 className="text-3xl font-black text-white mt-3">Contact STRAP Team</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Need assistance with UPI payment verification, split adjustments, or account help?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Info Column */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-card-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Mail className="h-4 w-4 text-brand" />
              <span>Direct Support</span>
            </h3>
            <a
              href="mailto:straptrainorg@gmail.com"
              className="inline-block text-xs font-medium text-zinc-300 hover:text-brand underline underline-offset-2 transition-colors"
            >
              straptrainorg@gmail.com
            </a>
          </div>

          <div className="rounded-2xl border border-card-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand" />
              <span>Location</span>
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              STRAP Technologies Inc.<br />
              Bangalore, Karnataka, India
            </p>
          </div>
        </div>

        {/* Form Column */}
        <div className="md:col-span-2 rounded-2xl border border-card-border bg-card p-6">
          {sent ? (
            <div className="text-center py-10 space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/20 text-brand mx-auto shadow-glow">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Message Dispatched</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Thank you for reaching out. A support engineer will review your inquiry and follow up within 2 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Mercer"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Your Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                >
                  <option value="Payment Verification / Support">Payment Verification / UTR Inquiry</option>
                  <option value="AI Recommendation Feedback">AI Recommendation Feedback</option>
                  <option value="Technical Issue">Technical / Bug Report</option>
                  <option value="General Inquiry">General Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Message</label>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your inquiry or include your payment reference..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-brand text-xs font-bold text-black hover:bg-brand-400 transition-colors shadow-glow strap-primary"
              >
                <Send className="h-4 w-4" />
                <span>Send Support Message</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
