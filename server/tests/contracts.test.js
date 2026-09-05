/**
 * PeoplePay360 - Contract Module Test Suite
 * Tests RBAC, Contract Creation, Overlap Validation (Key Business Rule #1),
 * Auto-transition to EXPIRED, and Lifecycle Management.
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';
const prisma = require('../src/config/prisma');

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
  console.log('🧪 RUNNING CONTRACT MODULE TEST SUITE');
  console.log('======================================================\n');

  let adminAuth = null;
  let hrAuth = null;
  let payrollAuth = null;
  let employeeAuth = null;

  // 1. Authentication
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

  // 2. Lookup Metadata Endpoint
  let salaryStructureId = null;
  let workingScheduleId = null;
  try {
    const res = await request('/contracts/meta/lookup', {
      headers: { Authorization: `Bearer ${hrAuth.token}` },
    });
    if (res.status === 200 && res.body?.data?.salaryStructures?.length > 0) {
      salaryStructureId = res.body.data.salaryStructures[0].id;
      workingScheduleId = res.body.data.workingSchedules[0]?.id || null;
      logPass('Lookup metadata endpoint returned active salary structures & working schedules');
    } else {
      throw new Error(`Expected salaryStructures in lookup options, got: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('Lookup options failed', err);
  }

  // 3. RBAC: List Contracts
  try {
    // HR Manager can list
    const resHr = await request('/contracts', {
      headers: { Authorization: `Bearer ${hrAuth.token}` },
    });
    if (resHr.status === 200 && Array.isArray(resHr.body.data)) {
      logPass(`HR Manager listed contracts successfully (${resHr.body.data.length} found)`);
    } else {
      throw new Error(`Expected HR Manager to list contracts, got status ${resHr.status}`);
    }

    // HR Payroll User can list
    const resPayroll = await request('/contracts', {
      headers: { Authorization: `Bearer ${payrollAuth.token}` },
    });
    if (resPayroll.status === 200) {
      logPass('HR Payroll User can view contracts (read-only privilege verified)');
    } else {
      throw new Error(`Expected HR Payroll User to list contracts, got status ${resPayroll.status}`);
    }

    // Employee is blocked (403 Forbidden)
    const resEmp = await request('/contracts', {
      headers: { Authorization: `Bearer ${employeeAuth.token}` },
    });
    if (resEmp.status === 403) {
      logPass('Employee strictly blocked from accessing contracts (403 Forbidden)');
    } else {
      throw new Error(`Expected 403 for Employee, got ${resEmp.status}`);
    }
  } catch (err) {
    logFail('RBAC list contracts test failed', err);
  }

  // 4. Create Contract in DRAFT status
  let draftContractId = null;
  try {
    const res = await request('/contracts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
      body: JSON.stringify({
        employeeId: employeeAuth.user.employeeId,
        salaryStructureId,
        workingScheduleId,
        startDate: '2027-01-01',
        endDate: '2027-12-31',
        wage: 75000,
      }),
    });

    if (
      res.status === 201 &&
      res.body.data?.status === 'DRAFT' &&
      res.body.data?.wage === 75000 &&
      /^CON\/\d{4}\/\d{3,}$/.test(res.body.data?.reference)
    ) {
      draftContractId = res.body.data.id;
      logPass(
        `HR Manager created contract in DRAFT status with unique code ${res.body.data.reference} (201 Created)`
      );
    } else {
      throw new Error(`Failed to create contract or missing reference: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('Contract creation test failed', err);
  }

  // 5. Validation: Reject invalid date range (endDate < startDate and endDate === startDate)
  try {
    const resEarlier = await request('/contracts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
      body: JSON.stringify({
        employeeId: employeeAuth.user.employeeId,
        salaryStructureId,
        startDate: '2027-05-01',
        endDate: '2027-04-01',
        wage: 50000,
      }),
    });

    const resSingleDay = await request('/contracts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
      body: JSON.stringify({
        employeeId: employeeAuth.user.employeeId,
        salaryStructureId,
        startDate: '2027-05-01',
        endDate: '2027-05-01',
        wage: 50000,
      }),
    });

    if (resEarlier.status === 400 && resSingleDay.status === 400) {
      logPass(
        'Validation correctly rejected both endDate < startDate and single-day contracts (endDate === startDate) (400 Bad Request)'
      );
    } else {
      throw new Error(
        `Expected 400 for invalid/single-day dates, got resEarlier=${resEarlier.status}, resSingleDay=${resSingleDay.status}`
      );
    }
  } catch (err) {
    logFail('Date range validation test failed', err);
  }

  // 6. RBAC: Write protection for HR Payroll User & Employee
  try {
    const resPayrollCreate = await request('/contracts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${payrollAuth.token}` },
      body: JSON.stringify({
        employeeId: employeeAuth.user.employeeId,
        salaryStructureId,
        startDate: '2027-01-01',
        wage: 60000,
      }),
    });

    if (resPayrollCreate.status === 403) {
      logPass('HR Payroll User blocked from creating contracts (403 Forbidden)');
    } else {
      throw new Error(`Expected 403 for HR Payroll User create, got ${resPayrollCreate.status}`);
    }
  } catch (err) {
    logFail('Write protection test failed', err);
  }

  // 7. Key Business Rule #1: Overlap Check (409 CONTRACT_OVERLAP)
  // Alex Rivera currently has a RUNNING contract starting 2026-01-01 with endDate null.
  // Creating and trying to activate a contract with an overlapping start date must fail with 409 CONTRACT_OVERLAP.
  let overlappingDraftId = null;
  try {
    const resDraft = await request('/contracts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
      body: JSON.stringify({
        employeeId: employeeAuth.user.employeeId,
        salaryStructureId,
        startDate: '2026-07-01',
        endDate: '2026-12-31',
        wage: 80000,
      }),
    });

    if (resDraft.status === 201) {
      overlappingDraftId = resDraft.body.data.id;
    }

    const resActivate = await request(`/contracts/${overlappingDraftId}/activate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
    });

    if (
      resActivate.status === 409 &&
      resActivate.body?.error?.code === 'CONTRACT_OVERLAP' &&
      resActivate.body?.error?.details?.conflictingContractId
    ) {
      logPass(
        'Key Business Rule #1 enforced: Overlapping contract activation blocked with 409 CONTRACT_OVERLAP'
      );
    } else {
      throw new Error(`Expected 409 CONTRACT_OVERLAP, got: ${JSON.stringify(resActivate.body)}`);
    }
  } catch (err) {
    logFail('Contract overlap check test failed', err);
  } finally {
    if (overlappingDraftId) {
      await prisma.contract.delete({ where: { id: overlappingDraftId } }).catch(() => {});
    }
  }

  // 8. Auto-Transition to EXPIRED when activating a successive contract
  // Uses an isolated temporary employee so demo users remain untouched
  let tempEmployee = null;
  try {
    tempEmployee = await prisma.employee.create({
      data: {
        firstName: 'AutoExpire',
        lastName: 'TestUser',
        email: `autoexpire_${Date.now()}@ephemeral.test`,
      },
    });

    // Contract A: 2024-01-01 to 2024-12-31 (RUNNING)
    const contractA = await prisma.contract.create({
      data: {
        employeeId: tempEmployee.id,
        salaryStructureId,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        wage: 60000,
        status: 'RUNNING',
      },
    });

    // Contract B: 2025-01-01 to 2025-12-31 (DRAFT)
    const resContractB = await request('/contracts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
      body: JSON.stringify({
        employeeId: tempEmployee.id,
        salaryStructureId,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        wage: 70000,
      }),
    });

    const contractBId = resContractB.body?.data?.id;

    // Activate Contract B
    const resActivateB = await request(`/contracts/${contractBId}/activate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
    });

    if (resActivateB.status === 200 && resActivateB.body?.data?.status === 'RUNNING') {
      // Check if Contract A auto-transitioned to EXPIRED
      const updatedContractA = await prisma.contract.findUnique({
        where: { id: contractA.id },
      });

      if (updatedContractA.status === 'EXPIRED') {
        logPass(
          'Auto-transition successful: Activating Contract B transitioned preceding Contract A to EXPIRED'
        );
      } else {
        throw new Error(`Expected Contract A to be EXPIRED, found ${updatedContractA.status}`);
      }
    } else {
      throw new Error(`Failed to activate Contract B: ${JSON.stringify(resActivateB.body)}`);
    }
  } catch (err) {
    logFail('Auto-transition to EXPIRED test failed', err);
  } finally {
    if (tempEmployee) {
      await prisma.contract.deleteMany({ where: { employeeId: tempEmployee.id } }).catch(() => {});
      await prisma.employee.delete({ where: { id: tempEmployee.id } }).catch(() => {});
    }
  }

  // 9. Contract Cancellation
  try {
    if (draftContractId) {
      const resCancel = await request(`/contracts/${draftContractId}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${hrAuth.token}` },
      });

      if (resCancel.status === 200 && resCancel.body?.data?.status === 'CANCELLED') {
        logPass('Contract cancelled successfully (status: CANCELLED)');
      } else {
        throw new Error(`Expected status CANCELLED, got: ${JSON.stringify(resCancel.body)}`);
      }
    }
  } catch (err) {
    logFail('Contract cancellation test failed', err);
  }

  // 10. Soft Delete / Archive Contract
  try {
    if (draftContractId) {
      const resDelete = await request(`/contracts/${draftContractId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${hrAuth.token}` },
      });

      if (resDelete.status === 200 && resDelete.body?.success === true) {
        logPass('Contract archived successfully (isArchived: true soft delete)');
      } else {
        throw new Error(`Expected 200 soft delete, got: ${JSON.stringify(resDelete.body)}`);
      }
    }
  } catch (err) {
    logFail('Contract soft delete test failed', err);
  }

  console.log('\n======================================================');
  console.log(`📊 RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().finally(() => prisma.$disconnect());
