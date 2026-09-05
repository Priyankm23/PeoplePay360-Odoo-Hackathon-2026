# PeoplePay360: Integrated HR & Payroll Operations Platform

> **Odoo Hackathon 2026 Project**  
> An integrated, enterprise-grade Human Resource and Payroll operations platform bridging the gap between day-to-day HR records and accurate payroll execution.

---

## 📌 Project Overview

Traditional HR tools treat employee records, working schedules, attendance, leave, and compensation as isolated silos. In real organizations, payroll is the critical convergence point of all these streams:
- An employee may hold multiple contracts over time, but payroll must pinpoint the **exact contract active for that specific pay period**.
- Standard working hours derive from an assigned **working schedule pattern**, while attendance logs track deviations and exceptions.
- **Time-off balances** require verified allocations and approved deduction workflows before affecting pay.
- Compensation calculations require **dynamic, configurable Salary Structures and ordered Salary Rules** (Basic, Allowances, Gross, Deductions, Net) driven by formulas and percentages rather than hardcoded figures.

**PeoplePay360** turns HR master data into a connected, automated operational flow: from the unified Employee Hub to 2-step Payrun batch processing, Payslip generation with automated validation warnings, and real-time executive dashboard analytics.

---

## 🚀 Key Features & Modules

### 1. 👤 Employee Master Management (Central Operational Hub)
- **Multi-View Interface**: Switch between Kanban cards, dense List view, and detailed Employee Form view.
- **Connected Smart-Buttons**: Instant counter badges linking directly to the employee's related Contracts, Attendance records, Time-Off requests, and Leave Allocations.
- **Master Data**: Job position, department, reporting manager, assigned working schedule, bank details, and active status.

### 2. 📜 Contract Lifecycle Management
- **Historical Tracking**: Full contract versioning over time (wages, job role, department, salary structure).
- **Period-Specific Resolution**: Automated resolution ensuring payroll computes against the strictly active contract for the target pay period, preventing concurrent overlaps.

### 3. ⏰ Working Schedules & Attendance Exception Handling
- **Schedule Definitions**: Weekly day/time patterns with break deductions and automated weekly hour calculations.
- **Attendance Logging**: Daily check-in, check-out, worked hour computations, and status indicators (Present, Late, Absent, Overtime).
- **Exception Review & Manual Corrections**: Audit-trailed manual corrections restricted to authorized HR managers.

### 4. 🏖️ Time Off & Allocation Engine
- **Configurable Leave Types**: Paid leave, sick leave, unpaid leave with custom allocation requirements and payroll impact rules.
- **Balance Allocations**: Formal request and approval workflow for employee leave balances with validity periods and remaining balance tracking.
- **Automated Deduction**: Approved leave requests dynamically deduct from available allocations with transparent audit history.

### 5. 🧮 Configurable Salary Structures & Sequential Rule Engine
- **Salary Structures**: Groupings of salary rules (e.g., "Regular Full-Time", "Contractor", "Executive").
- **Ordered Execution Sequence**: Rules process in strict sequence (e.g., Basic $\rightarrow$ Allowances $\rightarrow$ Gross $\rightarrow$ Deductions/Tax $\rightarrow$ Net) allowing downstream rules to build upon earlier computations.
- **Computation Modes**: Support for fixed amounts, percentages of base/gross, and dynamic formulas.

### 6. 💸 2-Step Payrun Wizard & Processing
- **Step 1 (Scope Definition)**: Select pay period dates, payment date, and target Salary Structure.
- **Step 2 (Employee Filtering)**: Preview and explicitly select eligible staff members before batch creation.
- **Batch Processing Lifecycle**: `Draft` $\rightarrow$ `Compute` $\rightarrow$ `Validate` $\rightarrow$ `Mark Paid` $\rightarrow$ `Closed`.
- **Pre-Payment Validation Warnings**: Flags anomalies prior to payout (missing bank details, duplicate payslips, unapproved leave, expired contracts).

### 7. 📄 Payslip Breakdown, PDF & Bulk Delivery
- **Granular Line Items**: Transparent breakdown of every rule computation, working days, and deductions.
- **PDF Generation**: Download printable, professional payslips per employee.
- **Bulk Delivery**: Actionable workflow to distribute payslips via email to employees.

### 8. 📊 Executive Payroll Dashboard
- **Live KPIs**: Total Net Salary Paid, Payslips Generated, Average Salary, Approved Time-Off, Attendance Health score.
- **Visual Analytics**: Salary Cost by Department, Monthly Net Salary Trends, and Attendance distribution.
- **Operational Action Center**: Quick filters by Period, Department, and Employment Type.

---

## 👥 Role-Based Access Control (RBAC)

| Role | Employee & Attendance | Contracts & Schedules | Time-Off Requests / Allocations | Payruns & Payslips | Salary Structures & Rules | System Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Employee** | Self View / Check-In | Self View | Submit Requests / View Balance | View Own Payslips | ❌ | ❌ |
| **HR Manager** | Full CRUD | Full CRUD | Full CRUD & Approve/Refuse | ❌ | ❌ | ❌ |
| **HR Payroll User** | View | View | View | Create / Read / Update | Read Only | ❌ |
| **HR Payroll Manager**| Full CRUD | Full CRUD | Full CRUD | Full CRUD (All Actions) | Full CRUD | ❌ |
| **Admin** | Full Access | Full Access | Full Access | Full Access | Full Access | Full Access |

---

## 🛠️ Architecture & Tech Stack

```
PeoplePay360 (Monorepo)
├── client/           # React + Vite + Tailwind CSS Frontend
├── server/           # Node.js + Express + Prisma REST API
├── docs/             # Specs, Schema, IA, and Architecture documents
└── skills/           # UI and scoping playbooks
```

- **Backend**: Node.js & Express.js (RESTful API architecture)
- **Database & ORM**: PostgreSQL 18 with Prisma ORM (Strict schema integrity, ACID migrations, relational relations)
- **Validation**: Zod (End-to-end runtime request validation and type safety)
- **Authentication**: JWT (`jsonwebtoken`) + `bcryptjs` with HTTP-only cookies and role-based route middleware
- **Frontend**: Next.js (App Router) + React + Tailwind CSS + Lucide Icons + TanStack Table / Recharts
- **PDF Generation**: Dedicated server-side/client-side printable PDF renderer

---

## ⚙️ Local Development Setup

### Prerequisites
- **Node.js**: v18+ (tested on Node.js v22)
- **PostgreSQL**: v14+ (tested on local PostgreSQL 18 with pgAdmin 4)
- **Git**

### 1. Database Setup
Ensure PostgreSQL is running locally on port `5432`. Create a database named `odoo_hackathon_2026` or let Prisma sync it.

### 2. Backend Setup
```bash
cd server

# Install dependencies
npm install

# Configure environment variables
# Copy .env.example to .env and adjust credentials:
# DB_URL="postgresql://postgres:<your_password>@localhost:5432/odoo_hackathon_2026?schema=public"

# Sync schema with database
npx prisma db push

# Start backend development server (runs on port 5000)
npm run dev
```

### 3. Verify Backend Health
Open your browser or run:
```bash
curl http://localhost:5000/api/v1/health
```
Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected"
  }
}
```

### 4. Database Visualizer (Prisma Studio)
To inspect and manipulate data in a GUI:
```bash
cd server
npm run prisma:studio
```

---

## 📄 License & Credits
Developed for the **Odoo Hackathon 2026 Final Round**.
