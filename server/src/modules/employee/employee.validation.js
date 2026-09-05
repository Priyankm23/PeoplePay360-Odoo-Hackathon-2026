const { z } = require('zod');

const RoleEnum = z.enum(['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'EMPLOYEE']);
const EmployeeStatusEnum = z.enum(['ACTIVE', 'INACTIVE']);

const createEmployeeSchema = z.object({
  firstName: z.string({ required_error: 'First name is required' }).trim().min(1, 'First name cannot be empty'),
  lastName: z.string({ required_error: 'Last name is required' }).trim().min(1, 'Last name cannot be empty'),
  email: z.string({ required_error: 'Email is required' }).trim().email('Invalid email address'),
  phone: z.string().trim().optional().nullable(),
  bankAccount: z.string().trim().optional().nullable(),
  departmentId: z.string().uuid('Invalid Department ID').optional().nullable(),
  jobPositionId: z.string().uuid('Invalid Job Position ID').optional().nullable(),
  managerId: z.string().uuid('Invalid Manager ID').optional().nullable(),
  workingScheduleId: z.string().uuid('Invalid Working Schedule ID').optional().nullable(),
  status: EmployeeStatusEnum.default('ACTIVE'),
  profileImageUrl: z.string().url('Invalid image URL').optional().nullable(),

  // User account provisioning options
  issueLogin: z.preprocess((value) => value === 'true' || value === true, z.boolean()).default(false),
  role: RoleEnum.optional(),
  password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
});

const updateEmployeeSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional().nullable(),
  bankAccount: z.string().trim().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  jobPositionId: z.string().uuid().optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  workingScheduleId: z.string().uuid().optional().nullable(),
  status: EmployeeStatusEnum.optional(),
  profileImageUrl: z.string().url().optional().nullable(),
});

const queryEmployeeSchema = z.object({
  view: z.enum(['list', 'kanban']).default('list'),
  groupBy: z.enum(['status', 'departmentId']).default('status'),
  departmentId: z.string().optional(),
  status: EmployeeStatusEnum.optional(),
  search: z.string().optional(),
  page: z.string().transform((v) => Math.max(1, parseInt(v, 10) || 1)).optional().default('1'),
  limit: z.string().transform((v) => Math.min(100, Math.max(1, parseInt(v, 10) || 20))).optional().default('20'),
});

module.exports = {
  createEmployeeSchema,
  updateEmployeeSchema,
  queryEmployeeSchema,
};
