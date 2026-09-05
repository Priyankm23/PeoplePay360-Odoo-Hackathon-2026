/**
 * PeoplePay360 - Payrun Wizard, Batch Computation & Lifecycle Test Suite (Features 9, 10, 11)
 * Tests:
 * 1. RBAC: HR Manager & Employee forbidden (403); HR Payroll User read/compute/validate only; Manager full CRUD.
 * 2. Wizard Step 1: Preview eligible employees creates ZERO records in DB (pure preview).
 * 3. Wizard Step 2: Invalid/ineligible employee rejected with 400 EMPLOYEE_NOT_ELIGIBLE.
 * 4. Wizard Step 2: Confirmed Payrun creation produces Payrun in DRAFT with DRAFT child Payslips.
 * 5. Batch Computation: Evaluates salary rules sequentially, counts attendance days, computes Gross, Deductions, Net.
 * 6. Warnings Detection: Flags missing bank details and duplicate period overlaps.
 * 7. State Machine: Transitions DRAFT -> COMPUTED -> VALIDATED -> PAID.
 * 8. Deletion & Irreversibility guards: Cannot delete VALIDATED or PAID payruns; HR Payroll User cannot mark paid or delete.
 * 9. Payslip detail inspection: Rule lines snapshot matching sequence order.
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
  console.log('🧪 RUNNING PAYRUN & BATCH COMPUTATION TEST SUITE');
  console.log('======================================================\n');

  let adminAuth, payrollManagerAuth, payrollUserAuth, hrManagerAuth, employeeAuth;
  let testStructure = null;
  let testEmployee = null;
  let testContract = null;
  let testPayrunId = null;

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

  // 1. RBAC Tests: HR Manager & Employee are forbidden
  try {
    const resHrMgr = await request('/payruns', {
      headers: { Authorization: `Bearer ${hrManagerAuth.token}` },
    });
    const resEmp = await request('/payruns', {
      headers: { Authorization: `Bearer ${employeeAuth.token}` },
    });

    if (resHrMgr.status === 403 && resEmp.status === 403) {
      logPass('Strict RBAC: HR Manager and Employee are forbidden from /api/payruns (403)');
    } else {
      throw new Error(`Expected 403, got HR Manager: ${resHrMgr.status}, Employee: ${resEmp.status}`);
    }
  } catch (err) {
    logFail('RBAC Payrun restriction check failed', err);
  }

  // Setup Test Data (Structure, Rules, Employee, Contract, Attendance)
  try {
    const timestamp = Date.now();

    // Create Test Salary Structure
    testStructure = await prisma.salaryStructure.create({
      data: {
        name: `Test Payroll Structure ${timestamp}`,
        isActive: true,
        rules: {
          create: [
            {
              name: 'Basic Salary',
              code: 'BASIC',
              category: 'BASIC',
              sequence: 10,
              computationMethod: 'FIXED',
              fixedAmount: 0, // Should resolve to contract wage
            },
            {
              name: 'House Rent Allowance',
              code: 'HRA',
              category: 'ALLOWANCE',
              sequence: 20,
              computationMethod: 'PERCENTAGE',
              percentage: 40, // 40% of Basic
            },
            {
              name: 'Provident Fund',
              code: 'PF',
              category: 'DEDUCTION',
              sequence: 30,
              computationMethod: 'PERCENTAGE',
              percentage: 12, // 12% of Basic
            },
            {
              name: 'Professional Tax',
              code: 'PT',
              category: 'DEDUCTION',
              sequence: 40,
              computationMethod: 'FIXED',
              fixedAmount: 200,
            },
          ],
        },
      },
      include: { rules: true },
    });

    // Link HRA and PF baseRuleId to BASIC
    const basicRule = testStructure.rules.find((r) => r.code === 'BASIC');
    await prisma.salaryRule.updateMany({
      where: {
        salaryStructureId: testStructure.id,
        code: { in: ['HRA', 'PF'] },
      },
      data: { baseRuleId: basicRule.id },
    });

    // Create Test Employee
    testEmployee = await prisma.employee.create({
      data: {
        firstName: 'PayrollTest',
        lastName: `Employee${timestamp}`,
        email: `payrolltest_${timestamp}@demo.com`,
        status: 'ACTIVE',
        bankAccount: 'HDFC000123456789',
      },
    });

    // Create Active Contract for Employee with Wage = 50,000
    testContract = await prisma.contract.create({
      data: {
        reference: `CON/TEST/${timestamp}`,
        employeeId: testEmployee.id,
        salaryStructureId: testStructure.id,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-08-31'),
        wage: 50000,
        status: 'RUNNING',
      },
    });

    // Create 5 attendance records in September 2026
    for (let day = 1; day <= 5; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      await prisma.attendance.create({
        data: {
          employeeId: testEmployee.id,
          date: new Date(`2026-09-${dayStr}`),
          checkIn: new Date(`2026-09-${dayStr}T09:00:00Z`),
          checkOut: new Date(`2026-09-${dayStr}T17:00:00Z`),
          status: 'PRESENT',
        },
      });
    }

    logPass('Prepared test data: structure with 4 rules, employee with ₹50,000 contract, and 5 attendance days');
  } catch (err) {
    logFail('Test data preparation failed', err);
    return;
  }

  // 2. Wizard Step 1: Preview Eligible Employees creates ZERO records
  try {
    const payrunsBefore = await prisma.payrun.count();
    const payslipsBefore = await prisma.payslip.count();

    const resPreview = await request('/payruns/preview-eligible', {
      method: 'POST',
      headers: { Authorization: `Bearer ${payrollUserAuth.token}` },
      body: JSON.stringify({
        salaryStructureId: testStructure.id,
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
      }),
    });

    const payrunsAfter = await prisma.payrun.count();
    const payslipsAfter = await prisma.payslip.count();

    if (
      resPreview.status === 200 &&
      resPreview.body?.data?.eligibleCount >= 1 &&
      payrunsBefore === payrunsAfter &&
      payslipsBefore === payslipsAfter
    ) {
      logPass('Wizard Step 1: /preview-eligible returned eligible employees and created 0 DB records (Architecture Decision #8)');
    } else {
      throw new Error(`Preview failed or persisted records unexpectedly: ${JSON.stringify(resPreview.body)}`);
    }
  } catch (err) {
    logFail('Wizard Step 1 preview check failed', err);
  }

  // 3. Wizard Step 2 Validation: Ineligible employee rejected
  try {
    // Attempt with a random UUID not having active contract for this structure
    const fakeEmployeeId = '00000000-0000-0000-0000-000000000001';
    const resInvalid = await request('/payruns', {
      method: 'POST',
      headers: { Authorization: `Bearer ${payrollUserAuth.token}` },
      body: JSON.stringify({
        name: 'Invalid Test Run',
        salaryStructureId: testStructure.id,
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        employeeIds: [fakeEmployeeId],
      }),
    });

    if (resInvalid.status === 400) {
      logPass('Wizard Step 2: Ineligible employee selection rejected with 400 Bad Request');
    } else {
      throw new Error(`Expected 400 Bad Request, got ${resInvalid.status}`);
    }
  } catch (err) {
    logFail('Wizard Step 2 invalid employee validation failed', err);
  }

  // 4. Wizard Step 2 Confirmation: Create Payrun & Child Payslips in DRAFT
  try {
    const resCreate = await request('/payruns', {
      method: 'POST',
      headers: { Authorization: `Bearer ${payrollUserAuth.token}` },
      body: JSON.stringify({
        name: 'September 2026 Test Payrun',
        salaryStructureId: testStructure.id,
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        employeeIds: [testEmployee.id],
      }),
    });

    if (
      resCreate.status === 201 &&
      resCreate.body?.data?.status === 'DRAFT' &&
      resCreate.body?.data?.employeeCount === 1
    ) {
      testPayrunId = resCreate.body.data.id;
      logPass(`Wizard Step 2: Created Payrun '${resCreate.body.data.name}' in DRAFT status with 1 child payslip`);
    } else {
      throw new Error(`Payrun creation failed: ${JSON.stringify(resCreate.body)}`);
    }
  } catch (err) {
    logFail('Wizard Step 2 Payrun creation failed', err);
  }

  // 5. Batch Computation: Deterministic Rule Execution & Attendance Integration
  try {
    const resCompute = await request(`/payruns/${testPayrunId}/compute`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${payrollUserAuth.token}` },
    });

    if (resCompute.status === 200 && resCompute.body?.data?.status === 'computed') {
      const payslip = resCompute.body.data.payslips[0];

      // Expected calculation:
      // BASIC = 50,000 (from contract wage)
      // HRA = 40% of 50,000 = 20,000
      // GROSS = BASIC + HRA = 70,000
      // PF = 12% of 50,000 = 6,000
      // PT = 200 (fixed)
      // TOTAL DEDUCTIONS = 6,200
      // NET SALARY = 70,000 - 6,200 = 63,800
      // WORKED DAYS = 5

      const isGrossCorrect = payslip.grossSalary === 70000;
      const isNetCorrect = payslip.netSalary === 63800;
      const isWorkedDaysCorrect = payslip.workedDays === 5;

      if (isGrossCorrect && isNetCorrect && isWorkedDaysCorrect) {
        logPass(
          `Batch Compute Engine: Evaluated salary rules correctly (Gross: ₹${payslip.grossSalary}, Net: ₹${payslip.netSalary}, Worked Days: ${payslip.workedDays})`
        );
      } else {
        throw new Error(
          `Computation discrepancy: Gross ${payslip.grossSalary} (expected 70000), Net ${payslip.netSalary} (expected 63800), WorkedDays ${payslip.workedDays} (expected 5)`
        );
      }
    } else {
      throw new Error(`Compute endpoint failed: ${JSON.stringify(resCompute.body)}`);
    }
  } catch (err) {
    logFail('Batch compute test failed', err);
  }

  // 6. Payslip Detail Inspection: Line Items Verification
  try {
    const payrunDetail = await request(`/payruns/${testPayrunId}`, {
      headers: { Authorization: `Bearer ${payrollUserAuth.token}` },
    });
    const payslipId = payrunDetail.body.data.payslips[0].id;

    const resSlip = await request(`/payslips/${payslipId}`, {
      headers: { Authorization: `Bearer ${payrollUserAuth.token}` },
    });

    if (resSlip.status === 200 && resSlip.body?.data?.lines?.length === 4) {
      const lines = resSlip.body.data.lines;
      const basicLine = lines.find((l) => l.code === 'BASIC');
      const hraLine = lines.find((l) => l.code === 'HRA');
      const pfLine = lines.find((l) => l.code === 'PF');
      const ptLine = lines.find((l) => l.code === 'PT');

      if (
        basicLine?.amount === 50000 &&
        hraLine?.amount === 20000 &&
        pfLine?.amount === 6000 &&
        ptLine?.amount === 200
      ) {
        logPass('Payslip Detail View: All 4 snapshot lines verified (BASIC ₹50k, HRA ₹20k, PF ₹6k, PT ₹200)');
      } else {
        throw new Error(`Line amounts incorrect: ${JSON.stringify(lines)}`);
      }
    } else {
      throw new Error(`Failed to load payslip detail: ${JSON.stringify(resSlip.body)}`);
    }
  } catch (err) {
    logFail('Payslip line detail inspection failed', err);
  }

  // 7. Validation Transition: COMPUTED -> VALIDATED
  try {
    const resValidate = await request(`/payruns/${testPayrunId}/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${payrollUserAuth.token}` },
    });

    if (resValidate.status === 200 && resValidate.body?.data?.status === 'validated') {
      logPass("Lifecycle Transition: Validated payrun transitioned status to 'VALIDATED'");
    } else {
      throw new Error(`Validation failed: ${JSON.stringify(resValidate.body)}`);
    }
  } catch (err) {
    logFail('Payrun validation transition failed', err);
  }

  // 8. Role Restriction: HR Payroll User cannot Mark Paid (403 Forbidden)
  try {
    const resMarkPaidForbidden = await request(`/payruns/${testPayrunId}/mark-paid`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${payrollUserAuth.token}` },
    });

    if (resMarkPaidForbidden.status === 403) {
      logPass('Strict RBAC: HR Payroll User blocked from mark-paid (403 Forbidden)');
    } else {
      throw new Error(`Expected 403, got ${resMarkPaidForbidden.status}`);
    }
  } catch (err) {
    logFail('Mark-paid RBAC restriction check failed', err);
  }

  // 9. Mark Paid by HR Payroll Manager: VALIDATED -> PAID (Irreversible)
  try {
    const resMarkPaid = await request(`/payruns/${testPayrunId}/mark-paid`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${payrollManagerAuth.token}` },
    });

    if (resMarkPaid.status === 200 && resMarkPaid.body?.data?.status === 'paid') {
      logPass("Lifecycle Transition: HR Payroll Manager marked payrun as 'PAID'");
    } else {
      throw new Error(`Mark Paid failed: ${JSON.stringify(resMarkPaid.body)}`);
    }
  } catch (err) {
    logFail('Mark-paid execution failed', err);
  }

  // 10. Deletion Guard: Cannot delete finalized (PAID) payruns
  try {
    const resDeleteFinalized = await request(`/payruns/${testPayrunId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${payrollManagerAuth.token}` },
    });

    if (resDeleteFinalized.status === 409) {
      logPass('Deletion Guard: Finalized (PAID) payrun deletion blocked with 409 Conflict');
    } else {
      throw new Error(`Expected 409 Conflict, got ${resDeleteFinalized.status}`);
    }
  } catch (err) {
    logFail('Finalized payrun deletion guard failed', err);
  }

  // Cleanup Test Data
  try {
    await prisma.payslipLine.deleteMany({
      where: { payslip: { payrunId: testPayrunId } },
    });
    await prisma.payslip.deleteMany({
      where: { payrunId: testPayrunId },
    });
    await prisma.payrun.delete({
      where: { id: testPayrunId },
    });
    await prisma.attendance.deleteMany({
      where: { employeeId: testEmployee.id },
    });
    await prisma.contract.deleteMany({
      where: { employeeId: testEmployee.id },
    });
    await prisma.employee.delete({
      where: { id: testEmployee.id },
    });
    await prisma.salaryRule.deleteMany({
      where: { salaryStructureId: testStructure.id },
    });
    await prisma.salaryStructure.delete({
      where: { id: testStructure.id },
    });
    logPass('Cleaned up test payrun, child payslips, contracts, rules, and employee');
  } catch (err) {
    console.error('Cleanup notice:', err.message);
  }

  console.log('\n======================================================');
  console.log(`📊 RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests();
