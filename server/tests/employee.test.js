/**
 * PeoplePay360 - Employee Master Management Test Suite
 * Tests full CRUD, List & Kanban views, Role Scoping, Smart Button Badges,
 * Self-manager loop protection, Account Provisioning, and RBAC rules.
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
  console.log('🧪 RUNNING EMPLOYEE MASTER MANAGEMENT TEST SUITE');
  console.log('======================================================\n');

  let adminAuth = null;
  let hrAuth = null;
  let employeeAuth = null;
  let testDepartment = null;
  let testJobPosition = null;
  let createdEmployeeId = null;

  // Setup: Authenticate roles
  try {
    adminAuth = await loginAs('admin@demo.com');
    hrAuth = await loginAs('hrmanager@demo.com');
    employeeAuth = await loginAs('employee@demo.com');
    logPass('Setup: Authenticated Admin, HR Manager, and Employee test accounts');
  } catch (err) {
    logFail('Setup: Authenticating test accounts', err);
    return;
  }

  // 1. Department Lookup
  try {
    const res = await request('/departments', {
      headers: { Authorization: `Bearer ${hrAuth.token}` },
    });
    if (res.status === 200 && Array.isArray(res.body.data) && res.body.data.length > 0) {
      testDepartment = res.body.data[0];
      if (testDepartment.employeeCount !== undefined) {
        logPass(`GET /departments - Returns departments with employeeCount (${testDepartment.name})`);
      } else {
        throw new Error('employeeCount missing on department');
      }
    } else {
      throw new Error(`Unexpected status ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('GET /departments', err);
  }

  // 1b. Department Creation (Admin / HR Manager)
  let createdDeptId = null;
  const uniqueDeptName = `Operations Test ${Date.now()}`;
  try {
    const res = await request('/departments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
      body: JSON.stringify({ name: uniqueDeptName }),
    });
    if (res.status === 201 && res.body.data?.id) {
      createdDeptId = res.body.data.id;
      logPass(`POST /departments - Created new department (${uniqueDeptName})`);
    } else {
      throw new Error(`Failed to create department: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('POST /departments', err);
  }

  // 1c. Department Duplicate Name Conflict
  try {
    const res = await request('/departments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
      body: JSON.stringify({ name: uniqueDeptName }),
    });
    if (res.status === 409) {
      logPass('POST /departments - Duplicate department name rejected with 409 CONFLICT');
    } else {
      throw new Error(`Expected 409, got ${res.status}`);
    }
  } catch (err) {
    logFail('POST /departments duplicate conflict', err);
  }

  // 1d. Department Update (Rename)
  try {
    const res = await request(`/departments/${createdDeptId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
      body: JSON.stringify({ name: `${uniqueDeptName} Renamed` }),
    });
    if (res.status === 200 && res.body.data?.name.includes('Renamed')) {
      logPass('PATCH /departments/:id - Successfully renamed department');
    } else {
      throw new Error(`Failed to update department: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('PATCH /departments/:id', err);
  }

  // 1e. Department Archival (Soft Delete)
  try {
    const res = await request(`/departments/${createdDeptId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
    });
    if (res.status === 200 && res.body.data?.isArchived === true) {
      logPass('DELETE /departments/:id - Successfully soft-deleted (archived) department');
    } else {
      throw new Error(`Failed to archive department: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('DELETE /departments/:id', err);
  }

  // 2. Job Position Lookup
  try {
    const res = await request('/job-positions', {
      headers: { Authorization: `Bearer ${hrAuth.token}` },
    });
    if (res.status === 200 && Array.isArray(res.body.data) && res.body.data.length > 0) {
      testJobPosition = res.body.data[0];
      logPass(`GET /job-positions - Returns job positions (${testJobPosition.title})`);
    } else {
      throw new Error(`Unexpected status ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('GET /job-positions', err);
  }

  // 3. Employee List View (Paginated)
  try {
    const res = await request('/employees?view=list&limit=10&page=1', {
      headers: { Authorization: `Bearer ${hrAuth.token}` },
    });
    if (
      res.status === 200 &&
      res.body.data?.view === 'list' &&
      Array.isArray(res.body.data?.items) &&
      res.body.data?.pagination?.totalCount !== undefined
    ) {
      logPass(`GET /employees (List view) - Returns paginated employees (Total: ${res.body.data.pagination.totalCount})`);
    } else {
      throw new Error(`Unexpected structure: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('GET /employees (List view)', err);
  }

  // 4. Employee Kanban View (Group by status)
  try {
    const res = await request('/employees?view=kanban&groupBy=status', {
      headers: { Authorization: `Bearer ${hrAuth.token}` },
    });
    if (
      res.status === 200 &&
      res.body.data?.view === 'kanban' &&
      res.body.data?.groupBy === 'status' &&
      Array.isArray(res.body.data?.data?.ACTIVE)
    ) {
      logPass(`GET /employees (Kanban status) - Returns grouped ACTIVE/INACTIVE columns`);
    } else {
      throw new Error(`Unexpected structure: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('GET /employees (Kanban status)', err);
  }

  // 5. Employee Kanban View (Group by department)
  try {
    const res = await request('/employees?view=kanban&groupBy=departmentId', {
      headers: { Authorization: `Bearer ${hrAuth.token}` },
    });
    if (
      res.status === 200 &&
      res.body.data?.view === 'kanban' &&
      res.body.data?.groupBy === 'department' &&
      typeof res.body.data?.data === 'object'
    ) {
      logPass(`GET /employees (Kanban department) - Returns grouped department columns`);
    } else {
      throw new Error(`Unexpected structure: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('GET /employees (Kanban department)', err);
  }

  // 6. Search filtering
  try {
    const res = await request('/employees?search=Sarah', {
      headers: { Authorization: `Bearer ${hrAuth.token}` },
    });
    if (
      res.status === 200 &&
      res.body.data?.items?.some((e) => e.firstName.toLowerCase().includes('sarah') || e.lastName.toLowerCase().includes('sarah'))
    ) {
      logPass(`GET /employees?search=Sarah - Accurately filters by name search`);
    } else {
      throw new Error(`Filter mismatch: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('GET /employees?search=Sarah', err);
  }

  // 7. Employee Role Self-Scoping (Anti-Data-Leakage)
  try {
    const res = await request('/employees', {
      headers: { Authorization: `Bearer ${employeeAuth.token}` },
    });
    if (
      res.status === 200 &&
      res.body.data?.items?.length === 1 &&
      res.body.data.items[0].id === employeeAuth.user.employeeId
    ) {
      logPass(`GET /employees (EMPLOYEE role) - Self-scoping strictly enforced to own employee ID only`);
    } else {
      throw new Error(`Employee saw un-scoped items: count=${res.body.data?.items?.length}`);
    }
  } catch (err) {
    logFail('GET /employees (EMPLOYEE role self-scoping)', err);
  }

  // 8. GET /employees/:id with Smart Button Counts & Active Contract
  try {
    const res = await request(`/employees/${employeeAuth.user.employeeId}`, {
      headers: { Authorization: `Bearer ${hrAuth.token}` },
    });
    if (
      res.status === 200 &&
      res.body.data?.counts &&
      res.body.data.counts.contracts !== undefined &&
      res.body.data.counts.attendance !== undefined &&
      res.body.data.activeContract !== undefined
    ) {
      logPass(
        `GET /employees/:id - Returns smart button metrics (Contracts: ${res.body.data.counts.contracts}, Attendance: ${res.body.data.counts.attendance}, HasActiveContract: ${!!res.body.data.activeContract})`
      );
    } else {
      throw new Error(`Missing smart counts or active contract: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('GET /employees/:id smart metrics', err);
  }

  // 9. Employee IDOR Check: EMPLOYEE trying to view another employee profile
  try {
    const res = await request(`/employees/${hrAuth.user.employeeId}`, {
      headers: { Authorization: `Bearer ${employeeAuth.token}` },
    });
    if (res.status === 403) {
      logPass('GET /employees/:id (Anti-IDOR) - EMPLOYEE forbidden from viewing another profile (403)');
    } else {
      throw new Error(`Expected 403 Forbidden, got ${res.status}`);
    }
  } catch (err) {
    logFail('GET /employees/:id IDOR check', err);
  }

  // 10. POST /employees as HR Manager (Valid creation)
  const uniqueStamp = Date.now();
  const newEmail = `dev.test.${uniqueStamp}@demo.com`;
  try {
    const res = await request('/employees', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Developer',
        email: newEmail,
        phone: '+1 555 999 1234',
        bankAccount: 'US89370400440532013000',
        departmentId: testDepartment?.id,
        jobPositionId: testJobPosition?.id,
      }),
    });

    if (res.status === 201 && res.body.data?.employee?.id) {
      createdEmployeeId = res.body.data.employee.id;
      logPass(`POST /employees - HR Manager creates new employee (ID: ${createdEmployeeId})`);
    } else {
      throw new Error(`Failed to create employee: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('POST /employees create', err);
  }

  // 11. POST /employees - Duplicate Email Conflict
  try {
    const res = await request('/employees', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
      body: JSON.stringify({
        firstName: 'Duplicate',
        lastName: 'Email',
        email: newEmail,
      }),
    });
    if (res.status === 409) {
      logPass('POST /employees - Duplicate email triggers 409 CONFLICT');
    } else {
      throw new Error(`Expected 409, got ${res.status}`);
    }
  } catch (err) {
    logFail('POST /employees duplicate email', err);
  }

  // 12. POST /employees with issueLogin: true & Privilege Escalation Protection
  const loginEmpEmail = `provisioned.${uniqueStamp}@demo.com`;
  try {
    const res = await request('/employees', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
      body: JSON.stringify({
        firstName: 'Provisioned',
        lastName: 'User',
        email: loginEmpEmail,
        issueLogin: true,
        role: 'ADMIN', // HR Manager attempts to grant ADMIN role
      }),
    });

    if (
      res.status === 201 &&
      res.body.data?.initialCredentials &&
      res.body.data.initialCredentials.role === 'EMPLOYEE' &&
      res.body.data.initialCredentials.temporaryPassword.startsWith('PeoplePay@2026_')
    ) {
      logPass(
        `POST /employees (issueLogin) - Auto-generated credentials (${res.body.data.initialCredentials.temporaryPassword}) & prevented HR escalation to ADMIN (role locked to EMPLOYEE)`
      );
    } else {
      throw new Error(`Role escalation not prevented or credentials missing: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('POST /employees provision credentials & escalation prevention', err);
  }

  // 13. POST /employees with issueLogin: true as ADMIN (Can assign higher role)
  const adminProvisionEmail = `payroll.user.${uniqueStamp}@demo.com`;
  try {
    const res = await request('/employees', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
      body: JSON.stringify({
        firstName: 'Payroll',
        lastName: 'Officer',
        email: adminProvisionEmail,
        issueLogin: true,
        role: 'HR_PAYROLL_USER',
      }),
    });

    if (
      res.status === 201 &&
      res.body.data?.initialCredentials?.role === 'HR_PAYROLL_USER'
    ) {
      logPass('POST /employees (ADMIN) - Admin successfully provisions HR_PAYROLL_USER role');
    } else {
      throw new Error(`Admin role assignment failed: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('POST /employees admin role assignment', err);
  }

  // 14. PATCH /employees/:id - Update Employee Details
  try {
    const res = await request(`/employees/${createdEmployeeId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
      body: JSON.stringify({
        phone: '+1 555 777 8888',
        bankAccount: 'GB29NWBK60161331926819',
      }),
    });

    if (
      res.status === 200 &&
      res.body.data?.phone === '+1 555 777 8888' &&
      res.body.data?.bankAccount === 'GB29NWBK60161331926819'
    ) {
      logPass('PATCH /employees/:id - Successfully updated phone and bank account');
    } else {
      throw new Error(`Update verification failed: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('PATCH /employees/:id', err);
  }

  // 15. PATCH /employees/:id - Self-Manager Loop Prevention
  try {
    const res = await request(`/employees/${createdEmployeeId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
      body: JSON.stringify({
        managerId: createdEmployeeId, // Attempt self-referential loop
      }),
    });

    const errorMsg = res.body?.error?.message || res.body?.message || '';
    if (res.status === 400 && errorMsg.includes('cannot be their own manager')) {
      logPass('PATCH /employees/:id - Self-management loop blocked (400 BAD_REQUEST)');
    } else {
      throw new Error(`Expected self-manager rejection, got status ${res.status}: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('PATCH /employees/:id self-manager loop prevention', err);
  }

  // 16. DELETE /employees/:id - Soft Delete / Archival
  try {
    const res = await request(`/employees/${createdEmployeeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${hrAuth.token}` },
    });

    if (res.status === 200 && res.body.data?.isArchived === true) {
      // Verify employee no longer appears in active list
      const checkRes = await request(`/employees/${createdEmployeeId}`, {
        headers: { Authorization: `Bearer ${hrAuth.token}` },
      });
      if (checkRes.status === 404) {
        logPass('DELETE /employees/:id - Soft-deleted employee archived and excluded from active queries (404)');
      } else {
        throw new Error(`Archived employee still returned: ${checkRes.status}`);
      }
    } else {
      throw new Error(`Archive failed: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    logFail('DELETE /employees/:id soft delete', err);
  }

  // 17. RBAC Check: EMPLOYEE cannot create employees
  try {
    const res = await request('/employees', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeAuth.token}` },
      body: JSON.stringify({
        firstName: 'Hacker',
        lastName: 'Attempt',
        email: 'hacker@demo.com',
      }),
    });

    if (res.status === 403) {
      logPass('POST /employees (RBAC) - EMPLOYEE role denied permission to create employees (403 FORBIDDEN)');
    } else {
      throw new Error(`Expected 403, got ${res.status}`);
    }
  } catch (err) {
    logFail('POST /employees RBAC check', err);
  }

  // Summary
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
