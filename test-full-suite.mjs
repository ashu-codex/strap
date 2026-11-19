// Comprehensive test suite for STRAP AI Fitness SaaS
const BASE = 'http://localhost:3000';

async function runTests() {
  console.log('========================================================');
  console.log('🚀 STRAP AI FITNESS FULL BACKEND & API VERIFICATION SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  function getCookie(res) {
    const raw = res.headers.get('set-cookie');
    if (!raw) return '';
    return raw.split(';')[0];
  }

  // 1. Health check & Public endpoints
  console.log('--- 1. Testing Public Endpoints ---');
  try {
    const homeRes = await fetch(`${BASE}/`);
    assert(homeRes.status === 200, 'Landing page responds with 200 OK');
    const pricingRes = await fetch(`${BASE}/pricing`);
    assert(pricingRes.status === 200, 'Pricing page responds with 200 OK');
    const exRes = await fetch(`${BASE}/api/exercises`);
    assert(exRes.status === 200, 'Exercises API responds with 200 OK');
    const exData = await exRes.json();
    assert(exData.locked === true || Array.isArray(exData.exercises), 'Exercises returns preview or full library');
  } catch (e) {
    assert(false, `Public endpoints error: ${e.message}`);
  }

  // 2. Authentication: Login as Ashutosh (Paid User)
  console.log('\n--- 2. Testing Auth & Paid User Subscription ---');
  let ashutoshCookie = '';
  try {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ashutoshkkr6200@gmail.com', password: 'password123' })
    });
    assert(loginRes.status === 200, 'Login ashutoshkkr6200@gmail.com succeeds with 200');
    ashutoshCookie = getCookie(loginRes);
    assert(ashutoshCookie.includes('strap_session'), 'Session cookie strap_session is set');

    const meRes = await fetch(`${BASE}/api/auth/me`, {
      headers: { Cookie: ashutoshCookie }
    });
    const meData = await meRes.json();
    assert(meData.user?.email === 'ashutoshkkr6200@gmail.com', 'Me endpoint returns user email');

    const subRes = await fetch(`${BASE}/api/user/subscription`, {
      headers: { Cookie: ashutoshCookie }
    });
    const subData = await subRes.json();
    assert(subData.isPremium === true, 'Ashutosh isPremium is true');
    assert(subData.subscription?.status === 'active', 'Subscription status is active');
  } catch (e) {
    assert(false, `Auth error: ${e.message}`);
  }

  // 3. Free User vs Premium Access Control Gate
  console.log('\n--- 3. Testing Free User Access Control & Security ---');
  let freeUserCookie = '';
  const testUserEmail = `free-athlete-${Date.now()}@strap.test`;
  try {
    const signupRes = await fetch(`${BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        password: 'password123',
        full_name: 'Free Athlete'
      })
    });
    assert(signupRes.status === 200, `Signup ${testUserEmail} succeeds with 200`);
    freeUserCookie = getCookie(signupRes);
    assert(freeUserCookie.includes('strap_session'), 'Session cookie set for new free user');

    const freeSub = await fetch(`${BASE}/api/user/subscription`, {
      headers: { Cookie: freeUserCookie }
    });
    const freeSubData = await freeSub.json();
    assert(freeSubData.isPremium === false, 'Free user isPremium is false');

    const aiGateRes = await fetch(`${BASE}/api/ai/generate-plan`, {
      headers: { Cookie: freeUserCookie }
    });
    assert(aiGateRes.status === 403, 'AI generate-plan blocks free user with 403 Forbidden');

    const nutGateRes = await fetch(`${BASE}/api/ai/nutrition-plan`, {
      headers: { Cookie: freeUserCookie }
    });
    assert(nutGateRes.status === 403, 'AI nutrition-plan blocks free user with 403 Forbidden');
  } catch (e) {
    assert(false, `Free user access test error: ${e.message}`);
  }

  // 4. Premium AI Features for Paid User
  console.log('\n--- 4. Testing Premium AI Engine for Paid User ---');
  try {
    const aiPlanRes = await fetch(`${BASE}/api/ai/generate-plan`, {
      headers: { Cookie: ashutoshCookie }
    });
    assert(aiPlanRes.status === 200, 'Paid user accessing generate-plan receives 200 OK');
    const aiPlanData = await aiPlanRes.json();
    assert(aiPlanData.plan?.weekly_schedule?.length > 0, 'AI plan has weekly_schedule');

    const nutRes = await fetch(`${BASE}/api/ai/nutrition-plan`, {
      headers: { Cookie: ashutoshCookie }
    });
    assert(nutRes.status === 200, 'Paid user accessing nutrition-plan receives 200 OK');
    const nutData = await nutRes.json();
    assert(nutData.nutritionPlan?.target_calories > 0, 'Nutrition plan returns validated caloric targets');

    const chatRes = await fetch(`${BASE}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: ashutoshCookie },
      body: JSON.stringify({ message: 'What is progressive overload?' })
    });
    assert(chatRes.status === 200, 'AI chat responds with 200 OK');
    const chatData = await chatRes.json();
    assert(typeof chatData.reply === 'string' && chatData.reply.length > 10, 'AI chat returns informative coaching reply');
  } catch (e) {
    assert(false, `Premium AI test error: ${e.message}`);
  }

  // 5. Payment Creation, Duplicate UTR Rejection, and Admin Approval Flow
  console.log('\n--- 5. Testing Payment Pipeline, UTR Protection & Admin Reconciliation ---');
  try {
    const dupRes = await fetch(`${BASE}/api/payments/submit-manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: freeUserCookie },
      body: JSON.stringify({
        utr_reference: '220868696814',
        amount_inr: 100,
        upi_id: 'ashutosh-k82@ptyes'
      })
    });
    assert(dupRes.status === 400, 'Duplicate UTR submission is rejected with 400 Bad Request');
    const dupData = await dupRes.json();
    assert(dupData.error.toLowerCase().includes('already') || dupData.error.toLowerCase().includes('utr'), 'Duplicate error message informs user');

    const uniqueUtr = 'UTR' + Date.now().toString().slice(-9);
    const validPayRes = await fetch(`${BASE}/api/payments/submit-manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: freeUserCookie },
      body: JSON.stringify({
        utr_reference: uniqueUtr,
        amount_inr: 100,
        upi_id: 'ashutosh-k82@ptyes'
      })
    });
    assert(validPayRes.status === 200, `Valid payment submitted with UTR ${uniqueUtr}`);
    const validPayData = await validPayRes.json();
    const newPaymentId = validPayData.payment?.id;
    assert(newPaymentId != null, 'Payment ID generated');

    const adminLogin = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ashutosh@strapfitness.com', password: 'password123' })
    });
    assert(adminLogin.status === 200, 'Admin login succeeds with 200');
    const adminCookie = getCookie(adminLogin);

    const adminPayList = await fetch(`${BASE}/api/admin/payments`, {
      headers: { Cookie: adminCookie }
    });
    const adminPayData = await adminPayList.json();
    const targetPay = adminPayData.payments.find(p => p.id === newPaymentId);
    assert(targetPay?.payment_status === 'pending', 'Submitted payment appears in admin pending list');

    const approveRes = await fetch(`${BASE}/api/admin/payments/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        payment_id: newPaymentId,
        action: 'approve',
        admin_notes: 'Verified via automated test runner.'
      })
    });
    assert(approveRes.status === 200, 'Admin approval responds with 200 OK');

    const recheckSub = await fetch(`${BASE}/api/user/subscription`, {
      headers: { Cookie: freeUserCookie }
    });
    const recheckData = await recheckSub.json();
    assert(recheckData.isPremium === true, 'Athlete is now Premium after admin approval');
    assert(recheckData.subscription?.status === 'active', 'Athlete subscription status is active');
  } catch (e) {
    assert(false, `Payment approval test error: ${e.message}`);
  }

  // 6. Workout Tracker & Volume/PR Analytics
  console.log('\n--- 6. Testing Workout Logging & PR Progression ---');
  try {
    const workoutLogRes = await fetch(`${BASE}/api/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: ashutoshCookie },
      body: JSON.stringify({
        workout_name: 'Test Leg Hypertrophy',
        split_type: 'Lower',
        exercises: [
          {
            exercise_name: 'Barbell Back Squat',
            target_muscle: 'Quadriceps',
            sets: [
              { set_number: 1, weight_kg: 100, reps: 8, is_completed: true },
              { set_number: 2, weight_kg: 105, reps: 6, is_completed: true }
            ]
          }
        ]
      })
    });
    assert(workoutLogRes.status === 200, 'Workout logged successfully with 200 OK');
    const wData = await workoutLogRes.json();
    assert(wData.workout?.total_volume_kg === 1430, 'Total volume calculated accurately (100*8 + 105*6 = 1430 kg)');
  } catch (e) {
    assert(false, `Workout logging test error: ${e.message}`);
  }

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
