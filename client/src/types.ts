export type EmployeeStatus = 'active' | 'on_leave' | 'inactive' | 'probation';

export type Department =
  | 'Engineering'
  | 'Finance'
  | 'Human Resources'
  | 'Sales'
  | 'Operations';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarColor: string;
  jobTitle: string;
  department: Department;
  managerId: string | null;
  workingSchedule: string;
  status: EmployeeStatus;
  hireDate: string;
  phone: string;
  contractCount: number;
  attendanceCount: number;
  timeOffCount: number;
  allocationCount: number;
}

export type ContractStatus = 'running' | 'draft' | 'expired' | 'cancelled';

export interface Contract {
  id: string;
  reference?: string;
  employeeId: string;
  startDate: string;
  endDate: string | null;
  wage: number;
  wageType: 'monthly' | 'hourly';
  salaryStructure: string;
  status: ContractStatus;
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'overtime';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workedHours: string | null;
  status: AttendanceStatus;
  missingCheckout: boolean;
}

export type TimeOffStatus = 'draft' | 'submitted' | 'approved' | 'refused' | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REFUSED';

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  timeOffTypeId?: string;
  type?: string;
  startDate: string;
  endDate: string;
  duration: number;
  status: TimeOffStatus;
  reason?: string | null;
  decisionNote?: string | null;
  allocationId?: string | null;
  allocationName?: string;
  allocationTotal?: number;
  allocationUsed?: number;
  allocation?: TimeOffAllocation | null;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    department?: { id: string; name: string };
    jobPosition?: { id: string; title: string };
  };
  timeOffType?: {
    id: string;
    name: string;
    unit: string;
    requiresAllocation: boolean;
    requiresApproval: boolean;
    affectsPayroll: boolean;
  };
  approver?: {
    id: string;
    email: string;
    role: string;
  } | null;
  createdAt?: string;
}

export interface TimeOffType {
  id: string;
  name: string;
  code?: string;
  color?: string;
  unit?: 'DAYS' | 'HOURS';
  requiresAllocation?: boolean;
  requiresApproval?: boolean;
  affectsPayroll?: boolean;
  isArchived?: boolean;
  allocationCount?: number;
  requestCount?: number;
  allocationType?: string;
  paid?: boolean;
}

export interface TimeOffAllocation {
  id: string;
  employeeId: string;
  timeOffTypeId?: string;
  type?: string;
  allocated?: number;
  taken?: number;
  remaining?: number;
  totalDays?: number;
  usedDays?: number;
  remainingDays?: number;
  period?: string;
  validFrom?: string;
  validTo?: string | null;
  status?: 'PENDING' | 'APPROVED' | 'REFUSED';
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    department?: { id: string; name: string };
  };
  timeOffType?: {
    id: string;
    name: string;
    unit?: string;
  };
}

export type PayrunStatus = 'draft' | 'computed' | 'validated' | 'paid';

export interface Payrun {
  id: string;
  name: string;
  salaryStructureId?: string;
  salaryStructure?: string;
  rulesCount?: number;
  periodStart: string;
  periodEnd: string;
  status: PayrunStatus;
  employeeCount: number;
  totalGross?: number;
  totalNet: number;
  totalWarnings?: number;
  createdAt: string;
  payslips?: Payslip[];
}

export type PayslipStatus = 'draft' | 'computed' | 'validated' | 'paid';

export interface PayslipWarning {
  code: string;
  message: string;
  severity?: 'advisory' | 'warning' | 'blocking';
}

export interface PayslipLine {
  id?: string;
  salaryRuleId?: string;
  code?: string;
  ruleName?: string;
  name?: string;
  category: string;
  amount: number;
  sequence?: number;
}

export interface Payslip {
  id: string;
  employeeId: string;
  employeeName?: string;
  email?: string;
  department?: string;
  jobTitle?: string;
  payrunId: string;
  payrunName?: string;
  payPeriod: string;
  payrunRef: string;
  status: PayslipStatus;
  lines: PayslipLine[];
  workedDays?: number;
  gross?: number;
  grossSalary?: number;
  net?: number;
  netSalary?: number;
  warnings?: PayslipWarning[] | number;
  hasBlockingWarnings?: boolean;
  linesCount?: number;
  employee?: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    bankAccount?: string;
    department?: string;
    jobTitle?: string;
  };
  contract?: {
    id: string;
    reference: string;
    wage: number;
    structure?: string;
  };
  createdAt?: string;
}

export interface EligibleEmployee {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  jobTitle: string;
  wage: number;
  contractId: string | null;
  hasRunningContract: boolean;
  warnings: string[];
}

export interface PayrunPreview {
  salaryStructure: {
    id: string;
    name: string;
    rulesCount: number;
  };
  periodStart: string;
  periodEnd: string;
  totalEmployees: number;
  eligibleCount: number;
  eligibleEmployees: EligibleEmployee[];
}

export type SalaryRuleCategory = 'BASIC' | 'ALLOWANCE' | 'GROSS' | 'DEDUCTION' | 'NET';
export type ComputationMethod = 'FIXED' | 'PERCENTAGE';

export interface SalaryStructure {
  id: string;
  name: string;
  isActive?: boolean;
  active?: boolean;
  rulesCount: number;
  contractCount?: number;
  payrunsCount?: number;
  rules?: SalaryRule[];
  createdAt?: string;
  updatedAt?: string;
  type?: string;
  parent?: string | null;
}

export interface SalaryRule {
  id: string;
  salaryStructureId?: string;
  name: string;
  code: string;
  category: SalaryRuleCategory | string;
  sequence: number;
  computationMethod?: ComputationMethod;
  fixedAmount?: number | null;
  percentage?: number | null;
  baseRuleId?: string | null;
  baseRule?: {
    id: string;
    name: string;
    code: string;
    sequence: number;
  } | null;
  createdAt?: string;
  updatedAt?: string;
  structure?: string;
  condition?: string;
  formula?: string;
  active?: boolean;
}

export interface DepartmentInfo {
  id: string;
  name: Department;
  headId: string | null;
  employeeCount: number;
  description: string;
}

export interface WorkingSchedule {
  id: string;
  name: string;
  hoursPerWeek: number;
  daysPerWeek: number;
  startTime: string;
  endTime: string;
  flexible: boolean;
  employeeCount: number;
}

export interface PayrollAlert {
  id: string;
  type: string;
  affectedCount: number;
  severity: 'warning' | 'info' | 'danger';
  message: string;
}

export type View =
  | 'employees'
  | 'departments'
  | 'job-positions'
  | 'working-schedules'
  | 'contracts'
  | 'attendance'
  | 'time-off-requests'
  | 'time-off-allocations'
  | 'time-off-types'
  | 'payroll-dashboard'
  | 'payruns'
  | 'payslips'
  | 'salary-structures'
  | 'salary-rules'
  | 'employee-detail'
  | 'payrun-detail'
  | 'payslip-detail';

export type UserRole =
  | 'Admin'
  | 'HR Payroll Manager'
  | 'HR Payroll User'
  | 'HR Manager'
  | 'Employee';

export interface UserSession {
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  employeeId?: string | null;
  department?: string;
  avatarColor?: string;
}
