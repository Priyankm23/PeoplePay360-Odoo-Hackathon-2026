# PeoplePay360 — Real-World Architecture & Business Decisions
### 🏆 Key Talking Points for Judges & Evaluation Review

> **Purpose:** This document tracks every real-world, enterprise-grade design decision implemented in **PeoplePay360**. Use these explanations during the hackathon demo and judge Q&A to showcase deep domain knowledge, relational integrity, and financial system compliance.

---

## 1. Soft Deletion (`isArchived`) vs. Hard Deletion for Master Data
- **The Problem:** In novice CRUD applications, deleting an employee or department runs a hard `DELETE FROM ...`. In an enterprise HR system, an employee who leaves the company after 6 months has past contracts, tax filings, attendance logs, and payslips referencing their record. Hard deleting them either fails due to foreign key constraints or orphans financial history.
- **Our Implementation:** All master data entities (`Employee`, `Department`, `Contract`, `WorkingSchedule`, `SalaryStructure`, `SalaryRule`, `TimeOffType`) have `isArchived = false` by default.
- **Why It Matters:** When an employee is archived, they immediately disappear from active search lists, employee dropdowns, and new Payruns (`WHERE isArchived = false`), while their **historical payslips, audit records, and contract history remain 100% intact**.
- **Transactional Records Contrast:** Records with lifecycles (`Payrun`, `Payslip`, `TimeOffRequest`) do not use `isArchived`; they rely on explicit state machines (`DRAFT` $\rightarrow$ `COMPUTED` $\rightarrow$ `VALIDATED` $\rightarrow$ `PAID` / `REFUSED`).

---

## 2. Why `salaryStructureId` Lives on the `Contract`, Not the `Employee`
- **The Problem:** Many developers mistakenly attach `salaryStructureId` or `wage` directly to the `Employee` table. This creates a severe limitation: when an employee is promoted from Intern to Full-Time, changing their wage or structure retroactively corrupts previous payslips or loses promotion history.
- **Our Implementation:** An employee's profile holds only personal and organizational data. Their compensation package (`wage` and `salaryStructureId`) is strictly attached to their **`Contract`**.
- **Real-World Benefit:** 
  - An employee transitions between roles over time (Internship Structure $\rightarrow$ Regular Full-Time Structure $\rightarrow$ Contractor Structure).
  - Each contract represents an agreed legal term.
  - When payroll is computed, it strictly resolves the contract valid for that specific payroll period (`startDate <= periodEnd AND (endDate IS NULL OR endDate >= periodStart)`).

---

## 3. Strict Contract Overlap Prevention (`409 CONTRACT_OVERLAP`)
- **The Problem:** A common real-world payroll error is double-paying an employee or applying two conflicting wage rates because two contracts were left active simultaneously.
- **Our Implementation:** The system enforces that no two `RUNNING` contracts can have overlapping date windows for the same employee. Activating a contract with an overlapping window triggers an explicit `409 CONTRACT_OVERLAP` conflict error.
- **Why It Matters:** Guarantees that payroll resolution is deterministic—the payroll engine never has to "guess" which contract applies.

---

## 4. Approval-Gated, Atomic Leave Balance Deduction
- **The Problem:** If an employee submits a leave request and the system immediately deducts days from their leave balance, what happens if the manager rejects it? Systems that deduct on submission suffer from balance drift, race conditions, or complex "refund" rollbacks.
- **Our Implementation:** 
  1. Submitting a leave request only creates a `SUBMITTED` record after verifying that `remaining >= duration`.
  2. The actual balance deduction (`TimeOffAllocation.taken += duration`) occurs **only upon manager approval** (`PATCH /approve`).
  3. The status transition and balance deduction are executed within a single ACID transaction (`prisma.$transaction`).
- **Why It Matters:** Refusal never touches the allocation. The ledger is clean, auditable, and cannot drift.

---

## 5. Ordered Salary Rule Sequencing with DAG Dependency Checks
- **The Problem:** Salary rules frequently depend on prior calculations (e.g., `HRA` is 40% of `BASIC`, `PF` is 12% of `BASIC`, and `GROSS` sums all earnings). If rules execute out of order, calculations fail or produce incorrect payslips.
- **Our Implementation:**
  - Every `SalaryRule` has an integer `sequence` within its `SalaryStructure`.
  - When creating a `PERCENTAGE` rule, the system strictly validates that the referenced `baseRuleId` has a strictly lower `sequence` number (`400 INVALID_RULE_SEQUENCE`).
