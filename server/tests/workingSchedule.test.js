/**
 * PeoplePay360 - Working Schedules Test Suite
 * Tests full CRUD, Weekly Hours Calculation, Line Validations,
 * and RBAC access permissions for Working Schedules.
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';

let testsPassed = 0;
let testsFailed = 0;

function logPass(desc) {
  console.log(`  ✅ PASS: ${desc}`);
  testsPassed++;
}

function logFail(desc, error) {
  console.error(`  ❌ FAIL: ${desc}`);
  console.error(`     Error: ${error?.message || error}`);
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

async function loginAs(email, password = 'Password123!') {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200 || !res.body?.data?.token) {
    throw new Error(`Failed to login as ${email}: ${JSON.stringify(res.body)}`);
  }
  return {
    token: res.body.data.token,
    user: res.body.data.user,
  };
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING WORKING SCHEDULES TEST SUITE');
  console.log('======================================================\n');

  let adminAuth = null;
  let hrAuth = null;
  let employeeAuth = null;
  let createdScheduleId = null;

  // 1. Authentication Setup
  try {
    adminAuth = await loginAs('admin@demo.com');
    hrAuth = await loginAs('hrmanager@demo.com');
    employeeAuth = await loginAs('employee@demo.com');
    logPass('Authenticated Admin, HR Manager, and Employee test accounts');
  } catch (err) {
    logFail('Authentication setup failed', err);
    return;
  }

  // 2. GET /api/working-schedules (All authenticated roles can read)
  try {
    const res = await request('/working-schedules', {
      headers: { Authorization: `Bearer ${employeeAuth.token}` },
    });
    if (res.status === 200 && Array.isArray(res.body?.data) && res.body.data.length > 0) {
      const schedule = res.body.data[0];
      if (typeof schedule.weeklyHours === 'number' && typeof schedule.daysPerWeek === 'number') {
        logPass(`GET /api/working-schedules returns schedules with computed weeklyHours (${schedule.weeklyHours}h)`);
      } else {
        throw new Error('weeklyHours or daysPerWeek missing from response');
      }
    } else {
      throw new Error(`Unexpected status ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('GET /api/working-schedules failed', err);
  }

  // 3. POST /api/working-schedules - RBAC check (Employee forbidden)
  try {
    const res = await request('/working-schedules', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeAuth.token}` },
      body: JSON.stringify({
        name: 'Unauthorized Schedule',
        lines: [{ day: 'MONDAY', startTime: '09:00', endTime: '17:00', breakMinutes: 60 }],
      }),
    });
    if (res.status === 403) {
      logPass('POST /api/working-schedules blocks EMPLOYEE role (403 Forbidden)');
    } else {
      throw new Error(`Expected 403, got ${res.status}`);
    }
  } catch (err) {
    logFail('RBAC check for schedule creation failed', err);
  }

  // 4. POST /api/working-schedules - Validation: duplicate days rejection
  try {
    const res = await request('/working-schedules', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
      body: JSON.stringify({
        name: 'Duplicate Day Schedule',
        lines: [
          { day: 'MONDAY', startTime: '09:00', endTime: '13:00', breakMinutes: 0 },
          { day: 'MONDAY', startTime: '14:00', endTime: '18:00', breakMinutes: 0 },
        ],
      }),
    });
    if (res.status === 400 && res.body?.error?.code === 'DUPLICATE_SCHEDULE_DAY') {
      logPass('POST /api/working-schedules rejects duplicate days in same schedule (400)');
    } else {
      throw new Error(`Expected 400 DUPLICATE_SCHEDULE_DAY, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('Duplicate day validation test failed', err);
  }

  // 5. POST /api/working-schedules - Validation: breakMinutes exceeding shift
  try {
    const res = await request('/working-schedules', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
      body: JSON.stringify({
        name: 'Invalid Break Schedule',
        lines: [
          { day: 'MONDAY', startTime: '09:00', endTime: '10:00', breakMinutes: 60 },
        ],
      }),
    });
    if (res.status === 400 && res.body?.error?.code === 'INVALID_BREAK_DURATION') {
      logPass('POST /api/working-schedules rejects break time >= shift duration (400)');
    } else {
      throw new Error(`Expected 400 INVALID_BREAK_DURATION, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('Invalid break duration validation test failed', err);
  }

  // 6. POST /api/working-schedules - Successful Creation with weekly hours calculation
  // 5 days: Mon-Fri 09:00 - 17:30 with 30 min break = 8 hrs/day * 5 days = 40 hrs/week
  try {
    const res = await request('/working-schedules', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
      body: JSON.stringify({
        name: `Engineering 40h Shift ${Date.now()}`,
        type: 'FULL_TIME',
        lines: [
          { day: 'MONDAY', startTime: '09:00', endTime: '17:30', breakMinutes: 30 },
          { day: 'TUESDAY', startTime: '09:00', endTime: '17:30', breakMinutes: 30 },
          { day: 'WEDNESDAY', startTime: '09:00', endTime: '17:30', breakMinutes: 30 },
          { day: 'THURSDAY', startTime: '09:00', endTime: '17:30', breakMinutes: 30 },
          { day: 'FRIDAY', startTime: '09:00', endTime: '17:30', breakMinutes: 30 },
        ],
      }),
    });
    if (res.status === 201 && res.body?.data?.id) {
      createdScheduleId = res.body.data.id;
      if (res.body.data.weeklyHours === 40 && res.body.data.daysPerWeek === 5) {
        logPass(`POST /api/working-schedules created schedule correctly with weeklyHours: 40`);
      } else {
        throw new Error(`Expected weeklyHours: 40, got ${res.body.data.weeklyHours}`);
      }
    } else {
      throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('Schedule creation test failed', err);
  }

  // 7. GET /api/working-schedules/:id
  try {
    const res = await request(`/working-schedules/${createdScheduleId}`, {
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });
    if (res.status === 200 && res.body?.data?.id === createdScheduleId) {
      logPass('GET /api/working-schedules/:id retrieves created schedule details');
    } else {
      throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('GET /api/working-schedules/:id failed', err);
  }

  // 8. PATCH /api/working-schedules/:id - Update name and modify schedule lines (3 days, 24h)
  try {
    const res = await request(`/working-schedules/${createdScheduleId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
      body: JSON.stringify({
        name: 'Part-Time 24h Shift Updated',
        type: 'PART_TIME',
        lines: [
          { day: 'MONDAY', startTime: '09:00', endTime: '17:00', breakMinutes: 0 },
          { day: 'WEDNESDAY', startTime: '09:00', endTime: '17:00', breakMinutes: 0 },
          { day: 'FRIDAY', startTime: '09:00', endTime: '17:00', breakMinutes: 0 },
        ],
      }),
    });
    if (res.status === 200 && res.body?.data?.weeklyHours === 24 && res.body.data.daysPerWeek === 3) {
      logPass('PATCH /api/working-schedules/:id updated lines and recomputed weeklyHours to 24');
    } else {
      throw new Error(`Expected 24h, got ${res.body?.data?.weeklyHours}: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('PATCH /api/working-schedules/:id failed', err);
  }

  // Summary
  console.log('\n------------------------------------------------------');
  console.log(`Working Schedules Tests: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('------------------------------------------------------\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests();
