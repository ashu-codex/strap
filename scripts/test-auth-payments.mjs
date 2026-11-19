/**
 * Integration tests for STRAP auth, UPI pending submissions, and admin approval.
 * Does not fake payment success: premium is asserted only after admin approve.
 */
const BASE = process.env.STRAP_TEST_URL || 'http://127.0.0.1:3000';

function extractCookies(res, jar) {
  const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const fallback = res.headers.get('set-cookie');
  const list = raw.length ? raw : fallback ? [fallback] : [];
  for (const cookie of list) {
    const pair = cookie.split(';')[0];
    const eq = pair.indexOf('=');
    if (eq > 0) {
      jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }
}

function cookieHeader(jar) {
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function request(path, { method = 'GET', body, jar } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (jar) headers.Cookie = cookieHeader(jar);
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (jar) extractCookies(res, jar);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 60000) {
    try {
      const res = await fetch(BASE + '/api/auth/me');
      if (res.ok || res.status === 200) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error('Server did not become ready at ' + BASE);
}

async function run() {
  await waitForServer();
  const failures = [];
  const stamp = Date.now();
  const email = `athlete-${stamp}@strap.test`;
  const utr = `UTR${stamp}`.slice(0, 16);

  try {
    const anon = await request('/api/auth/me');
    assert(anon.status === 200, `anon /me status ${anon.status}`);
    assert(!anon.json.user, 'Unauthenticated requests must not impersonate the demo athlete');
    assert(anon.json.isPremium === false, 'Anonymous users must not be premium');
    assert(anon.json.isAdmin === false, 'Anonymous users must not be admin');
    console.log('PASS anonymous session is empty');
  } catch (err) {
    failures.push(err.message);
    console.error('FAIL', err.message);
  }

  const athlete = new Map();
  try {
    const signup = await request('/api/auth/signup', {
      method: 'POST',
      jar: athlete,
      body: { email, password: 'strap-pass-1', full_name: 'Test Athlete' },
    });
    assert(signup.status === 200, `signup status ${signup.status} ${JSON.stringify(signup.json)}`);
    assert(signup.json.user, 'signup should return a user');

    const me = await request('/api/auth/me', { jar: athlete });
    assert(me.json.user?.email === email, 'signup session should stick');
    assert(me.json.isPremium === false, 'new accounts start on the free plan');

    const pendingSub = await request('/api/user/subscription', { jar: athlete });
    assert(pendingSub.json.isPremium === false, 'subscription endpoint must not grant premium before approval');

    const submit = await request('/api/payments/submit-manual', {
      method: 'POST',
      jar: athlete,
      body: { utr_reference: utr },
    });
    assert(submit.status === 200, `submit status ${submit.status} ${JSON.stringify(submit.json)}`);
    assert(submit.json.payment?.payment_status === 'pending', 'UTR submit must stay pending');
    assert(submit.json.activated === false, 'submit must not activate premium');

    const afterSubmit = await request('/api/user/subscription', { jar: athlete });
    assert(afterSubmit.json.isPremium === false, 'premium must remain inactive after UTR submit');

    const rogueApprove = await request('/api/admin/payments/review', {
      method: 'POST',
      jar: athlete,
      body: { payment_id: submit.json.payment.id, action: 'approve' },
    });
    assert(rogueApprove.status === 403, `athlete approve should 403, got ${rogueApprove.status}`);

    const admin = new Map();
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      jar: admin,
      body: { demoType: 'admin' },
    });
    assert(adminLogin.status === 200, 'admin demo login failed');
    const adminMe = await request('/api/auth/me', { jar: admin });
    assert(adminMe.json.isAdmin === true, 'admin session must be authorized');

    const payments = await request('/api/admin/payments', { jar: admin });
    assert(payments.status === 200, `admin payments ${payments.status} ${JSON.stringify(payments.json)}`);
    const pending = (payments.json.payments || []).find((p) => p.utr_reference === utr);
    assert(pending, 'admin ledger must include the pending UTR');

    const approve = await request('/api/admin/payments/review', {
      method: 'POST',
      jar: admin,
      body: { payment_id: pending.id, action: 'approve', admin_notes: 'Bank credit confirmed in test.' },
    });
    assert(approve.status === 200, `approve status ${approve.status} ${JSON.stringify(approve.json)}`);
    assert(approve.json.subscription?.plan === 'premium', 'approval must return premium subscription');
    assert(approve.json.payment?.payment_status === 'approved', 'payment must become approved');

    const activated = await request('/api/user/subscription', { jar: athlete });
    assert(activated.json.isPremium === true, 'athlete premium must activate only after admin approval');
    assert(activated.json.subscription?.plan === 'premium', 'subscription plan should be premium');
    assert(activated.json.subscription?.status === 'active', 'subscription status should be active');

    const history = await request('/api/payments/history', { jar: athlete });
    assert(
      (history.json.payments || []).some((p) => p.utr_reference === utr && p.payment_status === 'approved'),
      'payment history should show the approved UTR'
    );

    console.log('PASS UPI pending submit, authorization, and premium activation');
  } catch (err) {
    failures.push(err.message);
    console.error('FAIL', err.message);
  }

  if (failures.length) {
    console.error('\n' + failures.length + ' test(s) failed');
    process.exit(1);
  }
  console.log('\nAll auth/payment tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
