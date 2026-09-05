# PeoplePay360 — Overview

> Priority legend used across this whole doc set: **[MUST]** must-ship · **[SHOULD]** should-ship · **[CUT]** cut-first if behind schedule. Defined once here in Build Order; features.md and ia.md only reference these tags, never redefine them.

## 1. Vision
PeoplePay360 is an integrated HR & Payroll platform that replaces the fragmented spreadsheet-and-forms approach most small HR tools use. Instead of employee data, attendance, leave, and salary living as disconnected records, the Employee is the central hub: Contracts and Working Schedules give payroll its context, Attendance and Time Off capture daily operational activity, and Salary Structures/Rules turn all of it into validated, auditable Payslips that can be printed and emailed. The system replaces the manual, error-prone process of an HR/payroll admin cross-referencing spreadsheets to figure out "which contract applies this month" or "how much leave does this person actually have left."

## 2. Problem Statement Interpretation
- The Employee record is the single source of truth; every other module (Contract, Attendance, Time Off, Payroll) links back to it and is reachable from it via smart buttons/filtered views.
- Payroll must never guess: it resolves exactly one applicable Contract per employee per payroll period, and the system must actively prevent two concurrently-active contracts for the same employee.
- Payroll is rule-driven, not hardcoded — Salary Structures group ordered Salary Rules (Fixed / Percentage / Formula) that actually compute the Basic/Allowance/Deduction/Gross/Net breakdown shown on the payslip.
- Payrun creation is a two-step wizard (define scope/period → select eligible employees) — a Payrun record is not created until step 2 is confirmed.
- Time Off has two linked concepts: Allocations (balances, need approval before being usable) and Requests (consume balance from an Allocation only once approved).
- The Payroll Dashboard is explicitly cross-functional — it aggregates live data from Employee, Contract, Attendance, Time Off, and Payroll models. It introduces no new business entities of its own.
- **AMBIGUOUS:** The PS does not specify whether an Employee can have multiple concurrent Time Off Allocations of the *same* type (e.g. two active "Annual Leave" allocations with different validity windows). We assume **no** — one active allocation per (employee, time-off type) at a time — to keep the balance-resolution logic unambiguous for a solo build. Documented here so it's a conscious cut, not a discovered gap.
- **AMBIGUOUS:** The PS describes "Python Code / Formula" as an advanced Salary Rule computation method but gives no example syntax. We treat this as a [CUT] feature (see §10) rather than guessing at a formula DSL under time pressure.

## 3. Non-Goals
- No multi-currency or multi-country payroll compliance (tax tables, statutory filings, region-specific rules).
- No biometric or third-party device integration for attendance — check-in/out is manual/self-reported with HR correction rights.
- No real email delivery infrastructure beyond a mocked/logged "send" action unless time allows wiring an actual provider (e.g. Resend/Nodemailer) in [SHOULD].
- No employee self-service password reset / SSO — seeded credentials only, per hackathon convention.
- No org-chart visualization, no performance review / recruitment modules — out of scope per the PS.
- No formula-based (Python code) Salary Rule computation engine — Fixed and Percentage methods only for MUST/SHOULD.

## 4. Tech Stack
- **Frontend:** React (Vite), Framer Motion, shadcn/ui, 21st.dev components, Lenis
- **Backend:** Node.js, Express, MVC architecture
- **DB / ORM:** PostgreSQL, Prisma
- **Auth:** JWT (access token), bcrypt password hashing
- **Validation:** Zod (request-level schema validation at the controller boundary)

State each decision once, here. No other doc re-litigates stack choices.

## 5. Roles & Permissions

| Role | Core Permissions | Notes |
|---|---|---|
| Employee | View own Employee record, own Attendance, own Time Off balances/history. Create Attendance entries and Time Off Requests. No HR/payroll admin access. | Scoped strictly to `employeeId = self`. |
| HR Manager | Full CRUD on Employees, Attendance, Contracts, Working Schedules, Time Off (Types/Allocations/Requests). Approve/refuse Time Off Requests. | No access to any Payroll module (Structures, Rules, Payruns, Payslips). |
| HR Payroll User | All HR Manager permissions + Create/Read/Update on Payruns and Payslips. Read-only on Salary Structures and Salary Rules. | Cannot delete Payruns/Payslips, cannot edit rule configuration. |
| HR Payroll Manager | All HR Payroll User permissions + full CRUD on Payruns, Payslips, Salary Structures, Salary Rules. | Full control over payroll configuration and execution. |
| Admin | Full access to all modules and models. | **Critical rule:** only Admin can create/modify User accounts and assign roles. Role self-elevation (a user changing their own role) is forbidden at the API layer regardless of UI state — judges test this directly. |

## 6. Global API Conventions
- Response envelope (strict contract across all endpoints):
  - **Success (2xx):**
    ```json
    {
      "success": true,
      "message": "Operation completed successfully",
      "data": {}
    }
    ```
  - **Error (4xx / 5xx):**
    ```json
    {
      "success": false,
      "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable error explanation",
        "details": null
      }
    }
    ```
