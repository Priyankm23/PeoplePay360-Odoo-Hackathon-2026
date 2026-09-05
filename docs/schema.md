# PeoplePay360 — Schema

## 1. Conventions
- Primary key type: `uuid` (Postgres `gen_random_uuid()` / Prisma `@default(uuid())`)
- Timestamp fields: every entity gets `createdAt` (`@default(now())`) and `updatedAt` (`@updatedAt`) unless noted otherwise
- Soft delete vs hard delete: soft delete via `isArchived boolean @default(false)` on master-data entities (Employee, Contract, WorkingSchedule, SalaryStructure, SalaryRule, TimeOffType). Transactional entities (Attendance, TimeOffRequest, TimeOffAllocation, Payrun, Payslip) are hard-delete-only pre-validation, immutable after
- Naming case: Postgres columns `snake_case` via Prisma `@map`, API/JSON fields always `camelCase` — mapping happens at the Prisma schema field-to-column level, never in controllers

## 2. Enums

```
Role: ADMIN | HR_MANAGER | HR_PAYROLL_USER | HR_PAYROLL_MANAGER | EMPLOYEE
EmployeeStatus: ACTIVE | INACTIVE
ContractStatus: DRAFT | RUNNING | EXPIRED | CANCELLED
ScheduleType: FULL_TIME | PART_TIME
Weekday: MONDAY | TUESDAY | WEDNESDAY | THURSDAY | FRIDAY | SATURDAY | SUNDAY
AttendanceStatus: PRESENT | LATE | ABSENT | OVERTIME | MISSING_CHECKOUT | MANUALLY_CORRECTED
TimeOffUnit: DAYS | HOURS
AllocationStatus: PENDING | APPROVED | REFUSED
TimeOffRequestStatus: DRAFT | SUBMITTED | APPROVED | REFUSED
SalaryRuleCategory: BASIC | ALLOWANCE | GROSS | DEDUCTION | NET
ComputationMethod: FIXED | PERCENTAGE
PayrunStatus: DRAFT | COMPUTED | VALIDATED | PAID
PayslipStatus: DRAFT | COMPUTED | VALIDATED | PAID
```

## 3. Entities

### User
**Priority:** MUST

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| email | string | unique, not null | login identifier |
| passwordHash | string | not null | bcrypt |
| role | Role | not null | |
| employeeId | uuid | FK, nullable, unique | null for pure Admin accounts with no linked Employee profile |
| createdAt | datetime | | |
| updatedAt | datetime | | |

**Relations:** User 1:1 Employee (optional), via `employeeId`

---

### Department
**Priority:** MUST

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| name | string | unique, not null | |
| isArchived | boolean | default false | |

**Relations:** Department 1:N Employee, Department 1:N Contract

---

### JobPosition
**Priority:** MUST

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| title | string | not null | |
| departmentId | uuid | FK, nullable | |
| isArchived | boolean | default false | |

**Relations:** JobPosition N:1 Department, JobPosition 1:N Employee, JobPosition 1:N Contract

---

### Employee
**Priority:** MUST — the master record; everything else keys off this

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| firstName | string | not null | |
| lastName | string | not null | |
| email | string | unique, not null | |
| phone | string | nullable | |
| departmentId | uuid | FK, nullable | |
| jobPositionId | uuid | FK, nullable | |
| managerId | uuid | FK -> Employee, nullable | self-relation |
| workingScheduleId | uuid | FK, nullable | |
| status | EmployeeStatus | default ACTIVE | |
| profileImageUrl | string | nullable | |
| isArchived | boolean | default false | |
| createdAt | datetime | | |
| updatedAt | datetime | | |

**Relations:** Employee N:1 Department, Employee N:1 JobPosition, Employee N:1 Employee (manager, self), Employee N:1 WorkingSchedule, Employee 1:N Contract, Employee 1:N Attendance, Employee 1:N TimeOffAllocation, Employee 1:N TimeOffRequest, Employee 1:N Payslip, Employee 1:1 User (optional)

