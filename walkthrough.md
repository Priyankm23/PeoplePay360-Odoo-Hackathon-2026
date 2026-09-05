# Walkthrough: Feature 13 - Unified Payroll Dashboard

## Overview

Successfully designed, built, and verified **Feature 13: Unified Payroll Dashboard** under branch `feature/payroll-dashboard`. 

The dashboard combines real-time data across **5 distinct core models**:
1. **Employees / Departments** (Headcount, hierarchy, active workforce)
2. **Contracts** (Active wages, schedules, expiring contracts)
3. **Payruns & Payslips** (Disbursed net salary, gross totals, paid vs. pending status, 6-month historical trend)
4. **Attendance** (Present, late, absent, overtime, missing checkouts, manual corrections, coverage health %)
5. **Time Off Requests & Allocations** (Approved leave days, pending requests, remaining balances)

All metrics are computed **live from database tables** (zero stale or static snapshots).

---

## What Was Changed & Implemented

### 1. Backend Service & API
- **`server/src/modules/dashboard/dashboard.service.js`**:
  - Live query aggregator parsing periods (`YYYY-MM`), department filters, and employee schedule types.
  - Computes top 5 executive KPIs:
    - `totalNetSalaryPaid` (with `% vs previous month` trend comparison)
    - `payslipsGenerated` (`paidCount` vs `pendingCount`)
    - `averageSalary` (per paid employee or active contract wage)
    - `approvedTimeOff` (sum of approved leave duration)
    - `attendanceHealthPct` (ratio of present attendances)
  - Computes visual chart signals:
    - `salaryCostByDepartment`: Groups salary totals across departments.
    - `monthlyNetSalaryTrend`: Trailing 6-month historical trend.
    - `payslipStatusSplit`: Stacked distribution (`Paid`, `Validated`, `Computed`, `Draft`).
    - `alerts`: Missing bank accounts, duplicate payslips, unvalidated drafts, expiring contracts.
  - Computes detailed breakdowns:
    - `attendanceOverview`: Status counts (`Present`, `Late`, `Absent`, `Overtime`), missing checkouts, manual corrections, and coverage %.
    - `timeOffOverview`: Grouped by leave type with approved days, pending requests, and remaining balances.
    - `departmentOverview`: Department table with active headcount and monthly salary.
  - **Role Scoping (RBAC)**: If the caller is `HR_MANAGER`, sensitive monetary figures are redacted (`null` / empty arrays).
- **`server/src/modules/dashboard/dashboard.controller.js`**:
  - Request handler for `GET /api/dashboard`.
- **`server/src/modules/dashboard/dashboard.routes.js`**:
  - Protected with `authenticate` and `authorize(['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'HR_MANAGER'])`.
  - Employees are strictly blocked (`403 Forbidden`).
- **`server/src/server.js`**:
  - Mounted `/api/v1/dashboard` and `/api/dashboard`.

---

### 2. Frontend Interface (`client/src/pages/PayrollDashboard.tsx`)
Redesigned to match the provided architectural wireframe mockup precisely:
- **Filters Bar**:
  - Period selector (e.g., `Sep 2026`, `Aug 2026`, `Jul 2026`...).
  - Department dropdown (populated live from `/api/departments`).
  - Employee Type dropdown (`All Types`, `Full-Time`, `Part-Time`).
  - Company badge (`Odoo Hackathon Pvt Ltd`).
- **Row 1: Top 5 KPI Cards**:
  - `Total Net Salary Paid` (formatted in `₹` / Lakhs with trend percentage).
  - `Payslips Generated` (with paid and pending count).
  - `Avg Salary / Employee` (based on current payrun).
  - `Approved Time Off Days` (across selected period).
  - `Attendance Health` (percentage of present / reviewed records).
- **Row 2: Interactive Visualizations (3 Cards)**:
  - **Salary Cost by Department**: Clean SVG bar chart with departmental labels and `₹` totals above bars.
  - **Monthly Net Salary Trend**: 6-month SVG line & area curve chart with data points and axis labels.
  - **Payslip Status & Payroll Alerts**: Stacked horizontal status split bar (`Paid`, `Validated`, `Computed`, `Draft`) + live alerts list.
- **Row 3: Detailed Breakdowns (4 Cards)**:
  - **Attendance Overview**: Present/Late/Absent/Overtime pills, missing checkouts, manual edits, and coverage %.
  - **Time Off Overview**: Table by leave type with Approved, Pending, and Remaining balance.
  - **Department Overview**: Table of departments with active Headcount and Monthly Salary.
  - **Models to Aggregate Card**: Summary callout highlighting the multi-model data fusion.
- **HR Manager Privacy Notice**:
  - Displays a clean notice banner when logged in as HR Manager explaining that salary figures are restricted per security policy.

---

## Verification & Test Results

### 1. Automated Test Suites (All Passing: 49/49)
- **`node tests/dashboard.test.js`**: **11/11 tests passing**
  - Authenticates all roles.
  - Strict RBAC: Employee is blocked (`403 Forbidden`).
  - Admin & Payroll roles receive complete multi-model payload with live numbers.
  - HR Manager receives HR metrics with salary numbers redacted.
  - Period and Department filters verified.
  - Live alerts, attendance signals, time off overview, and department table verified.
- **`node tests/payruns.test.js`**: **13/13 tests passing**
- **`node tests/salary.test.js`**: **13/13 tests passing**
- **`node tests/contracts.test.js`**: **12/12 tests passing**

### 2. Frontend Production Build
- **`npm run build`**: **Compiled successfully in 9.86s with zero TypeScript or bundling errors**.
