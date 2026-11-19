'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  IndianRupee,
  Search,
  Check,
  X,
  Settings,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Save,
} from 'lucide-react';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [userSearch, setUserSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Settings form
  const [priceInput, setPriceInput] = useState(100);
  const [upiInput, setUpiInput] = useState('ashutosh-k82@ptyes');
  const [modelInput, setModelInput] = useState('gemini-1.5-flash');

  const loadAdminData = async () => {
    try {
      const [statsRes, paymentsRes, usersRes, settingsRes] = await Promise.all([
        fetch('/api/admin/stats').then((r) => r.json()),
        fetch('/api/admin/payments').then((r) => r.json()),
        fetch('/api/admin/users').then((r) => r.json()),
        fetch('/api/admin/settings').then((r) => r.json()),
      ]);

      if (statsRes.error) {
        setAuthorized(false);
      } else {
        setAuthorized(true);
        setCurrentAdmin(statsRes.currentAdmin || '');
        setStats(statsRes.stats);
        setPayments(paymentsRes.payments || []);
        setUsers(usersRes.users || []);
        if (settingsRes.settings) {
          setSettings(settingsRes.settings);
          setPriceInput(settingsRes.settings.price_inr || 100);
          setUpiInput(settingsRes.settings.upi_id || 'ashutosh-k82@ptyes');
          setModelInput(settingsRes.settings.default_model || 'gemini-1.5-flash');
        }
      }
      setLoading(false);
    } catch (err) {
      setAuthorized(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleReviewPayment = async (paymentId: string, action: 'approve' | 'reject') => {
    setActionLoading(paymentId);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/payments/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: paymentId,
          action,
          admin_notes: action === 'approve' ? 'Verified against bank credit ledger.' : 'Transaction reference not found in bank ledger.',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage(data.message);
      window.dispatchEvent(new Event('strap-auth-refresh'));
      await loadAdminData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_inr: priceInput,
          upi_id: upiInput,
          default_model: modelInput,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Platform settings updated successfully.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
          <span className="text-xs text-zinc-400 font-mono">Verifying Administrative Credentials...</span>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 mx-auto">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Access Denied (403)</h1>
        <p className="text-xs text-zinc-400 leading-relaxed">
          The STRAP administrative console is strictly restricted to the verified platform owner account.
        </p>
        <div className="pt-2">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-semibold text-white hover:bg-zinc-800"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.full_name.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <ShieldAlert className="h-3 w-3" />
              Administrative Root
            </span>
            <span className="text-xs font-mono text-zinc-400">{currentAdmin || 'Owner Admin'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">STRAP Operations Console</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            UPI transaction reconciliation, user subscription governance, and platform configuration.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-semibold text-zinc-200 hover:text-white shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {message && (
        <div className="rounded-xl border border-brand-DEFAULT/30 bg-brand-DEFAULT/10 p-3.5 text-xs text-brand-DEFAULT flex items-center gap-2">
          <Check className="h-4 w-4" />
          <span>{message}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-card-border bg-card p-5">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold">Total Users</span>
          <div className="text-3xl font-black text-white mt-1">{stats?.totalUsers || 0}</div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {stats?.premiumUsers || 0} Premium • {stats?.freeUsers || 0} Free
          </p>
        </div>

        <div className="rounded-2xl border border-card-border bg-card p-5">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold">Verified Revenue</span>
          <div className="text-3xl font-black text-brand-DEFAULT mt-1 flex items-baseline">
            ₹{stats?.totalRevenueINR || 0}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {stats?.approvedPaymentsCount || 0} Approved Transactions
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-card p-5 shadow-glow">
          <span className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending Verification
          </span>
          <div className="text-3xl font-black text-amber-400 mt-1">
            {stats?.pendingPaymentsCount || 0}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Awaiting bank reference approval
          </p>
        </div>

        <div className="rounded-2xl border border-card-border bg-card p-5">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold">AI Integration</span>
          <div className="text-lg font-bold text-white mt-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Gemini 1.5 Active</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-mono">
            Key: process.env.GEMINI_API_KEY
          </p>
        </div>
      </div>

      {/* PENDING UPI PAYMENTS TABLE (APPROVAL WORKFLOW) */}
      <div className="rounded-2xl border border-card-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              <span>Pending UPI Payments Verification</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Verify the UTR in your bank/UPI app before approving. Approving immediately extends user's access by 30 days.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] text-zinc-500 uppercase font-mono">
                <th className="py-2.5">Date</th>
                <th>User / Email</th>
                <th>Amount</th>
                <th>UTR Reference</th>
                <th>Destination UPI</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-zinc-300">
              {payments.filter((p) => p.payment_status === 'pending').length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-zinc-500 text-xs">
                    No pending UPI payments awaiting reconciliation. All clear!
                  </td>
                </tr>
              ) : (
                payments
                  .filter((p) => p.payment_status === 'pending')
                  .map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-950/40">
                      <td className="py-3 font-mono text-zinc-400">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="font-bold text-white">{p.user_name || 'Athlete'}</div>
                        <div className="text-[11px] text-zinc-400">{p.user_email || p.user_id}</div>
                      </td>
                      <td className="font-black text-brand-DEFAULT font-mono text-sm">
                        ₹{p.amount_inr}
                      </td>
                      <td className="font-mono text-white font-bold bg-zinc-900 px-2 py-1 rounded inline-block">
                        {p.utr_reference}
                      </td>
                      <td className="font-mono text-zinc-400 text-[11px]">{p.upi_id}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={actionLoading === p.id}
                            onClick={() => handleReviewPayment(p.id, 'approve')}
                            className="btn-primary flex items-center gap-1 px-3 py-1.5 text-[11px] disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Approve & Activate</span>
                          </button>
                          <button
                            disabled={actionLoading === p.id}
                            onClick={() => handleReviewPayment(p.id, 'reject')}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-950 text-red-300 border border-red-800 text-[11px] font-bold hover:bg-red-900/60 disabled:opacity-50"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* USER MANAGEMENT TABLE */}
      <div className="rounded-2xl border border-card-border bg-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-DEFAULT" />
              <span>Registered Athletes & Subscriptions</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">Search and inspect athlete membership tiers.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search user email or name..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pl-8 pr-3 text-xs text-white placeholder-zinc-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] text-zinc-500 uppercase font-mono">
                <th className="py-2.5">User</th>
                <th>Role</th>
                <th>Tier</th>
                <th>Expiration</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-zinc-300">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-950/40">
                  <td className="py-3">
                    <div className="font-bold text-white">{u.full_name}</div>
                    <div className="text-[11px] text-zinc-400">{u.email}</div>
                  </td>
                  <td>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${u.role === 'admin' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-zinc-800 text-zinc-300'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {u.subscriptionPlan === 'premium' ? (
                      <span className="text-[10px] font-bold text-brand-DEFAULT bg-brand-DEFAULT/10 border border-brand-DEFAULT/30 px-2 py-0.5 rounded-full">
                        PREMIUM
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                        FREE
                      </span>
                    )}
                  </td>
                  <td className="font-mono text-zinc-400">
                    {u.expiresAt ? new Date(u.expiresAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="font-mono text-zinc-500 text-[11px]">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PLATFORM SETTINGS */}
      <div className="rounded-2xl border border-card-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-brand-DEFAULT" />
          <span>Platform Pricing & Engine Settings</span>
        </h2>

        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
              Monthly Subscription Price (INR)
            </label>
            <input
              type="number"
              value={priceInput}
              onChange={(e) => setPriceInput(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
              Destination UPI ID
            </label>
            <input
              type="text"
              value={upiInput}
              onChange={(e) => setUpiInput(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
              Gemini AI Model
            </label>
            <select
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white"
            >
              <option value="gemini-1.5-flash">gemini-1.5-flash (Fast & Structured)</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro (High Reasoning)</option>
            </select>
          </div>

          <div className="sm:col-span-3 pt-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-DEFAULT text-xs font-bold text-black hover:bg-brand-400 transition-colors shadow-glow strap-primary"
            >
              <Save className="h-4 w-4" />
              <span>Update Platform Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