---

### WorkingSchedule
**Priority:** MUST

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| name | string | not null | |
| type | ScheduleType | not null | |
| isArchived | boolean | default false | |

**Relations:** WorkingSchedule 1:N ScheduleLine, WorkingSchedule 1:N Employee, WorkingSchedule 1:N Contract

---

### ScheduleLine
**Priority:** MUST

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| workingScheduleId | uuid | FK, not null | |
| day | Weekday | not null | |
| startTime | time | not null | |
| endTime | time | not null | |
| breakMinutes | int | default 0 | |

**Relations:** ScheduleLine N:1 WorkingSchedule

---

### Contract
**Priority:** MUST

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| employeeId | uuid | FK, not null | |
| departmentId | uuid | FK, nullable | may differ from employee's current department (historical) |
| jobPositionId | uuid | FK, nullable | |
| workingScheduleId | uuid | FK, nullable | |
| salaryStructureId | uuid | FK, not null | which rule set applies to this contract |
| startDate | date | not null | |
| endDate | date | nullable | null = open-ended |
| wage | decimal(12,2) | not null | base wage referenced by Basic salary rule |
| status | ContractStatus | default DRAFT | |
| isArchived | boolean | default false | |
| createdAt | datetime | | |
| updatedAt | datetime | | |

**Relations:** Contract N:1 Employee, Contract N:1 SalaryStructure, Contract 1:N Payslip (a payslip snapshots which contract it used)

---

### Attendance
**Priority:** MUST

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| employeeId | uuid | FK, not null | |
| date | date | not null | |
| checkIn | datetime | nullable | |
| checkOut | datetime | nullable | |
| workedHours | decimal(5,2) | nullable | derived at write-time from checkIn/checkOut, stored for query performance |
| status | AttendanceStatus | default PRESENT | |
| correctedById | uuid | FK -> User, nullable | who applied a manual correction |
| correctionNote | string | nullable | |

**Relations:** Attendance N:1 Employee

---

### TimeOffType
**Priority:** MUST

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| name | string | unique, not null | |
| unit | TimeOffUnit | not null | |
| requiresAllocation | boolean | default true | if false, request can be approved with no balance check |
| requiresApproval | boolean | default true | |
| affectsPayroll | boolean | default true | paid vs unpaid leave |
| isArchived | boolean | default false | |

**Relations:** TimeOffType 1:N TimeOffAllocation, TimeOffType 1:N TimeOffRequest

---

### TimeOffAllocation
**Priority:** MUST

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| employeeId | uuid | FK, not null | |
| timeOffTypeId | uuid | FK, not null | |
| allocated | decimal(6,2) | not null | |
| taken | decimal(6,2) | default 0 | incremented on linked-request approval only |
| validFrom | date | not null | |
| validTo | date | nullable | |
| status | AllocationStatus | default PENDING | |

**Relations:** TimeOffAllocation N:1 Employee, TimeOffAllocation N:1 TimeOffType, TimeOffAllocation 1:N TimeOffRequest

---

### TimeOffRequest
**Priority:** MUST

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| employeeId | uuid | FK, not null | |
| timeOffTypeId | uuid | FK, not null | |
| allocationId | uuid | FK, nullable | resolved at submit-time if `requiresAllocation` is true |
| startDate | date | not null | |
| endDate | date | not null | |
| duration | decimal(6,2) | not null | in the TimeOffType's unit |
| status | TimeOffRequestStatus | default DRAFT | |
| approverId | uuid | FK -> User, nullable | |
| decisionNote | string | nullable | |

**Relations:** TimeOffRequest N:1 Employee, TimeOffRequest N:1 TimeOffType, TimeOffRequest N:1 TimeOffAllocation

---

### SalaryStructure
**Priority:** MUST

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| name | string | unique, not null | e.g. "Regular Salary" |
| isActive | boolean | default true | |
| isArchived | boolean | default false | |

