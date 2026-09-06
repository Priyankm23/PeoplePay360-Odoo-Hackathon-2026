const { z } = require('zod');

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// TimeOffType Validation
const createTimeOffTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  unit: z.enum(['DAYS', 'HOURS']).default('DAYS'),
  requiresAllocation: z.boolean().default(true),
  requiresApproval: z.boolean().default(true),
  affectsPayroll: z.boolean().default(true),
});

const updateTimeOffTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  unit: z.enum(['DAYS', 'HOURS']).optional(),
  requiresAllocation: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  affectsPayroll: z.boolean().optional(),
});

// TimeOffAllocation Validation
const createAllocationSchema = z.object({
  employeeId: z.string().uuid({ message: 'Valid employeeId UUID is required' }),
  timeOffTypeId: z.string().uuid({ message: 'Valid timeOffTypeId UUID is required' }),
  allocated: z.coerce.number().positive({ message: 'allocated days must be a positive number' }),
  validFrom: z.string().regex(dateRegex, { message: 'validFrom must be formatted as YYYY-MM-DD' }),
  validTo: z.string().regex(dateRegex, { message: 'validTo must be formatted as YYYY-MM-DD' }).optional().nullable(),
}).refine(
  (data) => {
    if (data.validTo && new Date(data.validTo) < new Date(data.validFrom)) {
      return false;
    }
    return true;
  },
  {
    message: 'validTo must be on or after validFrom',
    path: ['validTo'],
  }
);

const queryAllocationSchema = z.object({
  employeeId: z.string().uuid().optional(),
  timeOffTypeId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REFUSED', 'ALL']).optional(),
});

// TimeOffRequest Validation
const createRequestSchema = z.object({
  employeeId: z.string().uuid({ message: 'Valid employeeId UUID is required' }).optional(),
  timeOffTypeId: z.string().uuid({ message: 'Valid timeOffTypeId UUID is required' }),
  startDate: z.string().regex(dateRegex, { message: 'startDate must be formatted as YYYY-MM-DD' }),
  endDate: z.string().regex(dateRegex, { message: 'endDate must be formatted as YYYY-MM-DD' }),
  duration: z.coerce.number().positive({ message: 'duration must be greater than 0' }),
  reason: z.string().max(500).optional().nullable(),
}).refine(
  (data) => {
    if (new Date(data.endDate) < new Date(data.startDate)) {
      return false;
    }
    return true;
  },
  {
    message: 'endDate cannot be before startDate',
    path: ['endDate'],
  }
);

const refusalSchema = z.object({
  decisionNote: z.string().max(500).optional().nullable(),
});

const queryRequestSchema = z.object({
  employeeId: z.string().uuid().optional(),
  timeOffTypeId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REFUSED', 'ALL']).optional(),
});

module.exports = {
  createTimeOffTypeSchema,
  updateTimeOffTypeSchema,
  createAllocationSchema,
  queryAllocationSchema,
  createRequestSchema,
  refusalSchema,
  queryRequestSchema,
};
