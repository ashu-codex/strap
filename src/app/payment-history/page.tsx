'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CreditCard, Clock, CheckCircle2, XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '@/components/Providers';

export default function PaymentHistoryPage() {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);

  const pendingIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const inFlightRef = useRef(false);
  const authIsPremiumRef = useRef(false);

  useEffect(() => {
    authIsPremiumRef.current = Boolean(auth?.isPremium);
  }, [auth?.isPremium]);

  const loadHistory = useCallback(async (manual = false) => {
    if (inFlightRef.current && !manual) return;
    inFlightRef.current = true;
    if (manual) setCheckingStatus(true);

    try {
      const res = await fetch('/api/payments/history', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const list: any[] = Array.isArray(data.payments) ? data.payments : [];
      setPayments(list);
      setLastCheckedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      const prevPending = pendingIdsRef.current;
      const newlyApproved = list.some(
        (p) => p.payment_status === 'approved' && prevPending.has(String(p.id))
      );
      const hasApprovedWhileNotPremium =
        !initializedRef.current &&
        !authIsPremiumRef.current &&
        list.some((p) => p.payment_status === 'approved');

      pendingIdsRef.current = new Set(
        list.filter((p) => p.payment_status === 'pending').map((p) => String(p.id))
      );
      initializedRef.current = true;

      // Dispatch auth refresh ONLY when a pending payment becomes approved (or once on mount if client state lags)
      if (newlyApproved || hasApprovedWhileNotPremium) {
        window.dispatchEvent(new Event('strap-auth-refresh'));
      }
    } catch {
      // keep existing payments visible on transient network error
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      if (manual) setCheckingStatus(false);
    }
  }, []);

  const hasPendingPayments = payments.some((p) => p.payment_status === 'pending');

  // Initial load once on mount
  useEffect(() => {
    loadHistory(false);
  }, [loadHistory]);

  // Poll ONLY while at least one payment is genuinely pending and the tab is visible
  useEffect(() => {
    if (!hasPendingPayments) return;

    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadHistory(false);
      }
    }, 15_000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadHistory(false);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [hasPendingPayments, loadHistory]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand bg-brand/10 border border-brand/20 px-2.5 py-0.5 rounded-full">
            Financial Ledger
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">Payment History</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            View transaction verification status, UTR numbers, and approval timestamps.
            {lastCheckedAt ? ` Last checked: ${lastCheckedAt}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => loadHistory(true)}
            disabled={checkingStatus}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900/80 text-xs font-bold text-zinc-200 hover:border-brand hover:text-white transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
            <span>{checkingStatus ? 'Checking...' : 'Check Status'}</span>
          </button>

          <a
            href="/checkout"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand text-xs font-bold text-black hover:bg-brand-400 transition-colors shadow-glow shrink-0 strap-primary"
          >
            <span>Submit New Payment</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      {hasPendingPayments && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              Pending payment detected. Status refreshes automatically every 15 seconds while this tab is open, or use <strong>Check Status</strong> anytime.
            </span>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="rounded-2xl border border-card-border bg-card p-12 text-center text-zinc-400 space-y-3">
          <CreditCard className="h-10 w-10 mx-auto text-zinc-600" />
          <h3 className="text-base font-bold text-white">No Payment Records Found</h3>
          <p className="text-xs max-w-sm mx-auto">
            You haven&apos;t submitted any UPI payment references yet.
          </p>
          <a
            href="/checkout"
            className="inline-block mt-2 px-5 py-2 rounded-xl bg-brand text-xs font-bold text-black strap-primary"
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
