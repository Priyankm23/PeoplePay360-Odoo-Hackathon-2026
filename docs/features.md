# PeoplePay360 — Features

> Format per feature: Priority tag → Purpose → Actors → Depends On → Endpoints → Business Rules → Side Effects.
> All requests/responses use the global envelope and conventions from overview.md. Field/entity definitions are pulled from schema.md by reference — don't repeat them here.
>
> **Template note:** added a "Depends On" line (not in the original template) listing prerequisite features by number. Useful mid-hackathon when picking a feature back up and needing an instant reminder of what must already exist — the numbered Build Order in overview.md tells you *sequence*, this tells you *hard dependencies* within that sequence.

---

# 1. Auth & Role Bootstrap **[MUST]**

**Purpose:** Authenticate users and issue role-scoped JWTs; all other features depend on this existing first.
**Actors:** All roles.
**Depends On:** none.

### POST /api/auth/login
Request: `{ email, password }`
Response `200`: `{ token, user: { id, email, role, employeeId } }`
Rules: email/password required; generic `401 INVALID_CREDENTIALS` on any mismatch (never reveal whether the email exists).

### GET /api/auth/me
Response `200`: current `User` (reference schema.md `User` entity)

### PATCH /api/auth/change-password
Request: `{ currentPassword, newPassword }`
Response `200`: `{ success: true, message: "Password updated successfully" }`
Rules: User must be authenticated. `currentPassword` verified against hash; `newPassword` must be $\ge 8$ chars and differ from `currentPassword`.

**Business Rules:**
- No public signup endpoint. All User accounts are created by Admin (see Feature 2 note) or via `prisma/seed.js`.
- Role self-elevation is blocked: a PATCH to a user's own role field must return `403 FORBIDDEN_SELF_ELEVATION` even if the caller is Admin, if `req.user.id === target user id`.

**Side Effects:** none.

---

# 2. Employee Master Management **[MUST]**

**Purpose:** Central employee record — the hub every other module links back to.
**Actors:** Admin, HR Manager (full CRUD); HR Payroll User/Manager (read); Employee (read own record only).
**Depends On:** Feature 1.

### GET /api/employees
Response `200`: paginated list of `Employee` (reference schema.md). Supports `?view=list|kanban` (kanban groups by `status` or `departmentId`), `?departmentId=`, `?status=`.
Rules: Employee role is forced to `?employeeId=self` regardless of query params (via `scopeToSelf` middleware).

### GET /api/employees/:id
Response `200`: `Employee` + counts of related Contracts/Attendance/TimeOff for smart-button badges: `{ ...employee, counts: { contracts, attendance, timeOffRequests, timeOffAllocations } }`

### POST /api/employees **(Admin, HR Manager only)**
Request: `{ firstName, lastName, email, departmentId, jobPositionId, managerId?, workingScheduleId? }`
Response `201`: created `Employee`
Rules: `email` must be unique; creating an Employee optionally also creates a linked `User` with role `EMPLOYEE` if an `issueLogin: true` flag is passed with `password`.

### PATCH /api/employees/:id **(Admin, HR Manager only)**
Request: any subset of creatable fields, or `{ status }` to archive/reactivate.

**Business Rules:**
- `managerId` cannot equal the employee's own `id` (no self-management loop), and cannot create a manager cycle deeper than checking direct self-reference (full cycle detection is [CUT] — direct self-reference check only for MUST).
- Deleting is always a soft delete (`isArchived = true`); hard delete is not exposed via API.

**Side Effects:** Archiving an Employee does not cascade-archive their Contracts/Attendance/Payslips — historical records remain queryable for reporting.

---

# 3. Working Schedule Setup **[MUST]**

**Purpose:** Define weekly time patterns assigned to Employees/Contracts, standardizing attendance and payroll expectations.
**Actors:** Admin, HR Manager (CRUD); others read-only where referenced.
**Depends On:** Feature 1.

### GET /api/working-schedules
Response `200`: list including derived `weeklyHours` per schema.md §5.

### POST /api/working-schedules
Request: `{ name, type, lines: [{ day, startTime, endTime, breakMinutes }] }`
Response `201`: created `WorkingSchedule` with nested `ScheduleLine`s.

