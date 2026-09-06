# PeoplePay360

PeoplePay360 is an integrated HR and payroll operations platform built for the Odoo Hackathon 2026. It connects employee records, contracts, attendance, time off, salary rules, payroll processing, payslips, and executive reporting in one workflow.

## Product Overview

The platform is designed around a central payroll flow:

1. Maintain employee master data, working schedules, and profile images.
2. Create historical contracts with date-overlap protection.
3. Track attendance and review authorized corrections.
4. Manage leave types, allocations, requests, approvals, and payroll impact.
5. Configure salary structures and ordered calculation rules.
6. Preview eligible employees and create a payrun.
7. Compute, validate, finalize, and publish payslips.
8. Download or print payslips and email invoice-style payroll statements.
9. Monitor payroll, attendance, leave, and workforce metrics from the dashboard.

## Features

### Employee Management

- List and Kanban views with search, department, and status filters.
- **Cursor-based Pagination** with customizable page sizing (10, 20, 50 rows per page) and previous/next navigation.
- Employee profiles with department, job position, manager, schedule, bank details, and status.
- Connected counters for contracts, attendance, time off, and allocations.
- Profile image upload through Multer and Cloudinary with fallback handling.

### Contracts

- Standardized contract reference generation: sequential `CNT-YYYY-XXXX` code numbering.
- **Paginated Table View** with dynamic page sizing (10, 20, 50 rows) and responsive horizontal scrolling.
- Draft, running, expired, cancelled, and archived contract states.
- Historical contract records with salary structure and wage information.
- Date-range overlap detection preventing conflicting active contracts for the same employee.
- Automatic expiration of older contracts when a non-overlapping newer contract is activated.

### Attendance and Working Schedules

- Weekly schedules with working hours and break deductions.
- Check-in, check-out, worked-hour calculation, and attendance status tracking.
- Missing check-out and exception monitoring.
- Authorized manual corrections with audit notes.

### Time Off

- Configurable paid, unpaid, sick, and custom leave types.
- Leave allocations with validity periods and remaining balances.
- Employee requests with approval and refusal workflows.
- Approved leave deductions reflected in payroll calculations.

### Salary Configuration

- Salary structures containing ordered salary rules.
- Fixed amount and percentage-based calculations.
- Basic salary, allowances, gross salary, deductions, and net salary rules.
- Dependency-aware sequential rule execution.

### Payroll and Payslips

- Two-step payrun wizard with eligibility preview and employee selection.
- Payrun lifecycle: `DRAFT` → `COMPUTED` → `VALIDATED` → `PAID`.
- Validation warnings for missing bank details, invalid contracts, duplicate payslips, and leave issues.
- Detailed payslip line items and salary calculations.
- Printable and downloadable PDF payslips.
- Invoice-style payroll statement emails to all employees in a finalized payrun.
- Delivery results, `sentAt` tracking, and audit logging.

### Dashboard

- Net salary, payslip, average salary, leave, attendance, and headcount KPIs.
- Salary cost by department and monthly payroll trends.
- Attendance distribution and workforce trends.
- Operational alerts for expiring contracts, missing check-outs, missing bank details, and payroll warnings.

## Role-Based Access

| Role | Main permissions |
|---|---|
| Employee | View own profile, attendance, time off, and published payslips; check in and out; submit leave requests |
| HR Manager | Manage employees, contracts, schedules, attendance corrections, and time-off approvals; no payroll access |
| HR Payroll User | View HR records; create and manage payruns within assigned payroll permissions; read salary configuration |
| HR Payroll Manager | Full HR and payroll operations, including payrun finalization and payslip delivery |
| Admin | Full system access |

## Architecture

```text
PeoplePay360/
├── client/       React + TypeScript + Vite + Tailwind CSS frontend
├── server/       Node.js + Express + Prisma REST API
├── docs/         Product and architecture documentation
└── walkthrough.md Demo walkthrough
```

### Technology Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Lucide React
- Backend: Node.js, Express 5, JavaScript
- Database: PostgreSQL with Prisma ORM
- Validation: Zod
- Authentication: JWT, bcryptjs, HTTP-only cookies, role middleware, CSRF protection
- File storage: Multer memory storage and Cloudinary
- Email: Nodemailer with SMTP
- PDF: html2pdf.js and browser print layout
- Security: Helmet, CORS controls, validation, authorization, and audit logs

## Requirements

- Node.js 18 or newer
- PostgreSQL 14 or newer
- Git
- Cloudinary account for employee images
- SMTP account for account emails and payslip statements

