import crypto from 'crypto';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

async function run() {
  console.log('=== PHASE 11: LIVE END-TO-END VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  // 1. Health & Readiness Check
  try {
    const healthRes = await fetch('http://127.0.0.1:8000/health');
    const healthData = await healthRes.json();
    if (healthRes.status === 200 && healthData.status === 'ok') {
      console.log('✅ [PASS] 1. Backend Health Check (/health): 200 OK');
      passed++;
    } else {
      console.error('❌ [FAIL] 1. Backend Health Check failed:', healthData);
      failed++;
    }
  } catch (e) {
    console.error('❌ [FAIL] 1. Health connection error:', e.message);
    failed++;
  }

  // 2. Unauthenticated GET /api/v1/me Stub
  try {
    const meRes = await fetch(`${API_BASE}/me`);
    const meData = await meRes.json();
    if (meRes.status === 200 && meData.authenticated === false && meData.user === null) {
      console.log('✅ [PASS] 2. Unauthenticated GET /api/v1/me returns explicit stub');
      passed++;
    } else {
      console.error('❌ [FAIL] 2. Unexpected GET /me response:', meData);
      failed++;
    }
  } catch (e) {
    console.error('❌ [FAIL] 2. GET /me error:', e.message);
    failed++;
  }

  // 3. User Registration & Atomic Provisioning
  const uniqueId = crypto.randomUUID().slice(0, 6);
  const testUsername = `toon_${uniqueId}`;
  const testEmail = `toon_${uniqueId}@maplepark.com`;

  try {
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        displayName: `Toon Hero ${uniqueId}`,
        email: testEmail,
        characterBase: 3,
      }),
    });
    const regData = await regRes.json();
    if (
      regRes.status === 201 &&
      regData.authenticated === true &&
      regData.user.username === testUsername &&
      regData.profile.displayName === `Toon Hero ${uniqueId}` &&
      regData.avatar &&
      regData.avatar.name === 'Luna'
    ) {
      console.log(`✅ [PASS] 3. Registration provisions User, Profile, Avatar atomically (User: ${testUsername})`);
      passed++;
    } else {
      console.error('❌ [FAIL] 3. Registration provisioning failed:', regData);
      failed++;
    }
  } catch (e) {
    console.error('❌ [FAIL] 3. Registration error:', e.message);
    failed++;
  }

  // 4. Duplicate Username Prevention (409 Conflict)
  try {
    const dupRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername.toUpperCase(), // Case-insensitive test
        displayName: 'Duplicate Attempter',
        email: `other_${uniqueId}@example.com`,
      }),
    });
    const dupData = await dupRes.json();
    if (dupRes.status === 409 && dupData.code === 'CONFLICT' && dupData.message.includes('already taken')) {
      console.log('✅ [PASS] 4. Duplicate username rejected with 409 Conflict and safe message');
      passed++;
    } else {
      console.error('❌ [FAIL] 4. Duplicate username check failed:', dupRes.status, dupData);
      failed++;
    }
  } catch (e) {
    console.error('❌ [FAIL] 4. Duplicate username error:', e.message);
    failed++;
  }

  // 5. Reserved Username Blocking (422)
  try {
    const resRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        displayName: 'Evil Imposter',
      }),
    });
    const resData = await resRes.json();
    if (resRes.status === 422) {
      console.log('✅ [PASS] 5. Reserved username "admin" rejected with 422 Unprocessable Content');
      passed++;
    } else {
      console.error('❌ [FAIL] 5. Reserved username was not rejected:', resRes.status, resData);
      failed++;
    }
  } catch (e) {
    console.error('❌ [FAIL] 5. Reserved username check error:', e.message);
    failed++;
  }

  // 6. Logout Endpoint
  try {
    const logoutRes = await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    const logoutData = await logoutRes.json();
    if (logoutRes.status === 200 && logoutData.message.includes('signed out')) {
      console.log('✅ [PASS] 6. Logout endpoint acknowledges session termination');
      passed++;
    } else {
      console.error('❌ [FAIL] 6. Logout failed:', logoutData);
      failed++;
    }
  } catch (e) {
    console.error('❌ [FAIL] 6. Logout error:', e.message);
    failed++;
  }

  // 7. Rate Limiting on Auth Routes
  try {
    let hitRateLimit = false;
    for (let i = 0; i < 35; i++) {
      const res = await fetch(`${API_BASE}/auth/password/change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: 'dummy',
          newPassword: 'newpassword123',
        }),
      });
      if (res.status === 429) {
        hitRateLimit = true;
        const data = await res.json();
        if (data.code === 'RATE_LIMIT_EXCEEDED' && data.message.includes('speedy toon')) {
          console.log('✅ [PASS] 7. Rate limiting active: 429 Too Many Requests triggered with cartoon message');
          passed++;
        }
        break;
      }
    }
    if (!hitRateLimit) {
      console.error('❌ [FAIL] 7. Rate limiting did not trigger within 35 requests');
      failed++;
    }
  } catch (e) {
    console.error('❌ [FAIL] 7. Rate limit test error:', e.message);
    failed++;
  }

  console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

run();