**Relations:** SalaryStructure 1:N SalaryRule, SalaryStructure 1:N Contract, SalaryStructure 1:N Payrun

---

### SalaryRule
**Priority:** MUST

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| salaryStructureId | uuid | FK, not null | |
| name | string | not null | |
| code | string | not null | short code, e.g. `BASIC`, `HRA`, `PF` |
| category | SalaryRuleCategory | not null | |
| sequence | int | not null | ordering within the structure |
| computationMethod | ComputationMethod | not null | FIXED or PERCENTAGE |
| fixedAmount | decimal(12,2) | nullable | required if FIXED |
| percentage | decimal(5,2) | nullable | required if PERCENTAGE |
| baseRuleId | uuid | FK -> SalaryRule, nullable | required if PERCENTAGE; must have lower `sequence` |
| isArchived | boolean | default false | |

**Relations:** SalaryRule N:1 SalaryStructure, SalaryRule N:1 SalaryRule (baseRule, self, nullable), SalaryRule 1:N PayslipLine

---

### Payrun
**Priority:** MUST

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| name | string | not null | e.g. "January 2026 Payroll" |
| salaryStructureId | uuid | FK, not null | selected in wizard step 1 |
| periodStart | date | not null | |
| periodEnd | date | not null | |
| status | PayrunStatus | default DRAFT | |
| createdAt | datetime | | |
| updatedAt | datetime | | |

**Relations:** Payrun N:1 SalaryStructure, Payrun 1:N Payslip

---

### Payslip
**Priority:** MUST

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| payrunId | uuid | FK, not null | |
| employeeId | uuid | FK, not null | |
| contractId | uuid | FK, not null | resolved contract for this period (Key Business Rule #1) |
| workedDays | decimal(5,2) | nullable | computed from Attendance for the period |
| grossSalary | decimal(12,2) | nullable | snapshotted at Compute, immutable after |
| netSalary | decimal(12,2) | nullable | snapshotted at Compute, immutable after |
| status | PayslipStatus | default DRAFT | |
| warnings | json | nullable | array of `{ code, message }`, e.g. missing bank details, duplicate payslip |

**Relations:** Payslip N:1 Payrun, Payslip N:1 Employee, Payslip N:1 Contract, Payslip 1:N PayslipLine

---

### PayslipLine
**Priority:** MUST

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| payslipId | uuid | FK, not null | |
| salaryRuleId | uuid | FK, not null | |
| code | string | not null | copied from SalaryRule at compute-time (snapshot, not a live join) |
| name | string | not null | snapshot |
| category | SalaryRuleCategory | not null | snapshot |
| amount | decimal(12,2) | not null | computed result for this rule on this payslip |

**Relations:** PayslipLine N:1 Payslip, PayslipLine N:1 SalaryRule

## 4. Relationship Summary

```
User 1:1 Employee (via employeeId, optional)
Department 1:N Employee (via departmentId)
Department 1:N JobPosition (via departmentId)
Department 1:N Contract (via departmentId)
JobPosition 1:N Employee (via jobPositionId)
JobPosition 1:N Contract (via jobPositionId)
Employee 1:N Employee (self, via managerId)
WorkingSchedule 1:N ScheduleLine (via workingScheduleId)
WorkingSchedule 1:N Employee (via workingScheduleId)
WorkingSchedule 1:N Contract (via workingScheduleId)
Employee 1:N Contract (via employeeId)
SalaryStructure 1:N Contract (via salaryStructureId)
Employee 1:N Attendance (via employeeId)
Employee 1:N TimeOffAllocation (via employeeId)
TimeOffType 1:N TimeOffAllocation (via timeOffTypeId)
Employee 1:N TimeOffRequest (via employeeId)
TimeOffType 1:N TimeOffRequest (via timeOffTypeId)
TimeOffAllocation 1:N TimeOffRequest (via allocationId)
SalaryStructure 1:N SalaryRule (via salaryStructureId)
SalaryRule 1:N SalaryRule (self, via baseRuleId)
SalaryStructure 1:N Payrun (via salaryStructureId)
Payrun 1:N Payslip (via payrunId)
Employee 1:N Payslip (via employeeId)
Contract 1:N Payslip (via contractId)
Payslip 1:N PayslipLine (via payslipId)
SalaryRule 1:N PayslipLine (via salaryRuleId)
```

## 5. Derived / Computed Fields
- **Employee's active contract** is never stored on Employee — resolved at read-time and at Payrun-compute-time as the Contract where `employeeId` matches and today (or the Payrun's period) falls within `[startDate, endDate]`. Prevents a duplicated "current wage" column from drifting out of sync with Contract history.
- **WorkingSchedule.weeklyHours** is not a stored column — computed on read by summing `(endTime - startTime - breakMinutes)` across all `ScheduleLine` rows for that schedule.
- **TimeOffAllocation.remaining** is not stored — computed as `allocated - taken` on every read.
- **Attendance.workedHours** IS stored (not purely derived) because it needs to survive independent of `checkIn`/`checkOut` after a manual correction overwrites the raw timestamps — set once at write-time, editable directly during correction.
- **Payslip.grossSalary / netSalary** are stored, not derived-on-read, because Compute is a discrete, auditable action — they must remain frozen even if the underlying SalaryRule configuration changes later. Recomputing a Payslip after Structure changes requires an explicit re-Compute action, not an automatic recalculation.

