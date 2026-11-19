// STRAP AI Fitness — Automated Auth, Security, Isolation & Payment Test Suite
import fs from 'fs';
import path from 'path';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Read owner email from .env.local so we test the actual configured owner
function readOwnerEmail() {
  try {
    const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    const m = env.match(/^(?:STRAP_ADMIN_EMAIL|ADMIN_EMAIL)=(.+)$/m);
    if (m && m[1]?.trim()) return m[1].trim().toLowerCase();
  } catch {}
  return 'owner@example.com';
}

function cookieFrom(res) {
  const raw = res.headers.get('set-cookie');
  if (!raw) return '';
  return raw.split(';')[0];
}

async function req(p, opts = {}) {
  const res = await fetch(`${BASE}${p}`, {
    ...opts,
    redirect: opts.redirect || 'manual',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  let body = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    body = await res.json().catch(() => null);
  }
  return { status: res.status, headers: res.headers, body, cookie: cookieFrom(res) };
}

async function main() {
  const results = [];
  const check = (id, name, ok, detail = '') => {
    results.push({ id, name, status: ok ? 'PASS' : 'FAIL', detail });
    console.log(`${ok ? '✅ PASS' : '❌ FAIL'} [${id}] ${name}${detail ? ` — ${detail}` : ''}`);
  };

  const ts = Date.now();
  const userA = `userA.${ts}@strap.test`;
  const userB = `userB.${ts}@strap.test`;
  const ownerEmail = readOwnerEmail();
  const pw = 'StrongPass123';

  // TEST 1: Signup + normalization + password rules + duplicate
  const weak = await req('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email: userA, password: '123', full_name: 'Weak' }) });
  const signA = await req('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email: `  ${userA.toUpperCase()}  `, password: pw, full_name: 'Athlete A' }) });
  const dupA = await req('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email: userA, password: pw, full_name: 'Athlete A' }) });
  check('TEST 1', 'New user signup + email normalization + weak password & duplicate rejection',
    weak.status === 400 && signA.status === 200 && Boolean(signA.cookie) && dupA.status === 409,
    `weak=${weak.status}, signup=${signA.status}, dup=${dupA.status}`);

  const cookieA = signA.cookie;

  // TEST 3 & 4: Login valid vs incorrect password
  const badPw = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: userA, password: 'WrongPassword99' }) });
  const goodLogin = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: ` ${userA.toUpperCase()} `, password: pw }) });
  check('TEST 3', 'Login with valid normalized credentials',
    goodLogin.status === 200 && Boolean(goodLogin.cookie),
    `status=${goodLogin.status}`);
  check('TEST 4', 'Login with incorrect password rejected cleanly (401)',
    badPw.status === 401 && badPw.body?.code === 'INVALID_CREDENTIALS',
    `status=${badPw.status}, code=${badPw.body?.code}`);

  // TEST 6: Password reset endpoints (non-enumerating forgot + unauth reset rejected)
  const forgot = await req('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: 'nonexistent@strap.test' }) });
  const unauthReset = await req('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ password: 'NewPassword123' }) });
  check('TEST 6', 'Password reset API (non-enumerating forgot + unauthenticated reset blocked)',
    forgot.status === 200 && forgot.body?.success === true && (unauthReset.status === 401 || unauthReset.status === 503),
    `forgot=${forgot.status}, unauthReset=${unauthReset.status}`);

  // TEST 7 & 8: Profile persistence + multi-device (two independent sessions)
  const updProf = await req('/api/user/profile', {
    method: 'PUT',
    headers: { Cookie: cookieA },
    body: JSON.stringify({ full_name: 'Athlete Alpha', role: 'admin' }), // role injection attempt must be ignored!
  });
  const saveMet = await req('/api/user/metrics', {
    method: 'POST',
    headers: { Cookie: cookieA },
    body: JSON.stringify({ age: 27, gender: 'male', height_cm: 180, current_weight_kg: 76.5, experience_level: 'intermediate', workout_location: 'gym' }),
  });
  const saveGoal = await req('/api/user/goals', {
    method: 'POST',
    headers: { Cookie: cookieA },
    body: JSON.stringify({ primary_goal: 'muscle_gain', target_weight_kg: 82, weekly_workout_days: 5 }),
  });

  // Simulate second device login
  const device2 = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: userA, password: pw }) });
  const prof2 = await req('/api/user/profile', { headers: { Cookie: device2.cookie } });
  const met2 = await req('/api/user/metrics', { headers: { Cookie: device2.cookie } });
  const goal2 = await req('/api/user/goals', { headers: { Cookie: device2.cookie } });
  const me2 = await req('/api/auth/me', { headers: { Cookie: device2.cookie } });

  check('TEST 7', 'Login from second device sees same account & data',
    device2.status === 200 && prof2.body?.profile?.full_name === 'Athlete Alpha' && met2.body?.metrics?.current_weight_kg === 76.5,
    `name=${prof2.body?.profile?.full_name}, weight=${met2.body?.metrics?.current_weight_kg}`);
  check('TEST 8', 'Profile/metrics/goals persist & protected role field cannot be escalated via profile PUT',
    updProf.status === 200 && saveMet.status === 200 && saveGoal.status === 200 && goal2.body?.goal?.weekly_workout_days === 5 && me2.body?.isAdmin === false,
    `goalDays=${goal2.body?.goal?.weekly_workout_days}, isAdmin=${me2.body?.isAdmin}`);

  // TEST 9: User B isolation (User B cannot see User A's records)
  const signB = await req('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email: userB, password: pw, full_name: 'Athlete B' }) });
  const cookieB = signB.cookie;
  const metB = await req('/api/user/metrics', { headers: { Cookie: cookieB } });
  const goalB = await req('/api/user/goals', { headers: { Cookie: cookieB } });
  const payB = await req('/api/payments/history', { headers: { Cookie: cookieB } });
  check('TEST 9', 'User B cannot read User A private records',
    metB.body?.metrics === null && goalB.body?.goal === null && Array.isArray(payB.body?.payments) && payB.body.payments.length === 0,
    `metB=${metB.body?.metrics}, goalB=${goalB.body?.goal}`);

  // TEST 10 & 11: Normal user cannot call any admin APIs
  const admStats = await req('/api/admin/stats', { headers: { Cookie: cookieA } });
  const admPay = await req('/api/admin/payments', { headers: { Cookie: cookieA } });
  const admUsers = await req('/api/admin/users', { headers: { Cookie: cookieA } });
  const admSet = await req('/api/admin/settings', { headers: { Cookie: cookieA } });
  const admRev = await req('/api/admin/payments/review', { method: 'POST', headers: { Cookie: cookieA }, body: JSON.stringify({ payment_id: 'x', action: 'approve' }) });
  check('TEST 10 & 11', 'Normal user blocked (403) from all admin APIs',
    [admStats, admPay, admUsers, admSet, admRev].every((r) => r.status === 403),
    `statuses=${[admStats, admPay, admUsers, admSet, admRev].map((r) => r.status).join(',')}`);

  // TEST 14: Free user blocked from Premium APIs
  const aiPlanFree = await req('/api/ai/generate-plan', { headers: { Cookie: cookieA } });
  const aiNutFree = await req('/api/ai/nutrition-plan', { headers: { Cookie: cookieA } });
  const aiChatFree = await req('/api/ai/chat', { method: 'POST', headers: { Cookie: cookieA }, body: JSON.stringify({ message: 'hi' }) });
  const recFree = await req('/api/user/recovery', { headers: { Cookie: cookieA } });
  const exFree = await req('/api/exercises', { headers: { Cookie: cookieA } });
  check('TEST 14', 'Free user blocked from all Premium APIs (403 / locked preview)',
    aiPlanFree.status === 403 && aiNutFree.status === 403 && aiChatFree.status === 403 && recFree.status === 403 && exFree.body?.locked === true,
    `plan=${aiPlanFree.status}, nut=${aiNutFree.status}, chat=${aiChatFree.status}, rec=${recFree.status}, exLocked=${exFree.body?.locked}`);

  // TEST 12 & 13: Owner admin access + payment approval activates ONLY the right user
  let ownerCookie = '';
  const ownerSign = await req('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email: ownerEmail, password: pw, full_name: 'Owner Admin' }) });
  if (ownerSign.status === 200) {
    ownerCookie = ownerSign.cookie;
  } else {
    const ownerLogin = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: ownerEmail, password: pw }) });
    ownerCookie = ownerLogin.cookie;
  }

  const ownerStats = await req('/api/admin/stats', { headers: { Cookie: ownerCookie } });
  check('TEST 12', `Owner admin (${ownerEmail}) can access admin APIs`,
    ownerStats.status === 200 && ownerStats.body?.currentAdmin === ownerEmail,
    `status=${ownerStats.status}, admin=${ownerStats.body?.currentAdmin}`);

  // User A submits UTR -> must NOT auto-activate!
  const utr = `UTR${String(ts).slice(-10)}`;
  const submitUtr = await req('/api/payments/submit-manual', {
    method: 'POST',
    headers: { Cookie: cookieA },
    body: JSON.stringify({ utr_reference: utr }),
  });
  const dupUtr = await req('/api/payments/submit-manual', {
    method: 'POST',
    headers: { Cookie: cookieB },
    body: JSON.stringify({ utr_reference: utr }),
  });
  const subBefore = await req('/api/user/subscription', { headers: { Cookie: cookieA } });
  const approve = await req('/api/admin/payments/review', {
    method: 'POST',
    headers: { Cookie: ownerCookie },
    body: JSON.stringify({ payment_id: submitUtr.body?.payment?.id, action: 'approve', admin_notes: 'Automated test verification' }),
  });
  const subAfterA = await req('/api/user/subscription', { headers: { Cookie: cookieA } });
  const subAfterB = await req('/api/user/subscription', { headers: { Cookie: cookieB } });
  check('TEST 13', 'UTR stays pending until owner approves -> activates ONLY User A (duplicate UTR rejected)',
    submitUtr.status === 200 && submitUtr.body?.activated === false && dupUtr.status === 409 &&
    subBefore.body?.isPremium === false && approve.status === 200 &&
    subAfterA.body?.isPremium === true && subAfterB.body?.isPremium === false,
    `submit=${submitUtr.status}, dup=${dupUtr.status}, before=${subBefore.body?.isPremium}, afterA=${subAfterA.body?.isPremium}, afterB=${subAfterB.body?.isPremium}`);

  // TEST 15: Premium user retains access after logout & re-login + can use AI endpoints
  const logoutA = await req('/api/auth/logout', { method: 'POST', headers: { Cookie: cookieA } });
  const reloginA = await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: userA, password: pw }) });
  const subRelogin = await req('/api/user/subscription', { headers: { Cookie: reloginA.cookie } });
  const aiPlanPrem = await req('/api/ai/generate-plan', { headers: { Cookie: reloginA.cookie } });
  check('TEST 15', 'Premium user retains access after logout + re-login & unlocks AI',
    logoutA.status === 200 && reloginA.status === 200 && subRelogin.body?.isPremium === true && aiPlanPrem.status === 200 && Boolean(aiPlanPrem.body?.plan?.weekly_schedule),
    `isPremium=${subRelogin.body?.isPremium}, aiPlan=${aiPlanPrem.status}`);

  const failed = results.filter((r) => r.status !== 'PASS').length;
  console.log(`\nSUMMARY: ${results.length - failed} PASSED, ${failed} FAILED`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
