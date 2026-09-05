/**
 * PeoplePay360 - Salary Structure & Salary Rule Setup Test Suite (Feature 8 [MUST])
 * Tests:
 * 1. RBAC (Admin/HR Payroll Manager full CRUD, HR Payroll User read-only, HR Manager & Employee 403 Forbidden)
 * 2. Structure Creation & Name Uniqueness (409 DUPLICATE_STRUCTURE_NAME)
 * 3. Fixed vs Percentage Rule Creation
 * 4. Key Business Rule #3: Deterministic Sequencing (Sequence_base < Sequence_this -> 400 INVALID_RULE_SEQUENCE)
 * 5. Unique sequence within structure (409 DUPLICATE_SEQUENCE)
 * 6. Unique code within structure (409 DUPLICATE_CODE)
 * 7. Rule deletion dependency guard (cannot delete rule if other rules depend on it)
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
  console.log('🧪 RUNNING SALARY STRUCTURE & RULES TEST SUITE');
  console.log('======================================================\n');

  let adminAuth = null;
  let payrollManagerAuth = null;
  let payrollUserAuth = null;
  let hrManagerAuth = null;
  let employeeAuth = null;

  // 1. Authentication
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

  // 2. Strict RBAC: HR Manager and Employee must receive 403 Forbidden
  try {
    const resHrManager = await request('/salary-structures', {
      headers: { Authorization: `Bearer ${hrManagerAuth.token}` },
    });
    const resEmployee = await request('/salary-structures', {
      headers: { Authorization: `Bearer ${employeeAuth.token}` },
    });

    if (resHrManager.status === 403 && resEmployee.status === 403) {
      logPass('Strict RBAC: HR Manager and Employee are forbidden from accessing Salary Structures (403)');
    } else {
      throw new Error(`Expected 403 for HR Manager & Employee, got HR=${resHrManager.status}, Emp=${resEmployee.status}`);
    }
  } catch (err) {
    logFail('RBAC forbidden check failed', err);
  }

  // 3. Strict RBAC: HR Payroll User is Read-Only
  try {
    const resRead = await request('/salary-structures', {
      headers: { Authorization: `Bearer ${payrollUserAuth.token}` },
    });
    const resWrite = await request('/salary-structures', {
      method: 'POST',
      headers: { Authorization: `Bearer ${payrollUserAuth.token}` },
      body: JSON.stringify({ name: 'Unauthorized Structure' }),
    });

    if (resRead.status === 200 && resWrite.status === 403) {
      logPass('Strict RBAC: HR Payroll User has read-only access (200 OK on GET, 403 Forbidden on POST)');
    } else {
      throw new Error(`Expected 200 for GET and 403 for POST, got GET=${resRead.status}, POST=${resWrite.status}`);
    }
  } catch (err) {
    logFail('HR Payroll User read-only check failed', err);
  }

  // 4. Create Salary Structure (by HR Payroll Manager)
  let testStructureId = null;
  const uniqueStructureName = `Test Structure ${Date.now()}`;
  try {
    const res = await request('/salary-structures', {
      method: 'POST',
      headers: { Authorization: `Bearer ${payrollManagerAuth.token}` },
      body: JSON.stringify({ name: uniqueStructureName, isActive: true }),
    });

    if (res.status === 201 && res.body?.data?.id && res.body?.data?.name === uniqueStructureName) {
      testStructureId = res.body.data.id;
      logPass(`HR Payroll Manager created new Salary Structure '${uniqueStructureName}' (201 Created)`);
    } else {
      throw new Error(`Failed to create structure: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('Structure creation test failed', err);
  }

  // 5. Structure Listing & Metrics
  try {
    const res = await request('/salary-structures', {
      headers: { Authorization: `Bearer ${payrollManagerAuth.token}` },
    });

    const found = res.body?.data?.find((s) => s.id === testStructureId);
    if (res.status === 200 && found && typeof found.rulesCount === 'number' && typeof found.contractCount === 'number') {
      logPass('Salary structure list returns accurate metrics (rulesCount, contractCount)');
    } else {
      throw new Error(`Expected structure with metrics, got: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('Structure listing metrics test failed', err);
  }

  // 6. Name Uniqueness Check (409 Conflict)
  try {
    const resDuplicate = await request('/salary-structures', {
      method: 'POST',
      headers: { Authorization: `Bearer ${payrollManagerAuth.token}` },
      body: JSON.stringify({ name: uniqueStructureName }),
    });

    if (resDuplicate.status === 409 && resDuplicate.body?.error?.code === 'DUPLICATE_STRUCTURE_NAME') {
      logPass('Duplicate structure name rejected with 409 DUPLICATE_STRUCTURE_NAME');
    } else {
      throw new Error(`Expected 409 DUPLICATE_STRUCTURE_NAME, got ${resDuplicate.status}`);
    }
  } catch (err) {
    logFail('Duplicate structure name test failed', err);
  }

  // 7. Create Fixed Salary Rule: BASIC (Sequence 10)
  let basicRuleId = null;
  try {
    const resBasic = await request(`/salary-structures/${testStructureId}/rules`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${payrollManagerAuth.token}` },
      body: JSON.stringify({
        name: 'Basic Salary',
        code: 'BASIC',
        category: 'BASIC',
        sequence: 10,
        computationMethod: 'FIXED',
        fixedAmount: 50000,
      }),
    });

    if (resBasic.status === 201 && resBasic.body?.data?.code === 'BASIC' && resBasic.body?.data?.sequence === 10) {
      basicRuleId = resBasic.body.data.id;
      logPass('Created FIXED salary rule: BASIC (sequence: 10, fixedAmount: 50000)');
    } else {
      throw new Error(`Failed to create basic rule: ${JSON.stringify(resBasic.body)}`);
    }
  } catch (err) {
    logFail('Fixed rule creation test failed', err);
  }

  // 8. Key Business Rule #3: Forward Sequence Dependency Rejection (Sequence_base >= Sequence_this)
  try {
    // Attempt to create a percentage rule at sequence 5 referencing BASIC (which has sequence 10)
    const resInvalidSeq = await request(`/salary-structures/${testStructureId}/rules`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${payrollManagerAuth.token}` },
      body: JSON.stringify({
        name: 'Premature HRA',
        code: 'PRE_HRA',
        category: 'ALLOWANCE',
        sequence: 5, // 5 < 10 (baseRule.sequence), VIOLATES Key Business Rule #3!
        computationMethod: 'PERCENTAGE',
        percentage: 40,
        baseRuleId: basicRuleId,
      }),
    });

    if (resInvalidSeq.status === 400 && resInvalidSeq.body?.error?.code === 'INVALID_RULE_SEQUENCE') {
      logPass(
        'Key Business Rule #3 Enforced: Percentage rule referencing a higher-sequence base rule rejected (400 INVALID_RULE_SEQUENCE)'
      );
    } else {
      throw new Error(
        `Expected 400 INVALID_RULE_SEQUENCE, got ${resInvalidSeq.status}: ${JSON.stringify(resInvalidSeq.body)}`
      );
    }
  } catch (err) {
    logFail('Key Business Rule #3 sequence check failed', err);
  }

  // 9. Valid Percentage Salary Rule: HRA (Sequence 20, 40% of BASIC)
  let hraRuleId = null;
  try {
    const resHra = await request(`/salary-structures/${testStructureId}/rules`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${payrollManagerAuth.token}` },
      body: JSON.stringify({
        name: 'House Rent Allowance',
        code: 'HRA',
        category: 'ALLOWANCE',
        sequence: 20, // 20 > 10 (baseRule.sequence), VALID!
        computationMethod: 'PERCENTAGE',
        percentage: 40,
        baseRuleId: basicRuleId,
      }),
    });

    if (resHra.status === 201 && resHra.body?.data?.code === 'HRA' && resHra.body?.data?.sequence === 20) {
      hraRuleId = resHra.body.data.id;
      logPass('Created valid PERCENTAGE rule: HRA (sequence: 20, 40% of BASIC sequence 10)');
    } else {
      throw new Error(`Failed to create HRA rule: ${JSON.stringify(resHra.body)}`);
    }
  } catch (err) {
    logFail('Percentage rule creation test failed', err);
  }

  // 10. Duplicate Sequence Rejection (409 DUPLICATE_SEQUENCE)
  try {
    const resDupSeq = await request(`/salary-structures/${testStructureId}/rules`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${payrollManagerAuth.token}` },
      body: JSON.stringify({
        name: 'Duplicate Sequence Rule',
        code: 'DUP_SEQ',
        category: 'ALLOWANCE',
        sequence: 20, // 20 is already used by HRA
        computationMethod: 'FIXED',
        fixedAmount: 1000,
      }),
    });

    if (resDupSeq.status === 409 && resDupSeq.body?.error?.code === 'DUPLICATE_SEQUENCE') {
      logPass('Duplicate sequence within structure rejected with 409 DUPLICATE_SEQUENCE');
    } else {
      throw new Error(`Expected 409 DUPLICATE_SEQUENCE, got ${resDupSeq.status}: ${JSON.stringify(resDupSeq.body)}`);
    }
  } catch (err) {
    logFail('Duplicate sequence test failed', err);
  }

  // 11. Duplicate Code Rejection (409 DUPLICATE_CODE)
  try {
    const resDupCode = await request(`/salary-structures/${testStructureId}/rules`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${payrollManagerAuth.token}` },
      body: JSON.stringify({
        name: 'Duplicate Basic Code',
        code: 'BASIC', // Already used
        category: 'BASIC',
        sequence: 99,
        computationMethod: 'FIXED',
        fixedAmount: 1000,
      }),
    });

    if (resDupCode.status === 409 && resDupCode.body?.error?.code === 'DUPLICATE_CODE') {
      logPass('Duplicate rule code within structure rejected with 409 DUPLICATE_CODE');
    } else {
      throw new Error(`Expected 409 DUPLICATE_CODE, got ${resDupCode.status}: ${JSON.stringify(resDupCode.body)}`);
    }
  } catch (err) {
    logFail('Duplicate code test failed', err);
  }

  // 12. Rule Dependency Guard on Deletion
  try {
    // Attempting to delete BASIC while HRA depends on it must fail
    const resDeleteBasic = await request(`/salary-rules/${basicRuleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${payrollManagerAuth.token}` },
    });

    if (resDeleteBasic.status === 400 && resDeleteBasic.body?.error?.code === 'RULE_HAS_DEPENDENTS') {
      logPass('Dependency guard prevented deleting base rule that other percentage rules depend on (400 RULE_HAS_DEPENDENTS)');
    } else {
      throw new Error(`Expected 400 RULE_HAS_DEPENDENTS, got ${resDeleteBasic.status}: ${JSON.stringify(resDeleteBasic.body)}`);
    }
  } catch (err) {
    logFail('Rule dependency deletion guard test failed', err);
  }

  // 13. Cleanup test structure & rules
  try {
    if (testStructureId) {
      await prisma.salaryRule.deleteMany({ where: { salaryStructureId: testStructureId } });
      await prisma.salaryStructure.delete({ where: { id: testStructureId } });
      logPass('Cleaned up test salary structure and rules');
    }
  } catch (e) {
    // Ignore cleanup error
  }

  console.log('\n======================================================');
  console.log(`📊 RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().finally(() => prisma.$disconnect());
