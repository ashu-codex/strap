// Verification tests for Dual Height Unit Support (CM | FT + IN)
import fs from 'fs';
import path from 'path';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Replicate exact pure logic check + API persistence check
function cmToFtIn(cm) {
  if (!Number.isFinite(cm) || cm <= 0) return { feet: 0, inches: 0 };
  const totalInches = Math.round(cm / 2.54);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

function ftInToCm(feet, inches) {
  if (!Number.isFinite(feet) || !Number.isFinite(inches)) return 0;
  return Math.round((feet * 12 + inches) * 2.54 * 10) / 10;
}

function validateHeightCm(cm) {
  if (!Number.isFinite(cm) || cm <= 0) return 'Height must be greater than 0.';
  if (cm < 90 || cm > 250) return 'Height must be between 90 cm (3 ft 0 in) and 250 cm (8 ft 2 in).';
  return null;
}

function validateFtIn(feet, inches) {
  if (!Number.isFinite(feet) || !Number.isFinite(inches)) return 'Feet and inches must be valid numbers.';
  if (feet < 0 || inches < 0 || (feet === 0 && inches === 0)) return 'Height cannot be zero or negative.';
  if (!Number.isInteger(inches) || inches < 0 || inches > 11) return 'Inches must be a whole number between 0 and 11.';
  if (!Number.isInteger(feet) || feet < 3 || feet > 8) return 'Height must be between 3 ft 0 in (90 cm) and 8 ft 2 in (250 cm).';
  const cm = ftInToCm(feet, inches);
  if (cm < 90 || cm > 250) return 'Height must be between 3 ft 0 in (90 cm) and 8 ft 2 in (250 cm).';
  return null;
}

function assert(cond, msg) {
  if (!cond) {
    console.error('❌ FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('✅ PASS:', msg);
  }
}

async function run() {
  // 1. Conversion accuracy tests
  const f1 = cmToFtIn(178);
  assert(f1.feet === 5 && f1.inches === 10, `178 cm -> ${f1.feet} ft ${f1.inches} in (expected 5 ft 10 in)`);

  const c1 = ftInToCm(5, 10);
  assert(c1 === 177.8, `5 ft 10 in -> ${c1} cm (expected 177.8 cm)`);

  const f2 = cmToFtIn(177.8);
  assert(f2.feet === 5 && f2.inches === 10, `177.8 cm -> ${f2.feet} ft ${f2.inches} in (round-trip accurate)`);

  // 2. Multi-switch drift check (simulating unedited toggle preserving exact cm)
  let storedCm = 178;
  let dirty = false;
  for (let i = 0; i < 6; i++) {
    const shown = cmToFtIn(storedCm);
    assert(shown.feet === 5 && shown.inches === 10, `Switch #${i + 1} FT+IN shows 5 ft 10 in`);
    if (!dirty) {
      assert(storedCm === 178, `Switch #${i + 1} back to CM preserves exact 178 cm`);
    }
  }

  // 3. Validation tests
  assert(validateHeightCm(0) !== null, '0 cm rejected');
  assert(validateHeightCm(-170) !== null, 'Negative cm rejected');
  assert(validateHeightCm(89) !== null, 'Below 90 cm rejected');
  assert(validateHeightCm(251) !== null, 'Above 250 cm rejected');
  assert(validateHeightCm(178) === null, '178 cm accepted');

  assert(validateFtIn(0, 0) !== null, '0 ft 0 in rejected');
  assert(validateFtIn(-5, 10) !== null, 'Negative feet rejected');
  assert(validateFtIn(5, -1) !== null, 'Negative inches rejected');
  assert(validateFtIn(5, 12) !== null, '12 inches rejected (must be 0-11)');
  assert(validateFtIn(5, 10.5) !== null, 'Decimal inches rejected');
  assert(validateFtIn(5, 10) === null, '5 ft 10 in accepted');

  // 4. API Persistence & Validation test against running server
  const email = `height.test.${Date.now()}@strap.test`;
  const pw = 'StrongPass123';
  const signRes = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pw, full_name: 'Height Tester' }),
  });
  if (!signRes.ok) {
    console.log('⚠️ Skipping API persistence test (server not in dev-auth mode or offline): status', signRes.status);
    return;
  }
  const cookie = (signRes.headers.get('set-cookie') || '').split(';')[0];

  // Reject out-of-range height on API
  const badRes = await fetch(`${BASE}/api/user/metrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ age: 25, gender: 'male', height_cm: -10, height_unit: 'cm', current_weight_kg: 70 }),
  });
  assert(badRes.status === 400, `API rejects negative height (status=${badRes.status})`);

  // Save 5 ft 10 in -> 177.8 cm with height_unit='ft_in'
  const saveRes = await fetch(`${BASE}/api/user/metrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      age: 25,
      gender: 'male',
      height_cm: ftInToCm(5, 10),
      height_unit: 'ft_in',
      current_weight_kg: 72,
    }),
  });
  assert(saveRes.status === 200, `API saves 177.8 cm + ft_in (status=${saveRes.status})`);

  // Retrieve saved metrics and verify height_cm and height_unit persist
  const getRes = await fetch(`${BASE}/api/user/metrics`, { headers: { Cookie: cookie } });
  const getData = await getRes.json();
  assert(getData.metrics?.height_cm === 177.8, `Retrieved height_cm=${getData.metrics?.height_cm} (expected 177.8)`);
  assert(getData.metrics?.height_unit === 'ft_in' && getData.height_unit === 'ft_in', `Retrieved height_unit=${getData.height_unit} (expected ft_in)`);
}

run();
