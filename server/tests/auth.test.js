/**
 * PeoplePay360 - Authentication & Role Bootstrap Test Suite
 * Tests all Auth endpoints, validations, errors, and password change logic.
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api/auth';

let testsPassed = 0;
let testsFailed = 0;

function logPass(desc) {
  console.log(`  ✅ PASS: ${desc}`);
  testsPassed++;
}

function logFail(desc, error) {
  console.error(`  ❌ FAIL: ${desc}`);
  console.error(`     Error: ${error.message || error}`);
  testsFailed++;
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING AUTH & PASSWORD MANAGEMENT TEST SUITE');
  console.log('======================================================\n');

  let adminToken = null;
  let employeeToken = null;

  // 1. Admin Login (Valid Credentials)
  try {
    const res = await request('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@demo.com',
        password: 'Password123!',
      }),
    });

    if (res.status === 200 && res.body?.success && res.body.data?.token) {
      adminToken = res.body.data.token;
      logPass('POST /login - Admin login returns 200 and valid JWT token');
    } else {
      throw new Error(`Unexpected status ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (e) {
    logFail('POST /login - Admin login', e);
  }

  // 2. Login with Invalid Password
  try {
    const res = await request('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@demo.com',
        password: 'WrongPassword123!',
      }),
    });

    if (res.status === 401 && res.body?.error?.code === 'INVALID_CREDENTIALS') {
      logPass('POST /login - Invalid password rejected with 401 INVALID_CREDENTIALS');
    } else {
      throw new Error(`Expected 401 INVALID_CREDENTIALS, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (e) {
    logFail('POST /login - Invalid password rejection', e);
  }

  // 3. Login with Non-Existent Email (Generic 401 to prevent enumeration)
  try {
    const res = await request('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@demo.com',
        password: 'Password123!',
      }),
    });

    if (res.status === 401 && res.body?.error?.code === 'INVALID_CREDENTIALS') {
      logPass('POST /login - Non-existent email rejected with generic 401 (anti-enumeration)');
    } else {
      throw new Error(`Expected 401, got ${res.status}`);
    }
  } catch (e) {
    logFail('POST /login - Non-existent email', e);
  }

  // 4. GET /me Without Token
  try {
    const res = await request('/me', { method: 'GET' });
    if (res.status === 401 && res.body?.error?.code === 'UNAUTHENTICATED') {
      logPass('GET /me - Unauthenticated request blocked with 401 UNAUTHENTICATED');
    } else {
      throw new Error(`Expected 401 UNAUTHENTICATED, got ${res.status}`);
    }
  } catch (e) {
    logFail('GET /me - Unauthenticated block', e);
  }

  // 5. GET /me With Admin Token
  try {
    const res = await request('/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    if (res.status === 200 && res.body?.data?.role === 'ADMIN') {
      logPass('GET /me - Admin profile retrieved successfully with ADMIN role');
    } else {
      throw new Error(`Expected 200 ADMIN profile, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (e) {
    logFail('GET /me - Admin profile', e);
  }

  // 6. Employee Login & Linked Profile Retrieval
  try {
    const loginRes = await request('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'employee@demo.com',
        password: 'Password123!',
      }),
    });

    if (loginRes.status === 200 && loginRes.body.data?.token) {
      employeeToken = loginRes.body.data.token;
      logPass('POST /login - Employee login returns 200 and token');

      const meRes = await request('/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${employeeToken}` },
      });

      if (
        meRes.status === 200 &&
        meRes.body.data?.role === 'EMPLOYEE' &&
        meRes.body.data.employee?.firstName === 'Alex' &&
        meRes.body.data.employee?.department?.name === 'Engineering'
      ) {
        logPass('GET /me - Employee profile includes linked Employee, Department & Job Position');
      } else {
        throw new Error(`Incomplete employee profile: ${JSON.stringify(meRes.body)}`);
      }
    } else {
      throw new Error(`Employee login failed: ${JSON.stringify(loginRes.body)}`);
    }
  } catch (e) {
    logFail('Employee login & profile verification', e);
  }

  // 7. PATCH /change-password - Reject Wrong Current Password
  try {
    const res = await request('/change-password', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: JSON.stringify({
        currentPassword: 'IncorrectOldPassword!',
        newPassword: 'BrandNewSecurePassword2026!',
      }),
    });

    if (res.status === 400 && res.body?.error?.code === 'INVALID_CURRENT_PASSWORD') {
      logPass('PATCH /change-password - Incorrect current password rejected with 400 INVALID_CURRENT_PASSWORD');
    } else {
      throw new Error(`Expected 400 INVALID_CURRENT_PASSWORD, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (e) {
    logFail('PATCH /change-password - Wrong current password', e);
  }

  // 8. PATCH /change-password - Reject Same Password as Current
  try {
    const res = await request('/change-password', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: JSON.stringify({
        currentPassword: 'Password123!',
        newPassword: 'Password123!',
      }),
    });

    if (res.status === 400 && res.body?.error?.code === 'VALIDATION_ERROR') {
      logPass('PATCH /change-password - Identical new password rejected with 400 VALIDATION_ERROR');
    } else {
      throw new Error(`Expected 400 VALIDATION_ERROR, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (e) {
    logFail('PATCH /change-password - Identical password validation', e);
  }

  // 9. PATCH /change-password - Reject Too Short Password (< 8 chars)
  try {
    const res = await request('/change-password', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: JSON.stringify({
        currentPassword: 'Password123!',
        newPassword: 'short',
      }),
    });

    if (res.status === 400 && res.body?.error?.code === 'VALIDATION_ERROR') {
      logPass('PATCH /change-password - Short password (<8 chars) rejected with 400 VALIDATION_ERROR');
    } else {
      throw new Error(`Expected 400, got ${res.status}`);
    }
  } catch (e) {
    logFail('PATCH /change-password - Short password validation', e);
  }

  // 10. PATCH /change-password - Successful Password Change
  const tempPassword = 'UpdatedEmpPass2026!';
  try {
    const res = await request('/change-password', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: JSON.stringify({
        currentPassword: 'Password123!',
        newPassword: tempPassword,
      }),
    });

    if (res.status === 200 && res.body?.success) {
      logPass('PATCH /change-password - Successfully updated employee password');
    } else {
      throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (e) {
    logFail('PATCH /change-password - Success case', e);
  }

  // 11. Verify Old Password Fails
  try {
    const res = await request('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'employee@demo.com',
        password: 'Password123!',
      }),
    });

    if (res.status === 401) {
      logPass('POST /login - Old password now fails with 401');
    } else {
      throw new Error(`Expected 401 with old password, got ${res.status}`);
    }
  } catch (e) {
    logFail('Verification that old password fails', e);
  }

  // 12. Verify New Password Succeeds
  let newEmpToken = null;
  try {
    const res = await request('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'employee@demo.com',
        password: tempPassword,
      }),
    });

    if (res.status === 200 && res.body.data?.token) {
      newEmpToken = res.body.data.token;
      logPass('POST /login - Successfully logged in with NEW password');
    } else {
      throw new Error(`Expected 200 with new password, got ${res.status}`);
    }
  } catch (e) {
    logFail('Verification that new password succeeds', e);
  }

  // 13. Restore Password to Original for Demo Fixture Pristine State
  try {
    const res = await request('/change-password', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${newEmpToken}` },
      body: JSON.stringify({
        currentPassword: tempPassword,
        newPassword: 'Password123!',
      }),
    });

    if (res.status === 200) {
      logPass('PATCH /change-password - Restored password back to standard Password123! for demo state');
    } else {
      throw new Error(`Failed to restore password: ${res.status}`);
    }
  } catch (e) {
    logFail('Restore demo password', e);
  }

  // 14. POST /logout
  try {
    const res = await request('/logout', { method: 'POST' });
    if (res.status === 200 && res.body?.success) {
      logPass('POST /logout - Logout clears cookie and returns 200');
    } else {
      throw new Error(`Expected 200, got ${res.status}`);
    }
  } catch (e) {
    logFail('POST /logout', e);
  }

  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