- HTTP status codes: 200 (OK), 201 (Created), 400 (Validation / Bad Request), 401 (Unauthenticated), 403 (Forbidden / Unauthorized role), 404 (Not Found), 409 (Business rule conflict / state error), 500 (Internal Server Error)
- Field naming convention: camelCase for all API request/response keys and models
- Date format: ISO 8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ`); pure calendar dates (contract start/end, attendance date) use `YYYY-MM-DD`
- ID format: UUID v4 strings for all primary keys, plus human-readable secondary identifiers where useful for demo clarity (e.g. `PR-2026-01`, `PS-0001`)

## 7. Auth Conventions
- JWT payload shape: `{ userId, employeeId (nullable for pure-admin accounts), role, iat, exp }`. Access token only (no refresh token — out of scope for 24h build).
- Middleware order: `authenticate` (verifies JWT, attaches `req.user`) → `authorize(roles[])` (checks `req.user.role` against allowed roles for the route) → `scopeToSelf` (for Employee-role routes, forces `employeeId` filter to `req.user.employeeId`) → controller.
- Bootstrap plan for the first privileged user: seed script only (`prisma/seed.js`), never a live signup-to-admin endpoint. See schema.md §7.1 for seeded accounts.

## 8. Key Business Rules (Cross-Feature)
1. **Single active contract per period.** An Employee cannot have two Contracts whose date ranges overlap. When creating/updating a Contract, the system checks for date-range overlap against all other Contracts for that Employee and returns `409 CONTRACT_OVERLAP` if found. Payroll computation always resolves the *one* Contract where `startDate <= payrun.periodEnd AND (endDate IS NULL OR endDate >= payrun.periodStart)`.
2. **Time Off balance consumption is atomic and approval-gated.** A Time Off Request only affects an Allocation's balance at the moment it transitions to `APPROVED` — never on creation/submission. `taken` is incremented and `remaining` is derived (`allocated - taken`) inside the same transaction as the approval, so a Request refusal or later cancellation never silently corrupts the balance.
3. **Salary Rule sequencing is deterministic and validated at save-time, not compute-time.** Every Salary Rule has a `sequence` integer within its Structure. A Percentage-method rule may only reference (`baseRuleId`) a rule with a strictly lower `sequence` in the same Structure. This is enforced when the rule is created/updated (`400 INVALID_RULE_SEQUENCE`), so a broken dependency can never reach Payslip computation.

## 9. Entity Lifecycles / State Machines

**Contract**
```
DRAFT -> RUNNING -> EXPIRED
                  -> CANCELLED
```

**TimeOffAllocation**
```
PENDING -> APPROVED
        -> REFUSED
```

**TimeOffRequest**
```
DRAFT -> SUBMITTED -> APPROVED
                    -> REFUSED
```

**Payrun**
```
DRAFT -> COMPUTED -> VALIDATED -> PAID
```

**Payslip** (mirrors its parent Payrun, but tracked independently so per-employee warnings can block validation without blocking the whole run)
```
DRAFT -> COMPUTED -> VALIDATED -> PAID
```

Full trigger tables (what event causes what transition) live in features.md — this is the at-a-glance version.

## 10. Build Order

**[MUST]**
1. Auth & Role Bootstrap (login, JWT issuance, seeded role accounts)
2. Employee Master Management (List/Kanban/Form, department/manager/schedule linkage)
3. Working Schedule Setup (List/Form, auto-computed weekly hours)
4. Contract Management (List/Form, overlap validation, active-contract highlighting)
5. Attendance Tracking (List/Form, check-in/out, worked hours, manual correction)
6. Time Off Type & Allocation Setup (List/Form, balance tracking)
7. Time Off Requests (List/Form, approve/refuse workflow, balance deduction)
8. Salary Structure & Salary Rule Setup (List/Form, sequencing, Fixed + Percentage methods)
9. Payrun Creation Wizard (two-step: scope+period → employee selection)
10. Payrun Processing (Compute, Validate, Mark Paid, warnings surfacing)
11. Payslip & Salary Computation Screen (rule-by-rule breakdown)

**[SHOULD]**
1. Payslip PDF generation (single employee, from Payslip screen)
2. Bulk "Send Payslips" email action (from Payrun screen — can be a logged/mocked send if a real provider isn't wired in time)
3. Payroll Dashboard (KPI cards + at least one chart: Salary Cost by Department OR Monthly Net Salary Trend)
4. Attendance manual-correction popup as a dedicated modal (vs. plain inline edit)

**[CUT]**
1. Formula/Python-code Salary Rule computation method
2. Full Payroll Dashboard chart set (keep to one chart if behind schedule)
3. Time Off Allocation validity-period edge cases (multiple overlapping allocations, expiry auto-transitions)
4. Attendance coverage / overtime / late analytics beyond raw worked-hours display
5. Multi-warehouse-style department-level shipping/logistics anything (not applicable to this PS — listed only to explicitly rule out scope bleed from other problem statements reviewed during planning)

> If behind schedule mid-hackathon: this order is the decision already made. Don't re-litigate live — just stop at whatever tier you've reached.

## 11. Reference Docs
- `schema.md` — entities, enums, relations (authoritative)
- `features.md` — endpoints + feature-specific rules, tagged by priority
- `ia.md` — page/nav structure mapped to entities and features

**Instruction for the coding agent:** schema.md and features.md are literal and authoritative. If something looks wrong or incomplete for what you're building, stop and flag it back — don't silently deviate.
