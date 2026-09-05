# PeoplePay360 — Information Architecture

> Purpose: map entities and features to actual pages and navigation, so the agent doesn't invent a nested-page structure mid-build. Priority tags: **MUST / SHOULD / CUT** — same three tags as overview.md's Build Order, never renamed here.

## 1. Navigation Structure

Primary navigation has 5 top-level items — verified directly against the wireframe's rendered nav bar and its three "Menus under X" legends (Employees / Time Off / Payroll), not assumed. **Design decision:** rendered as a left sidebar (see `stitch-design-prompts.md`), not the top bar shown in the original wireframe — an intentional deviation. The grouping logic below (which item contains which sub-pages) is unaffected either way. Two other corrections from an earlier pass of this doc, made explicit here:

- **Contracts is its own top-level item, not also nested inside Employees.** The wireframe's Employees-dropdown legend listed Contracts alongside Employees and Departments, but the rendered nav bar also shows a separate standalone "Contracts ▾" — giving Contracts two entry points. That's redundant navigation, not a deliberate pattern, so it's collapsed to the single top-level entry here.
- **Dashboard lives under Payroll ▾, not a standalone "Reports" item.** The wireframe's Payroll-dropdown legend and its rendered nav-bar screenshot both show Dashboard opening directly under Payroll, alongside Payruns/Payslips/Structures/Rules.
- **Departments and Working Schedules have no documented nav location in the wireframe** (they exist as real screens but never appear in any of the three dropdown legends). Placed under Employees ▾ here as the most logical home — flag this as an assumption if the wireframe is revisited.

**Role: Admin**
- Employees ▾ (Employees / Departments / Working Schedules) → `/employees`
- Contracts ▾ → `/contracts`
- Attendance → `/attendance`
- Time Off ▾ (Requests / Allocations / Types) → `/time-off/requests`
- Payroll ▾ (Dashboard / Payruns / Payslips / Salary Structures / Salary Rules) → `/payroll/payruns`
- (Admin-only, not a top-nav item: Settings → Users & Roles, reached via a gear icon, not the main bar)

**Role: HR Manager**
- Employees ▾ (Employees / Departments / Working Schedules) → `/employees`
- Contracts ▾ → `/contracts`
- Attendance → `/attendance`
- Time Off ▾ (Requests / Allocations / Types) → `/time-off/requests`
*(no Payroll dropdown at all — no Dashboard access by default, since Dashboard now lives inside it)*

**Role: HR Payroll User / HR Payroll Manager**
- Everything HR Manager has, PLUS:
- Payroll ▾ (Dashboard / Payruns / Payslips / Salary Structures [read-only for User] / Salary Rules [read-only for User]) → `/payroll/payruns`

**Role: Employee**
- My Profile → `/employees/me` (Employees ▾ collapses to just this single item, no dropdown)
- My Attendance → `/attendance` (self-scoped)
- My Time Off → `/time-off/requests` (self-scoped, "New Request" button visible)
- My Payslips → `/payroll/payslips` (self-scoped, read-only, reached without the Payroll dropdown since Employee has no Payroll access — direct link instead)

## 2. Page Inventory

