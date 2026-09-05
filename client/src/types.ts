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

export type TimeOffStatus = 'draft' | 'submitted' | 'approved' | 'refused';

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  duration: number;
  status: TimeOffStatus;
  reason: string;
  allocationName: string;
  allocationTotal: number;
  allocationUsed: number;
}

export interface TimeOffType {
  id: string;
  name: string;
  code: string;
  color: string;
  allocationType: string;
  paid: boolean;
}

export interface TimeOffAllocation {
  id: string;
  employeeId: string;
  type: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  period: string;
}

export type PayrunStatus = 'draft' | 'computed' | 'validated' | 'paid';

export interface Payrun {
  id: string;
  name: string;
  salaryStructure: string;
  periodStart: string;
  periodEnd: string;
  status: PayrunStatus;
  employeeCount: number;
  totalNet: number;
  createdAt: string;
}

export type PayslipStatus = 'draft' | 'computed' | 'confirmed' | 'paid';

export interface PayslipLine {
  ruleName: string;
  category: 'Basic' | 'Allowance' | 'Deduction';
  amount: number;
}

export interface Payslip {
  id: string;
  employeeId: string;
  payrunId: string;
  payPeriod: string;
  payrunRef: string;
  status: PayslipStatus;
  lines: PayslipLine[];
  gross: number;
  net: number;
  warnings: number;
}

export interface SalaryStructure {
  id: string;
  name: string;
  type: 'monthly' | 'hourly';
  rulesCount: number;
  parent: string | null;
  active: boolean;
}

export interface SalaryRule {
  id: string;
  name: string;
  code: string;
  category: 'Basic' | 'Allowance' | 'Deduction';
  structure: string;
  sequence: number;
  condition: string;
  formula: string;
  active: boolean;
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
