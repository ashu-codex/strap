'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Users,
  CreditCard,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  RefreshCw,
  Search,
  Lock,
  Sparkles,
  Database,
  Activity,
  Dumbbell,
  Utensils,
  Pill,
  Cpu,
  Plus,
  Trash2,
  Eye,
  LayoutDashboard,
  FileText,
  X,
} from 'lucide-react';

type AdminTab = 'overview' | 'users' | 'payments' | 'content' | 'ai' | 'system';

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [currentAdminEmail, setCurrentAdminEmail] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Data States
  const [stats, setStats] = useState<any>(null);
  const [aiStats, setAiStats] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [contentData, setContentData] = useState<{
    exercises: any[];
    foods: any[];
    supplements: any[];
    brands: string[];
    categories: string[];
  }>({ exercises: [], foods: [], supplements: [], brands: [], categories: [] });

  // Filters & Selections
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [contentSubTab, setContentSubTab] = useState<'exercises' | 'foods' | 'supplements' | 'brands'>('exercises');
  const [contentSearch, setContentSearch] = useState('');

  // Content Creation Form
  const [newContentForm, setNewContentForm] = useState({
    name: '',
    brand: 'Verified Catalog',
    category: 'Chest',
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    calories: '120',
    protein_g: '24',
    carbs_g: '3',
    fat_g: '1.5',
    serving_label: '1 Serving (100g)',
    serving_grams: '100',
  });

  // Settings Form
  const [upiInput, setUpiInput] = useState('ashutosh-k82@ptyes');
  const [priceInput, setPriceInput] = useState(100);
  const [modelInput, setModelInput] = useState('gemini-3.8-flash');
  const [supportEmailInput, setSupportEmailInput] = useState('straptrainorg@gmail.com');
  const [savingSettings, setSavingSettings] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const loadAllAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const statsRes = await fetch('/api/admin/stats');
      if (statsRes.status === 401 || statsRes.status === 403) {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      const statsJson = await statsRes.json();
      setAuthorized(true);
      setStats(statsJson.stats);
      setAiStats(statsJson.aiStats);
      setSystemHealth(statsJson.systemHealth);
      setCurrentAdminEmail(statsJson.currentAdmin || '');

      const [usersRes, paymentsRes, settingsRes, contentRes] = await Promise.all([
        fetch('/api/admin/users').then((r) => r.json()).catch(() => ({ users: [] })),
        fetch('/api/admin/payments').then((r) => r.json()).catch(() => ({ payments: [] })),
        fetch('/api/admin/settings').then((r) => r.json()).catch(() => ({})),
        fetch('/api/admin/content').then((r) => r.json()).catch(() => ({})),
      ]);

      if (Array.isArray(usersRes.users)) setUsers(usersRes.users);
      if (Array.isArray(paymentsRes.payments)) setPayments(paymentsRes.payments);
      if (settingsRes.settings) {
        setUpiInput(settingsRes.settings.upi_id || 'ashutosh-k82@ptyes');
        setPriceInput(settingsRes.settings.monthly_price_inr || 100);
        setModelInput(settingsRes.settings.default_model || 'gemini-3.8-flash');
        setSupportEmailInput(settingsRes.settings.support_email || 'straptrainorg@gmail.com');
      }
      if (contentRes.exercises) {
        setContentData({
          exercises: contentRes.exercises || [],
          foods: contentRes.foods || [],
          supplements: contentRes.supplements || [],
          brands: contentRes.brands || [],
          categories: contentRes.categories || [],
        });
      }
    } catch (e) {
      console.error('Admin load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllAdminData();
  }, [loadAllAdminData]);

  const notify = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handlePaymentDecision = async (paymentId: string, decision: 'approved' | 'rejected') => {
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          status: decision,
          notes:
            decision === 'approved'
              ? 'Verified via STRAP Admin Console'
              : 'UTR verification declined by Admin',
        }),
      });
      if (res.ok) {
        notify(`Payment ${decision === 'approved' ? 'Approved & Premium Activated' : 'Rejected'}`);
        loadAllAdminData();
      }
    } catch {
      notify('Failed to update payment');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upi_id: upiInput,
          monthly_price_inr: Number(priceInput),
          default_model: modelInput,
          support_email: supportEmailInput,
        }),
      });
      if (res.ok) {
        notify('System & AI configuration saved successfully');
      }
    } catch {
      notify('Error saving settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddContent = async (e: React.FormEvent) => {
    e.preventDefault();
    const type =
      contentSubTab === 'exercises'
        ? 'exercise'
        : contentSubTab === 'supplements'
        ? 'supplement'
        : 'food';
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          ...newContentForm,
        }),
      });
      if (res.ok) {
        notify(`Added new ${type}: ${newContentForm.name}`);
        setNewContentForm({ ...newContentForm, name: '' });
        loadAllAdminData();
      }
    } catch {
      notify('Error adding content item');
    }
  };

  const handleDeleteContent = async (id: string, name: string) => {
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'delete', id, name }),
      });
      if (res.ok) {
        notify(`Removed "${name}" from catalog`);
        loadAllAdminData();
      }
    } catch {
      notify('Error deleting content item');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <span className="text-xs font-mono text-zinc-400">
            Initializing STRAP Administration System...
          </span>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="rounded-3xl border border-red-500/30 bg-white dark:bg-[#1B1D22] p-10 shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-400 border border-red-500/30">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black text-[#111318] dark:text-white">
            Restricted Administrator Console
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#5A6069] dark:text-zinc-400 leading-relaxed">
            Access to the STRAP Administration &amp; Operations System is strictly restricted to verified
            platform administrators.
          </p>
          <a
            href="/dashboard"
            className="mt-6 inline-block rounded-xl bg-brand px-6 py-2.5 text-xs font-bold text-black"
          >
            Return to Athlete Dashboard
          </a>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.subscriptionPlan?.toLowerCase().includes(q) ||
      u.training_style?.toLowerCase().includes(q)
    );
  });

  const filteredPayments = payments.filter((p) =>
    paymentFilter === 'all' ? true : p.payment_status === paymentFilter
  );

  const navTabs: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Dashboard Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'users', label: 'User Management', icon: <Users className="h-4 w-4" />, badge: stats?.totalUsers },
    {
      id: 'payments',
      label: 'Payment Management',
      icon: <CreditCard className="h-4 w-4" />,
      badge: stats?.pendingPaymentsCount,
    },
    { id: 'content', label: 'Content Management', icon: <Database className="h-4 w-4" /> },
    { id: 'ai', label: 'AI Management', icon: <Cpu className="h-4 w-4" /> },
    { id: 'system', label: 'System Management', icon: <Activity className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#0D0F12] text-[#111318] dark:text-[#F3F4F6]">
      {/* Top Operations Header Bar */}
      <div className="border-b border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] px-4 sm:px-8 py-4">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 border border-brand/40 text-brand">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight">
                  STRAP Administration Console
                </h1>
                <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                  Owner Verified
                </span>
              </div>
              <p className="text-xs text-[#5A6069] dark:text-zinc-400">
                Operator: <span className="font-mono font-semibold">{currentAdminEmail}</span> • Platform
                Operations, Content, Payments &amp; Telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {actionMessage && (
              <span className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                {actionMessage}
              </span>
            )}
            <button
              type="button"
              onClick={loadAllAdminData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1E4E8] dark:border-[#2E323D] bg-[#F8F9FA] dark:bg-[#1C2026] px-3.5 py-2 text-xs font-bold hover:border-brand transition"
            >
              <RefreshCw className="h-3.5 w-3.5 text-brand" />
              <span>Sync Telemetry</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout: Sidebar Navigation + Operations Workspace */}
      <div className="mx-auto max-w-7xl px-4 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar Navigation (3 Cols) */}
        <aside className="lg:col-span-3 space-y-2">
          <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#5A6069] dark:text-zinc-500">
              Administration Modules
            </div>
            {navTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                  activeTab === t.id
                    ? 'bg-brand text-black shadow-sm'
                    : 'text-[#5A6069] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {t.icon}
                  <span>{t.label}</span>
                </span>
                {typeof t.badge === 'number' && t.badge > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      activeTab === t.id
                        ? 'bg-black/20 text-black'
                        : 'bg-brand/15 text-brand'
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* System Status Mini Card */}
          <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold">
              <span>Platform Health</span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Online
              </span>
            </div>
            <div className="text-[11px] text-[#5A6069] dark:text-zinc-400 space-y-1">
              <div className="flex justify-between">
                <span>Database:</span>
                <strong className="text-[#111318] dark:text-white">
                  {systemHealth?.databaseStatus || 'Operational'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Exercises Catalog:</span>
                <strong>{contentData.exercises.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Foods &amp; Supplements:</span>
                <strong>{contentData.foods.length + contentData.supplements.length}</strong>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Operations Content Area (9 Cols) */}
        <main className="lg:col-span-9 space-y-6">
          {/* 1. DASHBOARD OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 9 Key Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-5">
                  <div className="flex items-center justify-between text-xs text-[#5A6069] dark:text-zinc-400">
                    <span>Total Registered Users</span>
                    <Users className="h-4 w-4 text-brand" />
                  </div>
                  <div className="mt-2 text-3xl font-black">{stats?.totalUsers || 0}</div>
                  <div className="mt-1 text-[11px] text-emerald-400">
                    +{stats?.newRegistrations7d || 0} new this week • {stats?.activeUsers || 0} active
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-5">
                  <div className="flex items-center justify-between text-xs text-[#5A6069] dark:text-zinc-400">
                    <span>Subscription Breakdown</span>
                    <Sparkles className="h-4 w-4 text-brand" />
                  </div>
                  <div className="mt-2 text-3xl font-black text-brand">
                    {stats?.premiumUsers || 0}{' '}
                    <span className="text-sm font-semibold text-[#5A6069] dark:text-zinc-400">
                      Premium
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-[#5A6069] dark:text-zinc-400">
                    {stats?.freeUsers || 0} Free tier users
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-5">
                  <div className="flex items-center justify-between text-xs text-[#5A6069] dark:text-zinc-400">
                    <span>Verified Revenue Summary</span>
                    <IndianRupee className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-2 text-3xl font-black text-emerald-400">
                    ₹{stats?.totalRevenueINR || 0}
                  </div>
                  <div className="mt-1 text-[11px] text-[#5A6069] dark:text-zinc-400">
                    {stats?.approvedPaymentsCount || 0} approved transactions
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-5">
                  <div className="flex items-center justify-between text-xs text-[#5A6069] dark:text-zinc-400">
                    <span>Pending Payment Requests</span>
                    <Clock className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="mt-2 text-3xl font-black text-amber-400">
                    {stats?.pendingPaymentsCount || 0}
                  </div>
                  <div className="mt-1 text-[11px] text-[#5A6069] dark:text-zinc-400">
                    Awaiting UTR reconciliation
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-5">
                  <div className="flex items-center justify-between text-xs text-[#5A6069] dark:text-zinc-400">
                    <span>Approved / Rejected Payments</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-2 text-2xl font-black">
                    <span className="text-emerald-400">{stats?.approvedPaymentsCount || 0}</span>
                    <span className="mx-2 text-zinc-500">/</span>
                    <span className="text-red-400">{stats?.rejectedPaymentsCount || 0}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-[#5A6069] dark:text-zinc-400">
                    Approved vs Rejected ledger count
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-5">
                  <div className="flex items-center justify-between text-xs text-[#5A6069] dark:text-zinc-400">
                    <span>AI Engine Requests</span>
                    <Cpu className="h-4 w-4 text-brand" />
                  </div>
                  <div className="mt-2 text-3xl font-black">{aiStats?.totalRequests || 0}</div>
                  <div className="mt-1 text-[11px] text-[#5A6069] dark:text-zinc-400">
                    {aiStats?.last24hRequests || 0} requests in last 24h
                  </div>
                </div>
              </div>

              {/* Pending Payments Quick Queue */}
              <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold">Pending Payment Approvals</h2>
                    <p className="text-xs text-[#5A6069] dark:text-zinc-400">
                      Verify submitted 12-digit UPI UTR codes to activate STRAP Premium
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('payments')}
                    className="text-xs font-bold text-brand hover:underline"
                  >
                    View All Transactions →
                  </button>
                </div>

                {payments.filter((p) => p.payment_status === 'pending').length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#E1E4E8] dark:border-[#2A2D35] p-6 text-center text-xs text-[#5A6069] dark:text-zinc-400">
                    All UPI payment requests have been reconciled. Zero pending requests in queue.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {payments
                      .filter((p) => p.payment_status === 'pending')
                      .map((p) => (
                        <div
                          key={p.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
                        >
                          <div>
                            <div className="font-bold text-sm">
                              {p.user_full_name || p.payer_name || 'Athlete'} ({p.user_email})
                            </div>
                            <div className="text-xs text-[#5A6069] dark:text-zinc-400 font-mono">
                              UTR: <strong className="text-amber-400">{p.utr_reference}</strong> • Amount: ₹
                              {p.amount_inr} • {new Date(p.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handlePaymentDecision(p.id, 'approved')}
                              className="rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-black hover:bg-emerald-400"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePaymentDecision(p.id, 'rejected')}
                              className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. USER MANAGEMENT TAB */}
          {activeTab === 'users' && (
            <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">User Directory &amp; Activity Telemetry</h2>
                  <p className="text-xs text-[#5A6069] dark:text-zinc-400">
                    Search accounts, inspect biometrics, verify auth method, and monitor workout/nutrition activity
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search email, name, tier, mode..."
                    className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#2E323D] bg-[#F8F9FA] dark:bg-[#0D0F12] pl-9 pr-3 py-2 text-xs focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E1E4E8] dark:border-[#242730] text-[#5A6069] dark:text-zinc-400 uppercase text-[10px]">
                      <th className="py-3 px-3">User / Email</th>
                      <th className="py-3 px-3">Account Type</th>
                      <th className="py-3 px-3">Training Mode</th>
                      <th className="py-3 px-3">Tier &amp; Status</th>
                      <th className="py-3 px-3">Activity</th>
                      <th className="py-3 px-3">Registered</th>
                      <th className="py-3 px-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E4E8] dark:divide-[#242730]">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                        <td className="py-3 px-3">
                          <div className="font-bold">{u.full_name}</div>
                          <div className="text-[#5A6069] dark:text-zinc-400 font-mono text-[11px]">
                            {u.email}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`rounded-md px-2.5 py-0.5 text-[10px] font-bold ${
                              u.auth_origin === 'google'
                                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                : 'bg-[#F3F4F6] dark:bg-[#222630] text-[#111318] dark:text-zinc-200 border border-[#E1E4E8] dark:border-[#2E323D]'
                            }`}
                          >
                            {u.auth_origin === 'google' ? 'Google' : 'Email'}
                          </span>
                          {u.google_linked && u.auth_origin !== 'google' && (
                            <span className="ml-1 rounded-md bg-sky-500/15 text-sky-400 px-1.5 py-0.5 text-[10px] font-semibold">
                              + Google
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 capitalize">
                          {String(u.training_style || 'muscle_building').replace('_', ' ')}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              u.subscriptionPlan === 'premium'
                                ? 'bg-brand/20 text-brand border border-brand/30'
                                : 'bg-zinc-500/15 text-zinc-400'
                            }`}
                          >
                            {u.subscriptionPlan}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[11px]">
                          <strong>{u.workouts_logged || 0}</strong> workouts •{' '}
                          <strong>{u.nutrition_entries_logged || 0}</strong> foods
                        </td>
                        <td className="py-3 px-3 text-[11px] text-[#5A6069] dark:text-zinc-400">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedUser(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E1E4E8] dark:border-[#2E323D] px-2.5 py-1 text-[11px] font-semibold hover:border-brand"
                          >
                            <Eye className="h-3 w-3 text-brand" /> Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. PAYMENT MANAGEMENT TAB */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {/* Filter Bar */}
              <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold">UPI Payment Verification &amp; Ledger</h2>
                    <p className="text-xs text-[#5A6069] dark:text-zinc-400">
                      Configured Receiver UPI ID: <strong className="text-brand font-mono">{upiInput}</strong> •
                      Plan Price: <strong>₹{priceInput}/mo</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setPaymentFilter(st)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition ${
                          paymentFilter === st
                            ? 'bg-brand text-black'
                            : 'bg-[#F3F4F6] dark:bg-[#222630] text-[#5A6069] dark:text-zinc-400'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredPayments.length === 0 ? (
                  <div className="py-10 text-center text-xs text-[#5A6069] dark:text-zinc-400">
                    No payment records match the selected filter ({paymentFilter}).
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E1E4E8] dark:border-[#242730] text-[#5A6069] dark:text-zinc-400 uppercase text-[10px]">
                          <th className="py-3 px-3">Athlete</th>
                          <th className="py-3 px-3">UTR Reference</th>
                          <th className="py-3 px-3">Amount</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3">Submitted</th>
                          <th className="py-3 px-3 text-right">Verification Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E1E4E8] dark:divide-[#242730]">
                        {filteredPayments.map((p) => (
                          <tr key={p.id}>
                            <td className="py-3 px-3">
                              <div className="font-bold">{p.user_full_name || p.payer_name || 'Athlete'}</div>
                              <div className="text-[11px] text-[#5A6069] dark:text-zinc-400 font-mono">
                                {p.user_email}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-brand">{p.utr_reference}</td>
                            <td className="py-3 px-3 font-bold">₹{p.amount_inr}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                  p.payment_status === 'approved'
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : p.payment_status === 'rejected'
                                    ? 'bg-red-500/15 text-red-400'
                                    : 'bg-amber-500/15 text-amber-400'
                                }`}
                              >
                                {p.payment_status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-[11px] text-[#5A6069] dark:text-zinc-400">
                              {new Date(p.created_at).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {p.payment_status === 'pending' ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handlePaymentDecision(p.id, 'approved')}
                                    className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-black"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePaymentDecision(p.id, 'rejected')}
                                    className="rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-400"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-[#5A6069] dark:text-zinc-500">
                                  Verified
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. CONTENT MANAGEMENT TAB */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold">Platform Content &amp; Catalog Management</h2>
                    <p className="text-xs text-[#5A6069] dark:text-zinc-400">
                      Manage the Exercise Library ({contentData.exercises.length}), Food Database (
                      {contentData.foods.length}), Supplements ({contentData.supplements.length}), and Brands (
                      {contentData.brands.length})
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setContentSubTab('exercises')}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ${
                        contentSubTab === 'exercises'
                          ? 'bg-brand text-black'
                          : 'bg-[#F3F4F6] dark:bg-[#222630] text-[#5A6069] dark:text-zinc-300'
                      }`}
                    >
                      <Dumbbell className="h-3.5 w-3.5" /> Exercises ({contentData.exercises.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentSubTab('foods')}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ${
                        contentSubTab === 'foods'
                          ? 'bg-brand text-black'
                          : 'bg-[#F3F4F6] dark:bg-[#222630] text-[#5A6069] dark:text-zinc-300'
                      }`}
                    >
                      <Utensils className="h-3.5 w-3.5" /> Foods ({contentData.foods.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentSubTab('supplements')}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ${
                        contentSubTab === 'supplements'
                          ? 'bg-brand text-black'
                          : 'bg-[#F3F4F6] dark:bg-[#222630] text-[#5A6069] dark:text-zinc-300'
                      }`}
                    >
                      <Pill className="h-3.5 w-3.5" /> Supplements ({contentData.supplements.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentSubTab('brands')}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ${
                        contentSubTab === 'brands'
                          ? 'bg-brand text-black'
                          : 'bg-[#F3F4F6] dark:bg-[#222630] text-[#5A6069] dark:text-zinc-300'
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" /> Brands &amp; Categories
                    </button>
                  </div>
                </div>

                {/* Add New Catalog Item Form */}
                {contentSubTab !== 'brands' && (
                  <form
                    onSubmit={handleAddContent}
                    className="rounded-xl border border-[#E1E4E8] dark:border-[#2A2D35] bg-[#F8F9FA] dark:bg-[#0D0F12] p-4 space-y-3"
                  >
                    <div className="text-xs font-bold text-brand uppercase">
                      + Add New{' '}
                      {contentSubTab === 'exercises'
                        ? 'Exercise to Library'
                        : contentSubTab === 'supplements'
                        ? 'Supplement to Database'
                        : 'Food to Database'}
                    </div>
                    {contentSubTab === 'exercises' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <input
                          type="text"
                          required
                          value={newContentForm.name}
                          onChange={(e) => setNewContentForm({ ...newContentForm, name: e.target.value })}
                          placeholder="Exercise Name (e.g. Larsen Bench Press)"
                          className="rounded-xl border border-[#E1E4E8] dark:border-[#2E323D] bg-white dark:bg-[#14171C] px-3 py-2 text-xs"
                        />
                        <input
                          type="text"
                          value={newContentForm.category}
                          onChange={(e) =>
                            setNewContentForm({ ...newContentForm, category: e.target.value })
                          }
                          placeholder="Category (Chest, Back, Quads...)"
                          className="rounded-xl border border-[#E1E4E8] dark:border-[#2E323D] bg-white dark:bg-[#14171C] px-3 py-2 text-xs"
                        />
                        <input
                          type="text"
                          value={newContentForm.equipment}
                          onChange={(e) =>
                            setNewContentForm({ ...newContentForm, equipment: e.target.value })
                          }
                          placeholder="Equipment (Barbell, Cable...)"
                          className="rounded-xl border border-[#E1E4E8] dark:border-[#2E323D] bg-white dark:bg-[#14171C] px-3 py-2 text-xs"
                        />
                        <button
                          type="submit"
                          className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-black"
                        >
                          Add Exercise
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                        <input
                          type="text"
                          required
                          value={newContentForm.name}
                          onChange={(e) => setNewContentForm({ ...newContentForm, name: e.target.value })}
                          placeholder="Item Name"
                          className="col-span-2 rounded-xl border border-[#E1E4E8] dark:border-[#2E323D] bg-white dark:bg-[#14171C] px-3 py-2 text-xs"
                        />
                        <input
                          type="text"
                          value={newContentForm.brand}
                          onChange={(e) => setNewContentForm({ ...newContentForm, brand: e.target.value })}
                          placeholder="Brand"
                          className="rounded-xl border border-[#E1E4E8] dark:border-[#2E323D] bg-white dark:bg-[#14171C] px-3 py-2 text-xs"
                        />
                        <input
                          type="number"
                          value={newContentForm.calories}
                          onChange={(e) =>
                            setNewContentForm({ ...newContentForm, calories: e.target.value })
                          }
                          placeholder="Calories"
                          className="rounded-xl border border-[#E1E4E8] dark:border-[#2E323D] bg-white dark:bg-[#14171C] px-3 py-2 text-xs"
                        />
                        <input
                          type="number"
                          value={newContentForm.protein_g}
                          onChange={(e) =>
                            setNewContentForm({ ...newContentForm, protein_g: e.target.value })
                          }
                          placeholder="Protein (g)"
                          className="rounded-xl border border-[#E1E4E8] dark:border-[#2E323D] bg-white dark:bg-[#14171C] px-3 py-2 text-xs"
                        />
                        <button
                          type="submit"
                          className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-black"
                        >
                          Add Item
                        </button>
                      </div>
                    )}
                  </form>
                )}

                {/* Search filter for catalog */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={contentSearch}
                    onChange={(e) => setContentSearch(e.target.value)}
                    placeholder="Filter catalog items by name, category, or brand..."
                    className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#2E323D] bg-[#F8F9FA] dark:bg-[#0D0F12] pl-9 pr-4 py-2 text-xs focus:border-brand focus:outline-none"
                  />
                </div>

                {/* Catalog List */}
                <div className="max-h-96 overflow-y-auto divide-y divide-[#E1E4E8] dark:divide-[#242730]">
                  {contentSubTab === 'exercises' &&
                    contentData.exercises
                      .filter(
                        (e) =>
                          !contentSearch ||
                          e.name?.toLowerCase().includes(contentSearch.toLowerCase()) ||
                          e.category?.toLowerCase().includes(contentSearch.toLowerCase())
                      )
                      .map((ex) => (
                        <div key={ex.id} className="flex items-center justify-between py-2.5 px-2 text-xs">
                          <div>
                            <span className="font-bold">{ex.name}</span>
                            <span className="ml-2 text-[#5A6069] dark:text-zinc-400">
                              • {ex.category} • {ex.equipment} ({ex.difficulty})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteContent(ex.id, ex.name)}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"
                            title="Delete Exercise"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}

                  {(contentSubTab === 'foods' || contentSubTab === 'supplements') &&
                    (contentSubTab === 'foods' ? contentData.foods : contentData.supplements)
                      .filter(
                        (f) =>
                          !contentSearch ||
                          f.name?.toLowerCase().includes(contentSearch.toLowerCase()) ||
                          f.brand?.toLowerCase().includes(contentSearch.toLowerCase())
                      )
                      .map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2.5 px-2 text-xs">
                          <div>
                            <span className="font-bold">{item.name}</span>
                            <span className="ml-2 text-[#5A6069] dark:text-zinc-400">
                              ({item.brand}) • per 100g: {item.per100g?.calories} kcal | P:{' '}
                              {item.per100g?.protein_g}g | C: {item.per100g?.carbs_g}g | F:{' '}
                              {item.per100g?.fat_g}g
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteContent(item.id, item.name)}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"
                            title="Remove Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}

                  {contentSubTab === 'brands' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 text-xs">
                      <div>
                        <h4 className="font-bold mb-2 text-brand">
                          Verified Brands ({contentData.brands.length})
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {contentData.brands.map((b) => (
                            <span
                              key={b}
                              className="rounded-lg bg-[#F3F4F6] dark:bg-[#222630] px-2.5 py-1 text-[11px]"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold mb-2 text-brand">
                          Active Categories ({contentData.categories.length})
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {contentData.categories.map((c) => (
                            <span
                              key={c}
                              className="rounded-lg bg-[#F3F4F6] dark:bg-[#222630] px-2.5 py-1 text-[11px]"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 5. AI MANAGEMENT TAB (Technical Model & Key Config Visible ONLY to Admin) */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-5">
                  <div className="text-xs text-[#5A6069] dark:text-zinc-400">Total AI Invocations</div>
                  <div className="mt-1 text-3xl font-black">{aiStats?.totalRequests || 0}</div>
                  <div className="mt-1 text-[11px] text-emerald-400">
                    {aiStats?.last24hRequests || 0} in last 24 hours
                  </div>
                </div>
                <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-5">
                  <div className="text-xs text-[#5A6069] dark:text-zinc-400">Active Provider &amp; Model</div>
                  <div className="mt-1 text-lg font-black text-brand font-mono">
                    {modelInput || aiStats?.configuredModel || 'gemini-3.8-flash'}
                  </div>
                  <div className="mt-1 text-[11px] text-[#5A6069] dark:text-zinc-400">
                    API Key: {aiStats?.geminiKeyConfigured ? 'Configured in Server Env' : 'Fallback Engine Active'}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-5">
                  <div className="text-xs text-[#5A6069] dark:text-zinc-400">Error Monitoring</div>
                  <div className="mt-1 text-3xl font-black text-emerald-400">
                    {aiStats?.errorCount || 0}
                  </div>
                  <div className="mt-1 text-[11px] text-[#5A6069] dark:text-zinc-400">
                    100% requests resolved cleanly
                  </div>
                </div>
              </div>

              {/* Endpoint Breakdown & Model Configuration */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-6 space-y-4">
                  <h3 className="text-base font-bold">Usage Breakdown by Endpoint</h3>
                  <div className="space-y-2.5 text-xs">
                    {Object.entries(aiStats?.byEndpoint || {}).map(([ep, count]) => (
                      <div
                        key={ep}
                        className="flex items-center justify-between rounded-xl bg-[#F8F9FA] dark:bg-[#0D0F12] px-4 py-2.5"
                      >
                        <span className="font-mono uppercase font-semibold">/api/ai/{ep}</span>
                        <strong className="text-brand">{String(count)} calls</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <form
                  onSubmit={handleSaveSettings}
                  className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-6 space-y-4"
                >
                  <h3 className="text-base font-bold">AI Model &amp; Platform Configuration</h3>
                  <p className="text-xs text-[#5A6069] dark:text-zinc-400">
                    Technical AI model selection is hidden from regular users and visible only here in the
                    Admin Console.
                  </p>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold mb-1">Underlying AI Model Identifier</label>
                      <select
                        value={modelInput}
                        onChange={(e) => setModelInput(e.target.value)}
                        className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#2E323D] bg-[#F8F9FA] dark:bg-[#0D0F12] px-3 py-2"
                      >
                        <option value="gemini-3.8-flash">gemini-3.8-flash (Low Latency Coaching)</option>
                        <option value="gemini-2.5-pro">gemini-2.5-pro (Deep Physiological Reasoning)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">Receiver UPI ID</label>
                        <input
                          type="text"
                          value={upiInput}
                          onChange={(e) => setUpiInput(e.target.value)}
                          className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#2E323D] bg-[#F8F9FA] dark:bg-[#0D0F12] px-3 py-2 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Monthly Price (INR)</label>
                        <input
                          type="number"
                          value={priceInput}
                          onChange={(e) => setPriceInput(Number(e.target.value))}
                          className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#2E323D] bg-[#F8F9FA] dark:bg-[#0D0F12] px-3 py-2"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Customer Support Email</label>
                      <input
                        type="email"
                        value={supportEmailInput}
                        onChange={(e) => setSupportEmailInput(e.target.value)}
                        className="w-full rounded-xl border border-[#E1E4E8] dark:border-[#2E323D] bg-[#F8F9FA] dark:bg-[#0D0F12] px-3 py-2"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="w-full rounded-xl bg-brand py-2.5 font-bold text-black hover:opacity-95"
                    >
                      {savingSettings ? 'Saving Configuration...' : 'Save Configuration'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 6. SYSTEM MANAGEMENT TAB */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              {/* Database Table Health */}
              <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold">Database Health &amp; Table Record Telemetry</h2>
                    <p className="text-xs text-[#5A6069] dark:text-zinc-400">
                      Status: <strong className="text-emerald-400">{systemHealth?.databaseStatus}</strong>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {Object.entries(systemHealth?.tableCounts || {}).map(([table, count]) => (
                    <div
                      key={table}
                      className="rounded-xl border border-[#E1E4E8] dark:border-[#242730] bg-[#F8F9FA] dark:bg-[#0D0F12] p-3"
                    >
                      <div className="font-mono text-[11px] text-[#5A6069] dark:text-zinc-400">{table}</div>
                      <div className="mt-1 text-lg font-black">{String(count)} rows</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Authentication & Identity Logs */}
              <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-6 space-y-4">
                <h3 className="text-base font-bold">Authentication &amp; Identity Separation Logs</h3>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E1E4E8] dark:border-[#242730] text-[10px] uppercase text-[#5A6069] dark:text-zinc-400">
                        <th className="py-2 px-3">Email</th>
                        <th className="py-2 px-3">Account Type</th>
                        <th className="py-2 px-3">Google Link Status</th>
                        <th className="py-2 px-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1E4E8] dark:divide-[#242730]">
                      {(systemHealth?.authLogs || []).map((a: any, i: number) => (
                        <tr key={i}>
                          <td className="py-2 px-3 font-mono">{a.email}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                a.auth_origin === 'google'
                                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                  : 'bg-[#F3F4F6] dark:bg-[#222630] text-[#111318] dark:text-zinc-200 border border-[#E1E4E8] dark:border-[#2E323D]'
                              }`}
                            >
                              {a.auth_origin === 'google' ? 'Google' : 'Email'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {a.auth_origin === 'google'
                              ? 'Primary Google Account'
                              : a.google_linked
                              ? 'Google Linked'
                              : 'Email Only'}
                          </td>
                          <td className="py-2 px-3 text-[#5A6069] dark:text-zinc-400">
                            {a.created_at ? new Date(a.created_at).toLocaleString() : 'Active'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Admin Audit Logs */}
              <div className="rounded-2xl border border-[#E1E4E8] dark:border-[#242730] bg-white dark:bg-[#14171C] p-6 space-y-4">
                <h3 className="text-base font-bold">Admin Activity &amp; Audit Trail</h3>
                {(systemHealth?.auditLogs || []).length === 0 ? (
                  <div className="text-xs text-[#5A6069] dark:text-zinc-400">
                    No administrative mutations recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
                    {(systemHealth?.auditLogs || []).map((log: any, idx: number) => (
                      <div
                        key={log.id || idx}
                        className="flex items-center justify-between rounded-xl bg-[#F8F9FA] dark:bg-[#0D0F12] px-4 py-2.5"
                      >
                        <div>
                          <span className="font-bold text-brand">{log.action}</span>
                          <span className="ml-2 text-[#5A6069] dark:text-zinc-400">
                            by {log.admin_email} • Target: {log.target_id}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#5A6069] dark:text-zinc-500">
                          {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Inspect User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#E1E4E8] dark:border-[#2E323D] bg-white dark:bg-[#14171C] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1E4E8] dark:border-[#242730] pb-3">
              <div>
                <h3 className="text-base font-bold">{selectedUser.full_name}</h3>
                <p className="text-xs font-mono text-[#5A6069] dark:text-zinc-400">{selectedUser.email}</p>
              </div>
              <button type="button" onClick={() => setSelectedUser(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-[#F8F9FA] dark:bg-[#0D0F12] p-3">
                <span className="text-[#5A6069] dark:text-zinc-400 block">Subscription Tier</span>
                <strong className="uppercase text-brand">{selectedUser.subscriptionPlan}</strong>
              </div>
              <div className="rounded-xl bg-[#F8F9FA] dark:bg-[#0D0F12] p-3">
                <span className="text-[#5A6069] dark:text-zinc-400 block">Account Type</span>
                <strong>
                  {selectedUser.auth_origin === 'google'
                    ? 'Google'
                    : selectedUser.google_linked
                    ? 'Email (+ Google Linked)'
                    : 'Email'}
                </strong>
              </div>
              <div className="rounded-xl bg-[#F8F9FA] dark:bg-[#0D0F12] p-3">
                <span className="text-[#5A6069] dark:text-zinc-400 block">Biometrics</span>
                <strong>
                  Age: {selectedUser.age || '—'} • {selectedUser.height_cm || '—'} cm •{' '}
                  {selectedUser.weight_kg || '—'} kg
                </strong>
              </div>
              <div className="rounded-xl bg-[#F8F9FA] dark:bg-[#0D0F12] p-3">
                <span className="text-[#5A6069] dark:text-zinc-400 block">Training Mode &amp; Goal</span>
                <strong className="capitalize">
                  {String(selectedUser.training_style).replace('_', ' ')} •{' '}
                  {String(selectedUser.primary_goal).replace('_', ' ')}
                </strong>
              </div>
              <div className="rounded-xl bg-[#F8F9FA] dark:bg-[#0D0F12] p-3">
                <span className="text-[#5A6069] dark:text-zinc-400 block">Workouts Logged</span>
                <strong>{selectedUser.workouts_logged || 0} sessions</strong>
              </div>
              <div className="rounded-xl bg-[#F8F9FA] dark:bg-[#0D0F12] p-3">
                <span className="text-[#5A6069] dark:text-zinc-400 block">Nutrition Diary Entries</span>
                <strong>{selectedUser.nutrition_entries_logged || 0} entries</strong>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-black"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