- **Why It Matters:** Cyclic dependencies and out-of-order execution are impossible by design at configuration time, protecting the payroll engine from runtime crashes.

---

## 6. Frozen Payslip Snapshots vs. Dynamic Joins
- **The Problem:** If an HR manager updates the company's default `HRA` allowance rule from 40% to 50% in July, a poorly designed system that computes payslips dynamically on read would suddenly recalculate and alter January's past payslips!
- **Our Implementation:** 
  - During the `Compute` action of a Payrun, the system evaluates the rules and writes **immutable snapshot lines** into `PayslipLine` (`code`, `name`, `category`, `amount`).
  - `grossSalary` and `netSalary` are permanently frozen on the `Payslip` record.
- **Why It Matters:** Tax and accounting compliance requires finalized payslips to remain identical forever, regardless of future rule or contract edits.

---

## 7. Single Source of Truth for Derived vs. Stored State
- **The Problem:** Storing redundant values (like `remaining_leave = 15`) alongside `allocated = 20` and `taken = 5` inevitably leads to synchronization bugs.
- **Our Implementation:**
  - `TimeOffAllocation.remaining` is **derived on read** as `(allocated - taken)`.
  - `WorkingSchedule.weeklyHours` is **derived on read** by summing active schedule line durations minus breaks.
  - **The Exception with Justification:** `Attendance.workedHours` **is stored** because authorized HR managers can perform manual corrections (`PATCH /attendance/:id/correct`). The stored metric preserves the audited manual override even if the raw check-in/out timestamps are modified.

---

## 8. Two-Step Payrun Wizard with Zero Phantom Records
- **The Problem:** In many systems, clicking "New Payrun" immediately writes an empty row into the database. If the user navigates away or cancels, the database becomes cluttered with abandoned, orphan draft records.
- **Our Implementation:**
  - Step 1 (Scope Selection) calls `POST /api/payruns/preview-eligible` (pure calculation, persists nothing to the DB).
  - Step 2 (Employee Selection) displays the previewed staff and eligibility warnings.
  - The `Payrun` and its child `Payslip` records are created **only after Step 2 is explicitly submitted**.
- **Why It Matters:** Keeps the database clean and audit-ready at all times.

---

## 9. Live Operational Dashboard (Zero Cached Static Charts)
- **The Problem:** Hackathon projects often use mock data or pre-calculated static numbers for charts. The Odoo problem statement explicitly required: *"must reflect real-time, live data generated from HR and payroll operations instead of relying on static charts"*.
- **Our Implementation:** The `GET /api/dashboard` endpoint queries live relational data directly across `Payslip` (`status = PAID`), `Attendance`, `TimeOffRequest`, and `Department`.
- **Why It Matters:** When an HR Payroll Manager marks a payrun as `PAID`, the dashboard's "Total Net Salary Paid" and "Salary Cost by Department" charts update immediately on the next render.

---

## 10. Separation of Duties (SoD) & Anti-Self-Elevation Security
- **The Problem:** HR staff should not have the ability to pay themselves, and managers shouldn't be able to elevate their own permissions.
- **Our Implementation:**
  - **Separation of Duties:** `HR_MANAGER` can manage employees, attendance, and approve leave, but has **zero access** to payroll batches or salary structures. `HR_PAYROLL_USER/MANAGER` handles salary computation and payments.
  - **Anti-Self-Elevation:** Even an `ADMIN` cannot patch their own role via the API (`403 FORBIDDEN_SELF_ELEVATION`). Roles can only be changed by another administrator or bootstrap seed script.

---

## 11. Automated Enterprise Credential Generation & Email Provisioning
- **The Problem:** When an admin creates an employee profile with system login access, manually typing passwords or relying on fragile external signup links creates friction, weak passwords, and live demo risk.
- **Our Implementation:**
  - **Standardized Format:** When an Admin provisions login access, the backend auto-generates a standardized temporary password following enterprise IT convention: `PeoplePay@{Year}_{4DigitSequence}` (e.g., `PeoplePay@2026_0001`).
  - **Security & Complexity:** The pattern satisfies password strength requirements (uppercase, lowercase, special character `@`, `_`, and digits).
  - **Dual Provisioning Flow:** The temporary credential is both returned to the Admin in the UI response (with a 1-click copy button for instant testability) and dispatched via an asynchronous email delivery queue (`mailService.sendWelcomeCredentials(...)`), ready to connect to SMTP / Nodemailer without breaking core functionality.
- **Why It Matters:** Enables frictionless testing during demos while fully modeling real-world corporate onboarding.
