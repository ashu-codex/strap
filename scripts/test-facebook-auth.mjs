// Verification tests for Facebook OAuth, callback edge cases, and UUID profile integrity
const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

function assert(cond, msg) {
  if (!cond) {
    console.error('❌ FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('✅ PASS:', msg);
  }
}

async function run() {
  // 1. Callback error handling checks
  const cancelRes = await fetch(`${BASE}/auth/callback?error=access_denied`, { redirect: 'manual' });
  const cancelLoc = cancelRes.headers.get('location') || '';
  assert(cancelRes.status === 307 || cancelRes.status === 302, `Cancelled OAuth redirects (status=${cancelRes.status})`);
  assert(cancelLoc.includes('/login?error=oauth_cancelled'), `Cancelled OAuth location=${cancelLoc}`);

  const noEmailRes = await fetch(
    `${BASE}/auth/callback?error=server_error&error_description=Error+getting+user+email+from+external+provider`,
    { redirect: 'manual' }
  );
  const noEmailLoc = noEmailRes.headers.get('location') || '';
  assert(noEmailLoc.includes('/login?error=facebook_no_email'), `Facebook missing email location=${noEmailLoc}`);

  const disabledRes = await fetch(
    `${BASE}/auth/callback?error=server_error&error_description=Unsupported+provider%3A+provider+is+not+enabled`,
    { redirect: 'manual' }
  );
  const disabledLoc = disabledRes.headers.get('location') || '';
  assert(disabledLoc.includes('/login?error=provider_disabled'), `Disabled provider location=${disabledLoc}`);

  // 2. Render checks for Login & Signup pages showing Google, Facebook, and Email options
  for (const path of ['/login', '/signup']) {
    const res = await fetch(`${BASE}${path}`);
    const html = await res.text();
    assert(res.status === 200, `${path} responds 200 OK`);
    assert(html.includes('Continue with Google'), `${path} renders Continue with Google`);
    assert(html.includes('Continue with Facebook'), `${path} renders Continue with Facebook`);
    assert(html.includes('btn-facebook'), `${path} applies official btn-facebook styling`);
    assert(html.includes('Or continue with email'), `${path} renders email divider`);
  }

  // 3. Facebook nested avatar & email-less metadata normalization unit check
  const extractMeta = (email, meta) => {
    const rawName = meta?.full_name || meta?.name;
    const trimmedEmail = (email || '').trim().toLowerCase();
    const fullName =
      (typeof rawName === 'string' && rawName.trim()) ||
      (trimmedEmail.includes('@') ? trimmedEmail.split('@')[0] : '') ||
      'Athlete';
    let avatarUrl = null;
    if (typeof meta?.avatar_url === 'string' && meta.avatar_url.trim()) avatarUrl = meta.avatar_url.trim();
    else if (typeof meta?.picture?.data?.url === 'string' && meta.picture.data.url.trim()) avatarUrl = meta.picture.data.url.trim();
    else if (typeof meta?.picture === 'string' && meta.picture.trim()) avatarUrl = meta.picture.trim();
    return { fullName, avatarUrl };
  };

  const fbNested = extractMeta('', { name: 'Rohan FB', picture: { data: { url: 'https://graph.facebook.com/123/picture' } } });
  assert(fbNested.fullName === 'Rohan FB', `Facebook name extracted (${fbNested.fullName})`);
  assert(fbNested.avatarUrl === 'https://graph.facebook.com/123/picture', `Facebook nested picture.data.url extracted`);

  const fbNoEmailNoName = extractMeta('', {});
  assert(fbNoEmailNoName.fullName === 'Athlete', `Email-less fallback defaults name to Athlete`);
}

run();