| Page | Route | Priority | Roles | Primary entity | Composite? |
|---|---|---|---|---|---|
| Login | `/login` | MUST | All (unauthenticated) | User | N |
| Employees (List/Kanban toggle) | `/employees` | MUST | Admin, HR Manager, HR Payroll User/Manager | Employee | N |
| Employee Form | `/employees/:id` | MUST | Admin, HR Manager (edit); Payroll roles (view); Employee (own, view) | Employee | Y |
| Working Schedules List | `/working-schedules` | MUST | Admin, HR Manager | WorkingSchedule | N |
| Working Schedule Form | `/working-schedules/:id` | MUST | Admin, HR Manager | WorkingSchedule | N |
| Departments List | `/departments` | MUST | Admin, HR Manager (edit); Payroll roles (view) | Department | N |
| Contracts List | `/contracts` | MUST | Admin, HR Manager (edit); Payroll roles (view) | Contract | N |
| Contract Form | `/contracts/:id` | MUST | Admin, HR Manager | Contract | N |
| Attendance List | `/attendance` | MUST | Admin, HR Manager (all); Employee (self) | Attendance | N |
| Attendance Form | `/attendance/:id` | MUST | Admin, HR Manager | Attendance | Y |
| Time Off Requests List | `/time-off/requests` | MUST | All roles (scope varies) | TimeOffRequest | N |
| Time Off Request Form | `/time-off/requests/:id` | MUST | All roles (scope varies) | TimeOffRequest | Y |
| Time Off Allocations List | `/time-off/allocations` | MUST | Admin, HR Manager | TimeOffAllocation | N |
| Time Off Types List/Form | `/time-off/types` | MUST | Admin, HR Manager | TimeOffType | N |
| Salary Structures List | `/payroll/salary-structures` | MUST | Admin, HR Payroll Manager (edit); HR Payroll User (view) | SalaryStructure | N |
| Salary Structure Form | `/payroll/salary-structures/:id` | MUST | Admin, HR Payroll Manager (edit); HR Payroll User (view) | SalaryStructure | Y |
| Salary Rules List | `/payroll/salary-rules` | MUST | Admin, HR Payroll Manager (edit); HR Payroll User (view) | SalaryRule | N |
| Payruns List | `/payroll/payruns` | MUST | HR Payroll User/Manager, Admin | Payrun | N |
| Payrun Creation Wizard | `/payroll/payruns/new` | MUST | HR Payroll User/Manager, Admin | Payrun | Y |
| Payrun Processing Screen | `/payroll/payruns/:id` | MUST | HR Payroll User/Manager, Admin | Payrun | Y |
| Payslips List | `/payroll/payslips` | MUST | HR Payroll User/Manager, Admin (all); Employee (own) | Payslip | N |
| Payslip Screen | `/payroll/payslips/:id` | MUST | HR Payroll User/Manager, Admin (all); Employee (own, view) | Payslip | Y |
| Payroll Dashboard | `/dashboard` | SHOULD | HR Payroll User/Manager, Admin | (composed) | Y |
| Settings — Users & Roles | `/settings/users` | SHOULD | Admin | User | N |

## 3. Page Composition (only for pages flagged Composite in §2)

### Employee Form (`/employees/:id`)
- **Page body:** identity, role/status, department, manager, working schedule, profile image
- **Tab: Contracts** — filtered `Contract` list for this employee, read-only unless role permits edit — "New Contract" button opens Contract Form pre-filled with `employeeId`
- **Tab: Attendance** — filtered `Attendance` list for this employee
- **Tab: Time Off** — filtered `TimeOffRequest` + `TimeOffAllocation` for this employee, sub-tabbed
- **Smart buttons** (header, count badges): Contracts, Attendance, Time Off, Allocations — clicking scrolls to/activates the corresponding tab rather than navigating away

### Attendance Form (`/attendance/:id`)
- **Page body:** employee, date, checkIn, checkOut, computed workedHours, status
- **Modal: Manual Correction** — triggered by "Correct" button (Admin/HR Manager only) or automatically suggested when status is `MISSING_CHECKOUT` — calls `PATCH /api/attendance/:id/correct`

### Time Off Request Form (`/time-off/requests/:id`)
- **Page body:** employee, type, dates, duration, resolved allocation + remaining balance, status
- **Modal: Approve/Refuse** — triggered by "Approve"/"Refuse" buttons (Admin/HR Manager only, hidden for Employee role) — calls `PATCH /api/time-off-requests/:id/approve` or `/refuse`

### Salary Structure Form (`/payroll/salary-structures/:id`)
- **Page body:** structure name, active flag, employee/contract count
- **Tab: Rules** — ordered list of `SalaryRule` for this structure (drag-to-reorder adjusts `sequence`) — "Add Rule" button opens a modal
- **Modal: Add/Edit Rule** — triggered by "Add Rule" / row click — calls `POST` or `PATCH /api/salary-rules/:id`, form fields conditional on `computationMethod` (FIXED shows amount field, PERCENTAGE shows percentage + base rule selector limited to lower-sequence rules)

