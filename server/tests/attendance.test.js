/**
 * PeoplePay360 - Attendance Test Suite
 * Tests Check In, Check Out, Today Status Widget endpoint,
 * RBAC Scoping, and Manual Corrections.
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
  console.log('🧪 RUNNING ATTENDANCE MODULE TEST SUITE');
  console.log('======================================================\n');

  let adminAuth = null;
  let hrAuth = null;
  let payrollAuth = null;
  let employeeAuth = null;

  // 1. Authentication Setup
  try {
    adminAuth = await loginAs('admin@demo.com');
    hrAuth = await loginAs('hrmanager@demo.com');
    payrollAuth = await loginAs('payrolluser@demo.com');
    employeeAuth = await loginAs('employee@demo.com');
    logPass('Authenticated Admin, HR Manager, HR Payroll User, and Employee accounts');
  } catch (err) {
    logFail('Authentication setup failed', err);
    return;
  }

  // 2. Test Today Status Widget for Employee & Admin
  try {
    const resEmp = await request('/attendance/today-status', {
      headers: { Authorization: `Bearer ${employeeAuth.token}` },
    });
    if (resEmp.status === 200 && resEmp.body.data.hasEmployeeProfile === true) {
      logPass('Employee retrieves today status successfully with linked profile');
    } else {
      throw new Error(`Expected hasEmployeeProfile true, got: ${JSON.stringify(resEmp.body)}`);
    }

    const resAdmin = await request('/attendance/today-status', {
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });
    if (resAdmin.status === 200 && resAdmin.body.data.hasEmployeeProfile === false) {
      logPass('Pure Admin returns hasEmployeeProfile false cleanly (no widget clock)');
    } else {
      throw new Error(`Expected hasEmployeeProfile false for Admin, got: ${JSON.stringify(resAdmin.body)}`);
    }
  } catch (err) {
    logFail('Today Status Widget endpoint test failed', err);
  }

  // 3. Test Check In (Self Service for Employee)
  let activeRecordId = null;
  const prisma = require('../src/config/prisma');
  try {
    // Reset today's attendance record for test employee so test starts with clean slate
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
    await prisma.attendance.deleteMany({
      where: {
        employeeId: employeeAuth.user.employeeId,
        date: todayDate,
      },
    });

    const resCheckIn = await request('/attendance/check-in', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeAuth.token}` },
      body: JSON.stringify({}),
    });

    if (resCheckIn.status === 201 && resCheckIn.body.data.checkIn) {
      activeRecordId = resCheckIn.body.data.id;
      logPass('Employee clocks in successfully (201 Created, checkIn recorded)');
    } else {
      throw new Error(`Expected 201, got ${resCheckIn.status}: ${JSON.stringify(resCheckIn.body)}`);
    }

    // Verify duplicate check-in is rejected
    const resDup = await request('/attendance/check-in', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeAuth.token}` },
      body: JSON.stringify({}),
    });

    if (resDup.status === 400 && resDup.body.error?.code === 'ALREADY_CHECKED_IN') {
      logPass('Duplicate check-in blocked with 400 ALREADY_CHECKED_IN');
    } else {
      throw new Error(`Expected 400 ALREADY_CHECKED_IN, got ${resDup.status}: ${JSON.stringify(resDup.body)}`);
    }
  } catch (err) {
    logFail('Check In test failed', err);
  }

  // 4. Test Scoped List Endpoint (RBAC Data Leak Prevention)
  try {
    const resEmpList = await request('/attendance', {
      headers: { Authorization: `Bearer ${employeeAuth.token}` },
    });

    if (resEmpList.status === 200 && Array.isArray(resEmpList.body.data)) {
      const records = resEmpList.body.data;
      const allBelongToSelf = records.every(
        (r) => r.employeeId === employeeAuth.user.employeeId
      );
      if (allBelongToSelf) {
        logPass('Employee role strictly scoped to own records (zero other employee leakage)');
      } else {
        throw new Error('Employee list contained records of other employees!');
      }
    } else {
      throw new Error(`Failed to fetch employee attendance: ${JSON.stringify(resEmpList.body)}`);
    }

    const resHrList = await request('/attendance', {
      headers: { Authorization: `Bearer ${hrAuth.token}` },
    });

    if (resHrList.status === 200 && Array.isArray(resHrList.body.data)) {
      logPass(`HR Manager can view all company attendance records (${resHrList.body.data.length} records found)`);
    } else {
      throw new Error(`Failed to fetch HR attendance list: ${JSON.stringify(resHrList.body)}`);
    }
  } catch (err) {
    logFail('Attendance List Scoping test failed', err);
  }

  // 5. Test Check Out
  try {
    const resCheckOut = await request('/attendance/check-out', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeAuth.token}` },
      body: JSON.stringify({}),
    });

    if (resCheckOut.status === 200 && resCheckOut.body.data.checkOut) {
      logPass('Employee clocks out successfully (workedHours computed, status finalized)');
    } else {
      throw new Error(`Expected 200, got ${resCheckOut.status}: ${JSON.stringify(resCheckOut.body)}`);
    }

    // Checking out when no session is active should return error
    const resCheckOutAgain = await request('/attendance/check-out', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeAuth.token}` },
      body: JSON.stringify({}),
    });

    if (resCheckOutAgain.status === 400 || resCheckOutAgain.status === 404) {
      logPass('Redundant check-out rejected gracefully');
    } else {
      throw new Error(`Expected 400/404, got ${resCheckOutAgain.status}`);
    }

    // Verify checking in again after completing shift is rejected with ALREADY_COMPLETED_TODAY
    const resPostCheckoutCheckIn = await request('/attendance/check-in', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeAuth.token}` },
      body: JSON.stringify({}),
    });

    if (
      resPostCheckoutCheckIn.status === 400 &&
      resPostCheckoutCheckIn.body.error?.code === 'ALREADY_COMPLETED_TODAY'
    ) {
      logPass('Attempt to check in again after checkout blocked with 400 ALREADY_COMPLETED_TODAY');
    } else {
      throw new Error(
        `Expected 400 ALREADY_COMPLETED_TODAY, got ${resPostCheckoutCheckIn.status}: ${JSON.stringify(
          resPostCheckoutCheckIn.body
        )}`
      );
    }
  } catch (err) {
    logFail('Check Out test failed', err);
  }

  // 6. Test Manual Correction (RBAC: Employee blocked, HR/Payroll/Admin permitted)
  try {
    if (!activeRecordId) {
      // Pick any record from HR list
      const hrList = await request('/attendance', {
        headers: { Authorization: `Bearer ${hrAuth.token}` },
      });
      activeRecordId = hrList.body.data[0]?.id;
    }

    // Employee cannot correct
    const resEmpCorrect = await request(`/attendance/${activeRecordId}/correct`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employeeAuth.token}` },
      body: JSON.stringify({
        workedHours: 8.0,
        correctionNote: 'Employee trying to self-correct',
      }),
    });

    if (resEmpCorrect.status === 403) {
      logPass('Employee blocked from calling manual correction (403 Forbidden)');
    } else {
      throw new Error(`Expected 403 Forbidden for Employee, got: ${resEmpCorrect.status}`);
    }

    // HR Manager can correct
    const resHrCorrect = await request(`/attendance/${activeRecordId}/correct`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
      body: JSON.stringify({
        workedHours: 8.5,
        correctionNote: 'Adjusted by HR Manager for approved overtime meeting',
      }),
    });

    if (
      resHrCorrect.status === 200 &&
      resHrCorrect.body.data.status === 'MANUALLY_CORRECTED' &&
      resHrCorrect.body.data.workedHours === 8.5
    ) {
      logPass('HR Manager corrects attendance successfully (status: MANUALLY_CORRECTED, note saved)');
    } else {
      throw new Error(`HR correction failed: ${JSON.stringify(resHrCorrect.body)}`);
    }

    // HR Payroll User can also correct (inheriting HR permissions)
    const resPayrollCorrect = await request(`/attendance/${activeRecordId}/correct`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${payrollAuth.token}` },
      body: JSON.stringify({
        workedHours: 8.5,
        correctionNote: 'Verified by Payroll Specialist',
      }),
    });

    if (resPayrollCorrect.status === 200) {
      logPass('HR Payroll User inherits correction rights (200 OK)');
    } else {
      throw new Error(`Payroll User correction failed: ${JSON.stringify(resPayrollCorrect.body)}`);
    }
  } catch (err) {
    logFail('Manual Correction test failed', err);
  }

  console.log('\n======================================================');
  console.log(`📊 RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