### PATCH /api/working-schedules/:id
Request: `{ name?, type?, lines? }` — full line-set replacement on `lines` update (simpler than per-line diffing for a 24h build).

**Business Rules:**
- `endTime` must be after `startTime` per line; `breakMinutes` must not exceed the line's raw duration (`400 INVALID_SCHEDULE_LINE`).
- `weeklyHours` is never accepted as client input — always server-computed.

**Side Effects:** none (schedules are referenced, not cascaded).

---

# 4. Contract Management **[MUST]**

**Purpose:** Maintain historical, period-scoped employment terms feeding payroll.
**Actors:** Admin, HR Manager (CRUD); HR Payroll User/Manager (read); Employee (no access).
**Depends On:** Feature 2, Feature 3, Feature 8 (needs a SalaryStructure to reference).

### GET /api/contracts?employeeId=
Response `200`: list of `Contract`, with `isActive: boolean` flag computed per schema.md §5, sorted newest-first.

### POST /api/contracts
Request: `{ employeeId, departmentId?, jobPositionId?, workingScheduleId?, salaryStructureId, startDate, endDate?, wage }`
Response `201`: created `Contract` with `status: DRAFT`.

### PATCH /api/contracts/:id/activate
Response `200`: `Contract` with `status: RUNNING`

**Business Rules:**
- Overlap check (Key Business Rule #1 in overview.md): before activating a Contract, verify no other `RUNNING` Contract for the same `employeeId` has an overlapping `[startDate, endDate]`. Violation returns:
  ```json
  {
    "success": false,
    "error": {
      "code": "CONTRACT_OVERLAP",
      "message": "This employee already has an active contract covering part of this period.",
      "details": { "conflictingContractId": "uuid" }
    }
  }
  ```
- Only one Contract may be `RUNNING` per employee at a time; activating a new one auto-transitions the previous `RUNNING` contract to `EXPIRED` if its `endDate` is on/before the new contract's `startDate`, otherwise the activation is blocked with `CONTRACT_OVERLAP`.

**Side Effects:** Activating a Contract makes it the resolvable "active contract" for payroll purposes immediately (schema.md §5 derived logic).

---

# 5. Attendance Tracking **[MUST]**

**Purpose:** Capture daily check-in/out, worked hours, and exceptions requiring HR review.
**Actors:** Employee (create own entries); Admin, HR Manager (full CRUD + correction rights).
**Depends On:** Feature 2.

### GET /api/attendance?employeeId=&from=&to=
Response `200`: list of `Attendance`, Employee role forced to self.

### POST /api/attendance/check-in
Response `201`: `Attendance` row with `checkIn = now()`, `status = PRESENT`.

### PATCH /api/attendance/:id/check-out
Response `200`: `Attendance` with `checkOut = now()`, `workedHours` computed and stored, `status` recalculated (`LATE` if `checkIn` after schedule start, `OVERTIME` if `workedHours` exceeds the day's scheduled hours).

### PATCH /api/attendance/:id/correct **(Admin, HR Manager only)**
Request: `{ checkIn?, checkOut?, workedHours?, correctionNote }`
Response `200`: `Attendance` with `status: MANUALLY_CORRECTED`, `correctedById` set to `req.user.id`.

**Business Rules:**
- A `checkIn` with no matching `checkOut` by end of day is flagged `MISSING_CHECKOUT` by a nightly-equivalent check — for a 24h demo, computed on-the-fly whenever the row is read (`date < today AND checkOut IS NULL`), not via a real cron job.
- Only Admin/HR Manager can call `/correct`; Employees can only create/check-out their own rows, never edit after the fact.

**Side Effects:** Attendance data feeds `Payslip.workedDays` at Payrun compute-time and the Dashboard's attendance overview — no other cascading writes.

---

# 6. Time Off Type & Allocation Setup **[MUST]**

**Purpose:** Define leave policies and manage per-employee balances.
**Actors:** Admin, HR Manager (CRUD on Types and Allocations).
**Depends On:** Feature 2.

### GET/POST/PATCH /api/time-off-types
Standard CRUD on `TimeOffType` (reference schema.md).

### GET /api/time-off-allocations?employeeId=
Response `200`: list of `TimeOffAllocation` with derived `remaining` per schema.md §5.

### POST /api/time-off-allocations
Request: `{ employeeId, timeOffTypeId, allocated, validFrom, validTo? }`
Response `201`: `TimeOffAllocation` with `status: PENDING`.

### PATCH /api/time-off-allocations/:id/approve **(Admin, HR Manager only)**
Response `200`: `TimeOffAllocation` with `status: APPROVED`.

**Business Rules:**
- A `PENDING` Allocation is not usable by a `TimeOffRequest` — request submission must resolve only `APPROVED` allocations (see Feature 7).
- Per overview.md §2 ambiguity note: only one non-`REFUSED` Allocation may exist per `(employeeId, timeOffTypeId)` at a time — creating a second returns `409 DUPLICATE_ALLOCATION`.

**Side Effects:** none beyond the Allocation record itself.

---

# 7. Time Off Requests **[MUST]**

**Purpose:** Employee-initiated leave requests with an approval workflow that consumes Allocation balance only on approval.
**Actors:** Employee (create/submit own); Admin, HR Manager (approve/refuse, any employee).
**Depends On:** Feature 6.

### POST /api/time-off-requests
Request: `{ timeOffTypeId, startDate, endDate, duration }`
Response `201`: `TimeOffRequest` with `status: SUBMITTED`, `employeeId` forced to `req.user.employeeId`.
Rules: if `TimeOffType.requiresAllocation`, the system resolves the employee's `APPROVED` Allocation for that type and attaches `allocationId`; if none exists or `remaining < duration`, return `400 INSUFFICIENT_BALANCE`.

### PATCH /api/time-off-requests/:id/approve **(Admin, HR Manager only)**
Response `200`: `TimeOffRequest` with `status: APPROVED`.

### PATCH /api/time-off-requests/:id/refuse **(Admin, HR Manager only)**
Request: `{ decisionNote? }`
Response `200`: `TimeOffRequest` with `status: REFUSED`.

**Business Rules (Key Business Rule #2 in overview.md):**
- Approval and balance deduction happen in a single database transaction: `TimeOffRequest.status = APPROVED` AND `TimeOffAllocation.taken += duration` commit together or not at all.
- Refusing a request never touches the Allocation, regardless of what stage the request was at.
- Re-approving an already-`REFUSED` request is not permitted — refusal is terminal; a new request must be submitted.

**Side Effects:** Approval decrements `TimeOffAllocation.remaining` (derived) and appears immediately on the Dashboard's "Approved Time Off" KPI.

---

# 8. Salary Structure & Salary Rule Setup **[MUST]**

**Purpose:** Define the ordered rule-sets that actually compute payslips.
**Actors:** Admin, HR Payroll Manager (full CRUD); HR Payroll User (read-only); HR Manager (no access).
**Depends On:** Feature 1.

### GET/POST/PATCH /api/salary-structures
Standard CRUD on `SalaryStructure`. List response includes `ruleCount`, `contractCount` (employees currently on this structure via active Contracts).

### GET /api/salary-structures/:id/rules
Response `200`: `SalaryRule[]` ordered by `sequence`.

### POST /api/salary-structures/:id/rules
Request: `{ name, code, category, sequence, computationMethod, fixedAmount?, percentage?, baseRuleId? }`
Response `201`: created `SalaryRule`.

### PATCH /api/salary-rules/:id
Request: any subset of creatable fields.

**Business Rules (Key Business Rule #3 in overview.md):**
- If `computationMethod = FIXED`, `fixedAmount` is required, `percentage`/`baseRuleId` must be null.
- If `computationMethod = PERCENTAGE`, `percentage` and `baseRuleId` are required, and the referenced `baseRuleId`'s `sequence` must be strictly less than this rule's `sequence` — violation returns `400 INVALID_RULE_SEQUENCE`.
- `sequence` values must be unique within a Structure (`409 DUPLICATE_SEQUENCE`).
- Category `NET` should conventionally be the highest `sequence` in a structure (advisory in UI, not hard-enforced, to keep validation simple for a 24h build).

**Side Effects:** Editing a Structure/Rule after Payslips have already been computed against it does NOT retroactively change those Payslips (schema.md §5) — only future Compute actions use the new configuration.

---

# 9. Payrun Creation Wizard **[MUST]**

**Purpose:** Two-step Payrun setup — scope/period first, then explicit employee selection — before any record is created.
**Actors:** HR Payroll User, HR Payroll Manager.
**Depends On:** Feature 4, Feature 8.

### POST /api/payruns/preview-eligible **(wizard step 1 → 2 transition, creates nothing)**
Request: `{ salaryStructureId, periodStart, periodEnd }`
Response `200`: `{ eligibleEmployees: [{ employeeId, name, hasRunningContract: boolean, warnings: [] }] }` — employees whose active Contract's `salaryStructureId` matches and whose Contract period overlaps the given period. Employees without a matching running contract are still listed but flagged `hasRunningContract: false` so the user sees why they're excluded.

### POST /api/payruns **(wizard step 2 confirm → actually creates the record)**
Request: `{ name, salaryStructureId, periodStart, periodEnd, employeeIds: [] }`
Response `201`: created `Payrun` with `status: DRAFT` and one `Payslip` per selected `employeeId` (each `status: DRAFT`, `contractId` resolved per Key Business Rule #1).

**Business Rules:**
- `POST /api/payruns` is the only endpoint that persists anything — `preview-eligible` is read-only, matching the PS requirement that clicking Continue in step 1 does not create a Payrun.
- `employeeIds` must be a non-empty subset of the previewed eligible list; server re-validates eligibility rather than trusting the client's step-1 snapshot (`400 EMPLOYEE_NOT_ELIGIBLE` if stale).

**Side Effects:** Creates one `Payslip` row per selected employee; does not compute amounts yet (that's Feature 10's Compute action).

---

# 10. Payrun Processing **[MUST]**

**Purpose:** Compute, validate, and mark a Payrun paid, surfacing warnings before finalization.
**Actors:** HR Payroll User (Compute, Validate); HR Payroll Manager (all actions including Mark Paid, and CUD on the Payrun itself).
**Depends On:** Feature 9.

### GET /api/payruns/:id
Response `200`: `Payrun` + nested `Payslip[]` summary (employee name, netSalary, status, warning count).

### POST /api/payruns/:id/compute
Response `200`: `Payrun` with `status: COMPUTED`; each child `Payslip` computed per Feature 11's rule engine, `workedDays` pulled from Attendance, `warnings` populated.

### POST /api/payruns/:id/validate
Response `200`: `Payrun` with `status: VALIDATED`. Blocked (`409 UNRESOLVED_WARNINGS`) if any child Payslip has a blocking-severity warning still present.

### POST /api/payruns/:id/mark-paid **(HR Payroll Manager only)**
Response `200`: `Payrun` and all child `Payslip`s transition to `PAID`.

**Business Rules:**
- Warnings computed at Compute time include: `MISSING_BANK_DETAILS` (Employee has no bank reference — for this build, presence of a placeholder `bankAccount` field on Employee, [SHOULD] to actually enforce), `DUPLICATE_PAYSLIP` (another non-cancelled Payslip already exists for this employee+overlapping period), `NO_ACTIVE_CONTRACT` (blocking — Payrun cannot Validate while any Payslip has this).
- Recomputing (`compute` called again while `status = COMPUTED`) fully overwrites prior `PayslipLine`s for that run — never appends duplicates.
- `mark-paid` is irreversible via API — no "unpay" endpoint (matches "preserves finalized batches as historical records" from the PS).

**Side Effects:** Compute cascades into Feature 11's per-Payslip line generation. Mark Paid is what the Dashboard's "Total Net Salary Paid" KPI sums over.

---

# 11. Payslip & Salary Computation Screen **[MUST]**

**Purpose:** Show and generate the rule-by-rule breakdown for one employee's payslip.
**Actors:** HR Payroll User, HR Payroll Manager (view all); Employee (view own, read-only).
**Depends On:** Feature 10.

### GET /api/payslips/:id
Response `200`: `Payslip` + `PayslipLine[]` ordered by the source rule's `sequence`, + resolved `Employee`/`Contract` summary fields.

### (internal, invoked by Feature 10's compute) computePayslip(payslipId)
Not a directly callable endpoint — documented here because this is the core algorithm a judge will ask about:
1. Resolve the applicable `Contract` for `employee + payrun.period` (Key Business Rule #1).
2. Load the Payrun's `SalaryStructure` rules ordered by `sequence`.
3. For each rule: `FIXED` → `amount = fixedAmount`; `PERCENTAGE` → `amount = baseRule's computed amount * (percentage / 100)`.
4. Write one `PayslipLine` per rule with the computed `amount`, snapshotting `code`/`name`/`category`.
5. Set `Payslip.grossSalary` = sum of lines where `category IN (BASIC, ALLOWANCE, GROSS)`; `netSalary` = the `NET`-category line's amount (or gross minus deductions if no explicit NET rule exists).

**Business Rules:**
- `workedDays` on the Payslip is computed from Attendance rows in `[payrun.periodStart, payrun.periodEnd]` for that employee — used for display, not (in MUST scope) for pro-rating FIXED amounts. Attendance-based proration is [SHOULD]/[CUT] if time-constrained.

**Side Effects:** none beyond what Feature 10 already covers — this is the read/display + computation-logic feature, not a separate write surface.

---

# 12. Payslip PDF Generation & Delivery **[SHOULD]**

**Purpose:** Printable payslip document and bulk email distribution.
**Actors:** HR Payroll User, HR Payroll Manager.
**Depends On:** Feature 11.

### GET /api/payslips/:id/pdf
Response `200`: `application/pdf` binary — rendered from the same data as Feature 11's GET response.

### POST /api/payruns/:id/send-payslips
Response `200`: `{ sentCount, failedCount }`. Email delivery can be a logged/mocked send (console log + a `sentAt` timestamp on each Payslip) if a real provider isn't wired in time — documented explicitly as an acceptable fallback in overview.md Non-Goals.

**Business Rules:** Only `VALIDATED` or `PAID` Payslips can be PDF'd/sent (`409 PAYSLIP_NOT_FINALIZED` otherwise).

**Side Effects:** Sets `Payslip.sentAt` (add this field if implementing — not in MUST schema, additive for SHOULD).

---

# 13. Payroll Dashboard (composed, not a standalone feature) **[SHOULD]**

Introduces no new entities — only scoped reads across Employee, Contract, Attendance, TimeOff, and Payroll models, filtered by Period/Department/Employee Type.

**Purpose:** Single screen aggregating payment, staffing, leave, and attendance signals.
**Actors:** HR Payroll User, HR Payroll Manager (full); HR Manager (HR-only KPIs, no salary figures); Admin (full).
**Depends On:** Feature 5, Feature 7, Feature 10.

### GET /api/dashboard?period=&departmentId=&employeeType=
Response `200`:
```json
{
  "kpis": {
    "totalNetSalaryPaid": 0,
    "payslipsGenerated": 0,
    "averageSalary": 0,
    "approvedTimeOff": 0,
    "attendanceHealthPct": 0
  },
  "salaryCostByDepartment": [{ "department": "", "amount": 0 }],
  "monthlyNetSalaryTrend": [{ "month": "", "amount": 0 }],
  "alerts": [{ "type": "MISSING_BANK_DETAILS", "count": 0, "payrunId": "" }]
}
```

**Business Rules:** All figures are computed live from existing tables (`PAID`/`VALIDATED` Payslips, `APPROVED` TimeOffRequests, Attendance status distribution) — never a cached/static snapshot, per the PS's explicit requirement.

**Side Effects:** none — read-only aggregation endpoint.

---

# Cut List (documented for completeness, not built unless ahead of schedule)

- **Formula/Python-code Salary Rule computation** [CUT] — would add a `FORMULA` value to `ComputationMethod` and a sandboxed expression evaluator; explicitly deferred per overview.md §2/§3.
- **Full Dashboard chart set** [CUT beyond one chart] — ship `salaryCostByDepartment` OR `monthlyNetSalaryTrend`, not both, if behind schedule.
- **Attendance coverage/overtime analytics** [CUT] — raw `workedHours` + `status` distribution only.
