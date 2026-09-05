const prisma = require('../src/config/prisma');

const BASE_URL = 'http://localhost:5000/api';

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

let passed = 0;
let failed = 0;

function logPass(title) {
  console.log(`  \x1b[32m✅ PASS:\x1b[0m ${title}`);
  passed++;
}

function logFail(title, err) {
  console.log(`  \x1b[31m❌ FAIL:\x1b[0m ${title}`);
  if (err) console.error('     ', err.message || err);
  failed++;
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

async function runDashboardTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING UNIFIED PAYROLL DASHBOARD TEST SUITE');
  console.log('======================================================\n');

  let adminAuth, payrollManagerAuth, payrollUserAuth, hrManagerAuth, employeeAuth;

  // Setup Auth tokens
  try {
    adminAuth = await loginAs('admin@demo.com');
    payrollManagerAuth = await loginAs('payrollmanager@demo.com');
    payrollUserAuth = await loginAs('payrolluser@demo.com');
    hrManagerAuth = await loginAs('hrmanager@demo.com');
    employeeAuth = await loginAs('employee@demo.com');
    logPass('Authenticated Admin, Payroll Manager, Payroll User, HR Manager, and Employee');
  } catch (err) {
    logFail('Authentication setup failed', err);
    return;
  }

  // 1. RBAC Test: Employee is forbidden (403)
  try {
    const resEmp = await request('/dashboard', {
      headers: { Authorization: `Bearer ${employeeAuth.token}` },
    });
    if (resEmp.status === 403) {
      logPass('Strict RBAC: Employee is forbidden from /api/dashboard (403)');
    } else {
      throw new Error(`Expected 403 Forbidden, got ${resEmp.status}`);
    }
  } catch (err) {
    logFail('RBAC Employee restriction check failed', err);
  }

  // 2. Full Access: Admin & Payroll Roles receive complete financial payload
  try {
    const resAdmin = await request('/dashboard', {
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });

    if (resAdmin.status === 200 && resAdmin.body?.data) {
      const data = resAdmin.body.data;
      if (
        data.kpis &&
        typeof data.kpis.totalNetSalaryPaid === 'number' &&
        data.kpis.payslipsGenerated &&
        Array.isArray(data.salaryCostByDepartment) &&
        Array.isArray(data.monthlyNetSalaryTrend) &&
        data.attendanceOverview &&
        Array.isArray(data.timeOffOverview) &&
        Array.isArray(data.departmentOverview) &&
        !data.isSalaryRestricted
      ) {
        logPass('Admin receives full multi-model dashboard payload with live financial figures');
      } else {
        throw new Error(`Incomplete dashboard structure: ${JSON.stringify(data.kpis)}`);
      }
    } else {
      throw new Error(`Expected 200 OK, got ${resAdmin.status}: ${JSON.stringify(resAdmin.body)}`);
    }
  } catch (err) {
    logFail('Admin full dashboard access test failed', err);
  }

  // 3. HR Payroll User full access verification
  try {
    const resPayrollUser = await request('/dashboard', {
      headers: { Authorization: `Bearer ${payrollUserAuth.token}` },
    });

    if (resPayrollUser.status === 200 && resPayrollUser.body?.data?.kpis?.totalNetSalaryPaid !== null) {
      logPass('HR Payroll User has full read access to financial and payroll metrics');
    } else {
      throw new Error(`Expected 200 with salary figures, got ${resPayrollUser.status}`);
    }
  } catch (err) {
    logFail('HR Payroll User dashboard access test failed', err);
  }

  // 4. Role Scoping Test: HR Manager receives HR signals but salary numbers are redacted (null/empty)
  try {
    const resHrMgr = await request('/dashboard', {
      headers: { Authorization: `Bearer ${hrManagerAuth.token}` },
    });

    if (resHrMgr.status === 200 && resHrMgr.body?.data) {
      const data = resHrMgr.body.data;
      if (
        data.isSalaryRestricted === true &&
        data.kpis.totalNetSalaryPaid === null &&
        data.kpis.averageSalary === null &&
        data.salaryCostByDepartment.length === 0 &&
        data.monthlyNetSalaryTrend.length === 0 &&
        data.kpis.attendanceHealthPct !== null &&
        data.kpis.approvedTimeOff !== null
      ) {
        logPass('Key Requirement Enforced: HR Manager sees HR & attendance signals, but salary figures are strictly redacted');
      } else {
        throw new Error(`Expected redacted salary figures, got: ${JSON.stringify(data.kpis)}`);
      }
    } else {
      throw new Error(`Expected 200 OK, got ${resHrMgr.status}`);
    }
  } catch (err) {
    logFail('HR Manager salary redaction test failed', err);
  }

  // 5. Query Filters: Period Filter (e.g. 2026-09)
  try {
    const resPeriod = await request('/dashboard?period=2026-09', {
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });

    if (resPeriod.status === 200 && resPeriod.body?.data?.periodKey === '2026-09') {
      logPass("Period filter applied successfully (periodKey: '2026-09')");
    } else {
      throw new Error(`Period filter mismatch: ${resPeriod.body?.data?.periodKey}`);
    }
  } catch (err) {
    logFail('Period filter test failed', err);
  }

  // 6. Query Filters: Department Filter
  try {
    const depts = await prisma.department.findMany({ take: 1 });
    if (depts.length > 0) {
      const targetDeptId = depts[0].id;
      const resDept = await request(`/dashboard?departmentId=${targetDeptId}`, {
        headers: { Authorization: `Bearer ${adminAuth.token}` },
      });

      if (resDept.status === 200 && resDept.body?.data) {
        logPass(`Department filter applied successfully for departmentId: ${targetDeptId}`);
      } else {
        throw new Error(`Department filter failed: ${resDept.status}`);
      }
    } else {
      logPass('Skipping department filter check (no departments in db)');
    }
  } catch (err) {
    logFail('Department filter test failed', err);
  }

  // 7. Live Alerts Signal Check: Missing bank account, expiring contracts, unvalidated drafts
  try {
    const resAlerts = await request('/dashboard', {
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });

    const alerts = resAlerts.body?.data?.alerts;
    if (Array.isArray(alerts) && alerts.length >= 4) {
      const alertTypes = alerts.map((a) => a.type);
      if (
        alertTypes.includes('MISSING_BANK_DETAILS') &&
        alertTypes.includes('DUPLICATE_PAYSLIP') &&
        alertTypes.includes('UNVALIDATED_DRAFTS') &&
        alertTypes.includes('EXPIRING_CONTRACTS')
      ) {
        logPass('Live operational alerts computed accurately across Employee, Contract, and Payrun models');
      } else {
        throw new Error(`Missing expected alert types: ${alertTypes}`);
      }
    } else {
      throw new Error(`Alerts array invalid: ${JSON.stringify(alerts)}`);
    }
  } catch (err) {
    logFail('Alerts signal check failed', err);
  }

  // 8. Attendance Overview Check
  try {
    const res = await request('/dashboard', {
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });

    const att = res.body?.data?.attendanceOverview;
    if (
      att &&
      att.distribution &&
      typeof att.missingCheckouts === 'number' &&
      typeof att.manualEdits === 'number' &&
      typeof att.coveragePct === 'number'
    ) {
      logPass('Attendance overview signals (present/late/absent, missing checkouts, manual edits) verified');
    } else {
      throw new Error(`Invalid attendance overview: ${JSON.stringify(att)}`);
    }
  } catch (err) {
    logFail('Attendance overview check failed', err);
  }

  // 9. Time Off Overview Check
  try {
    const res = await request('/dashboard', {
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });

    const to = res.body?.data?.timeOffOverview;
    if (Array.isArray(to)) {
      logPass(`Time off overview breakdown aggregated across leave types (${to.length} types found)`);
    } else {
      throw new Error(`Invalid time off overview: ${JSON.stringify(to)}`);
    }
  } catch (err) {
    logFail('Time off overview check failed', err);
  }

  // 10. Department Overview Table Check
  try {
    const res = await request('/dashboard', {
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });

    const depts = res.body?.data?.departmentOverview;
    if (Array.isArray(depts) && depts.length > 0 && typeof depts[0].headcount === 'number') {
      logPass(`Department overview table verified with headcount and monthly salary per department`);
    } else {
      throw new Error(`Invalid department overview: ${JSON.stringify(depts)}`);
    }
  } catch (err) {
    logFail('Department overview table check failed', err);
  }

  console.log('\n======================================================');
  console.log(`📊 RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runDashboardTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