## 6. Explicitly Out of Scope
- No multi-currency fields on Contract/Payslip — single currency assumed system-wide (mirrors overview.md Non-Goals).
- No statutory tax-table entities (e.g. country-specific tax brackets) — `SalaryRule` with `PERCENTAGE`/`FIXED` methods is the only computation surface.
- No `Device`/biometric-integration entity for Attendance — check-in/out is a plain timestamp pair, no hardware event log.
- No separate `Notification` entity for the "Send Payslips" action in MUST/SHOULD scope — treated as a fire-and-log action, not a persisted inbox.

## 7. Seed Fixture Specification
Single master fixture maintained in `prisma/seed.js` (and fixture files) shared by backend test scripts and initial frontend states.

### 7.1 Role Accounts & Baseline Credentials
| Role | Email | Password | Pre-linked Entities / Context |
|---|---|---|---|
| Admin | admin@demo.com | Password123! | Full system permissions, no linked Employee |
| HR Manager | hrmanager@demo.com | Password123! | Linked Employee in "Human Resources" department |
| HR Payroll User | payrolluser@demo.com | Password123! | Linked Employee in "Finance" department |
| HR Payroll Manager | payrollmanager@demo.com | Password123! | Linked Employee in "Finance" department |
| Employee | employee@demo.com | Password123! | Linked Employee in "Engineering" department, active RUNNING Contract, assigned WorkingSchedule (Mon–Fri, 9–6, 1hr break), one TimeOffAllocation with partial `taken` balance, one `SUBMITTED` TimeOffRequest awaiting the seeded HR Manager's approval, a mix of PRESENT/LATE/one MISSING_CHECKOUT Attendance rows for the current month |

### 7.2 Cumulative Feature Fixtures
- Tests do not use disposable random fixtures. Each feature test builds upon the standard role accounts above, so running tests progressively accumulates realistic profile data (attendance history, leave history, contract history, payslip history).
- Frontend begins with mock data mirroring this exact seed shape, then switches seamlessly to live API responses without schema mismatch.
- Additional fixture entities seeded once at hour 0 and reused everywhere: one `SalaryStructure` ("Regular Salary") with three `SalaryRule`s (`BASIC` fixed, `HRA` percentage of `BASIC`, `NET` gross-minus-deductions), one `Department`/`JobPosition` pair per demo employee, one `WorkingSchedule`, one `TimeOffType` ("Annual Leave", DAYS, requiresAllocation=true).