## Local Setup

### 1. Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Configure the backend

Create `server/.env` from `server/.env.example`:

```env
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:5173
DB_URL=postgresql://postgres:password@localhost:5432/odoo_hackathon_2026?schema=public
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d

SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your-account@gmail.com
EMAIL_PASS=your-gmail-app-password

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Never commit real credentials. Gmail requires an App Password when SMTP is enabled.

### 3. Prepare and seed the database

Create the PostgreSQL database, then run:

```bash
cd server
npx prisma generate
npx prisma db push
npm run prisma:seed
```

The seed script populates the database with realistic demonstration data:
- **30 authentic employees** across 5 core departments (Human Resources, Finance & Accounting, Engineering & Technology, Research & Development, Marketing & Communications) with assigned managers and job positions.
- **30 sequential contracts** (`CNT-2026-0001` through `CNT-2026-0030`) linked to standard working schedules and salary structures.
- **Role accounts** configured with pre-set test credentials:
  - Admin: `admin@peoplepay360.com` / `Admin@123`
  - HR Manager: `hr.manager@peoplepay360.com` / `Admin@123`
  - HR Payroll User: `hr.payroll@peoplepay360.com` / `Admin@123`
  - Employee: `employee@peoplepay360.com` / `Admin@123`
- Comprehensive historical attendance logs, leave balances/requests, sample payruns, and computed payslips.

### 4. Start the application

In one terminal:

```bash
cd server
npm run dev
```

In another terminal:

```bash
cd client
npm run dev
```

Open `http://localhost:5173`. The API health check is available at `http://localhost:5000/api/v1/health`.

## Verification & Automated Test Suites

All core modules include comprehensive integration test suites:

```bash
# Frontend validation
cd client
npm run typecheck    # Verifies strict TypeScript type safety
npm run build        # Verifies production bundle build

# Backend integration test suites
cd server
npm run test:auth                   # Authentication, JWT, and RBAC
node tests/employee.test.js         # Employee CRUD, cursor pagination, and uniqueness
node tests/contracts.test.js        # Contract lifecycle, overlap detection, and CNT numbering
node tests/attendance.test.js       # Check-in, check-out, and manual corrections
node tests/timeoff.test.js          # Leave allocations, requests, and balance tracking
node tests/salary.test.js           # Salary structures, rules, and calculation order
node tests/payruns.test.js          # 2-step payruns, batch payslip computation, and status
node tests/dashboard.test.js        # Analytics, department salary breakdown, and alerts
node tests/workingSchedule.test.js  # Weekly working schedules and daily shift intervals
```

## Demo Flow

For a complete demonstration, sign in as an Admin or HR Payroll Manager and show:

1. **Employee Master & Directory**: View 30 seeded employees with cursor-based pagination (page size switching, search, and department filter).
2. **Contracts Management**: Review `CNT-2026-XXXX` contracts, overlap rejection protection, active status auto-transition, and paginated table.
3. **Attendance & Working Schedules**: Weekly schedules with shift intervals, check-in/out records, and audit notes.
4. **Time Off Management**: Multi-type leave allocations (Paid, Sick, Casual) and employee approval workflow.
5. **Salary Configuration**: Configurable salary structures with ordered fixed & percentage calculation rules.
6. **Payrun Wizard**: 2-step payrun creation with eligibility preview, salary computation, and validation checks.
7. **Payslip Generation & Email Delivery**: Professional payslip PDF export and automated email notification dispatch.
8. **Executive Dashboard**: Headcount, payroll cost distribution by department, attendance KPIs, and active operational alerts.

## Operational Considerations & Review Notes

- **Pagination Scope**: Cursor-based pagination is implemented on the Employee Directory, and page-based pagination is implemented on the Contracts module. Remaining auxiliary pages (Attendance, Leave Allocations/Requests, Payslips) currently load active records in full scroll view.
- **SMTP Configuration**: For live email delivery of payslips and onboarding credentials, ensure valid Gmail or custom SMTP credentials (`SMTP_SERVER`, `EMAIL_USER`, `EMAIL_PASS`) are configured in `server/.env`.
- **Cloudinary Storage**: If Cloudinary credentials are omitted in `.env`, profile images fall back to standard gravatar/avatar initials.
- **Timezone Standardization**: All backend timestamps are stored in UTC ISO format and converted to the client's local display format.

## License

Developed for the Odoo Hackathon 2026.