### Payrun Creation Wizard (`/payroll/payruns/new`)
- **Page body:** none — this route renders only the wizard shell, no Payrun exists yet
- **Step 1 (Scope):** Salary Structure selector, Period (start/end date) — "Continue" button calls `POST /api/payruns/preview-eligible`, moves to Step 2 with the returned list, creates nothing
- **Step 2 (Employee Selection):** checkbox list of eligible employees (ineligible ones shown greyed out with reason) — "Create Payrun" button calls `POST /api/payruns`, then redirects to `/payroll/payruns/:id`
- No modal here — this is a single-route, two-step in-page wizard, not two separate URLs (per §4 Routing Rule)

### Payrun Processing Screen (`/payroll/payruns/:id`)
- **Page body:** run name, structure, period, status, summary list of child Payslips (employee, net salary, status, warning badge)
- **Tab: Summary** — the payslip list above
- **Tab: Warnings** — flattened list of all blocking/non-blocking warnings across child Payslips, click-through to the specific Payslip
- **Action buttons (not modals, direct calls):** Compute → `POST /:id/compute`; Validate → `POST /:id/validate`; Mark Paid → `POST /:id/mark-paid` (HR Payroll Manager only); Send Payslips → `POST /:id/send-payslips`
- **Modal: Confirm Mark Paid** — triggered by "Mark Paid" button (irreversible action warrants a confirmation step) — on confirm, calls the action above

### Payslip Screen (`/payroll/payslips/:id`)
- **Page body:** employee, structure, payrun, period, status, workedDays
- **Tab: Salary Computation** — `PayslipLine` breakdown table (Basic, Allowances, Deductions, Gross, Net), ordered by rule sequence
- **Action button:** Print Payslip → `GET /:id/pdf` (opens/downloads PDF, not a modal)

### Payroll Dashboard (`/dashboard`)
- **Page body:** filter bar (Period, Department, Employee Type) driving every widget below via the single `GET /api/dashboard` call
- **Section: KPI Cards** — Total Net Salary Paid, Payslips Generated, Average Salary, Approved Time Off, Attendance Health
- **Section: Charts** — Salary Cost by Department, Monthly Net Salary Trend (ship at least one per overview.md Build Order SHOULD tier)
- **Section: Alerts** — payroll warnings list, click-through opens the related Payrun (`/payroll/payruns/:id`)
- **Section: Attendance/Time Off Overview** — presence/late/absent/overtime counts, pending Time Off requests count

## 4. Routing Rule
No route exists for anything documented above as a tab, modal, or drawer — those never get their own URL, no matter how deep the PS's original wording nests them. The Payrun Creation Wizard's two steps are explicitly **one route** (`/payroll/payruns/new`) with in-page state, not `/payroll/payruns/new/step-1` and `/step-2` — this matches the PS's explicit requirement that no Payrun record (and therefore no addressable `:id`) exists until step 2 is confirmed.

## 5. Role-Based View Variations

| Page | Role | What differs |
|---|---|---|
| `/employees` | Employee | Redirects to own `/employees/me` — list view is not accessible |
| `/employees/:id` | Employee | Read-only, own record only; no smart-button edit actions |
| `/attendance` | Employee | Scoped to own records; no "Correct" action visible |
| `/time-off/requests` | Employee | Scoped to own records; "New Request" visible, "Approve/Refuse" hidden |
| `/time-off/requests` | HR Manager, Admin | All employees' requests visible; "Approve/Refuse" visible |
| `/payroll/salary-structures`, `/payroll/salary-rules` | HR Payroll User | Visible but entirely read-only — no "Add/Edit Rule" modal trigger, no Create/Delete buttons |
| `/payroll/salary-structures`, `/payroll/salary-rules` | HR Payroll Manager, Admin | Full CRUD |
| `/payroll/payruns/:id` | HR Payroll User | Compute/Validate/Send Payslips visible; "Mark Paid" hidden |
| `/payroll/payruns/:id` | HR Payroll Manager, Admin | All actions visible including Mark Paid |
| `/payroll/payslips`, `/payroll/payslips/:id` | Employee | Scoped to own Payslips, no action buttons except Print |
| `/dashboard` | HR Payroll User/Manager, Admin | Full dashboard, all KPIs and charts — the only roles with a route to this page at all, since it sits inside the Payroll dropdown |
