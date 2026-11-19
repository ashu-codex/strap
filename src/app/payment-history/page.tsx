'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Clock, CheckCircle2, XCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function PaymentHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);

  const loadHistory = () =>
    fetch('/api/payments/history', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setPayments(data.payments || []);
        setLoading(false);
        if ((data.payments || []).some((p: { payment_status: string }) => p.payment_status === 'approved')) {
          window.dispatchEvent(new Event('strap-auth-refresh'));
        }
      });

  useEffect(() => {
    loadHistory().catch(() => setLoading(false));
    const id = window.setInterval(() => {
      loadHistory().catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-DEFAULT border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-DEFAULT bg-brand-DEFAULT/10 border border-brand-DEFAULT/20 px-2.5 py-0.5 rounded-full">
            Financial Ledger
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">Payment History</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            View transaction verification status, UTR numbers, and approval timestamps.
          </p>
        </div>

        <a
          href="/checkout"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-DEFAULT text-xs font-bold text-black hover:bg-brand-400 transition-colors shadow-glow shrink-0 strap-primary"
        >
          <span>Submit New Payment</span>
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-2xl border border-card-border bg-card p-12 text-center text-zinc-400 space-y-3">
          <CreditCard className="h-10 w-10 mx-auto text-zinc-600" />
          <h3 className="text-base font-bold text-white">No Payment Records Found</h3>
          <p className="text-xs max-w-sm mx-auto">
            You haven't submitted any UPI payment references yet.
          </p>
          <a
            href="/checkout"
            className="inline-block mt-2 px-5 py-2 rounded-xl bg-brand-DEFAULT text-xs font-bold text-black strap-primary"
          >
            Upgrade to Premium (₹100)
          </a>
        </div>
      ) : (
        <div className="rounded-2xl border border-card-border bg-card p-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] text-zinc-500 uppercase font-mono">
                  <th className="py-3">Date</th>
                  <th>Amount</th>
                  <th>UTR / Reference</th>
                  <th>Status</th>
                  <th>Admin Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {payments.map((p) => {
                  const isApproved = p.payment_status === 'approved';
                  const isPending = p.payment_status === 'pending';
                  const isRejected = p.payment_status === 'rejected';

                  return (
                    <tr key={p.id} className="hover:bg-zinc-950/40">
                      <td className="py-3.5 font-mono text-zinc-400">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="font-bold text-white">
                        ₹{p.amount_inr} {p.currency}
                      </td>
                      <td className="font-mono text-zinc-300 font-semibold">
                        {p.utr_reference || 'N/A'}
                      </td>
                      <td>
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" />
                            Approved
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
                            <Clock className="h-3 w-3" />
                            Pending Verification
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/40 border border-rose-500/30 px-2 py-0.5 rounded-full">
                            <XCircle className="h-3 w-3" />
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="text-zinc-400 max-w-xs truncate">
                        {p.admin_notes || (isPending ? 'Queued for reconciliation' : 'None')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
