const { z } = require('zod');

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createContractSchema = z.object({
  employeeId: z.string().uuid({ message: 'Valid employeeId UUID is required' }),
  departmentId: z.string().uuid().optional().nullable(),
  jobPositionId: z.string().uuid().optional().nullable(),
  workingScheduleId: z.string().uuid().optional().nullable(),
  salaryStructureId: z.string().uuid({ message: 'Valid salaryStructureId UUID is required' }),
  startDate: z.string().regex(dateRegex, { message: 'startDate must be formatted as YYYY-MM-DD' }),
  endDate: z.string().regex(dateRegex, { message: 'endDate must be formatted as YYYY-MM-DD' }).optional().nullable(),
  wage: z.coerce.number().positive({ message: 'wage must be a positive number' }),
}).refine(
  (data) => {
    if (data.endDate && new Date(data.endDate) <= new Date(data.startDate)) {
      return false;
    }
    return true;
  },
  {
    message: 'endDate must be after startDate. Employment contracts cannot be a single day.',
    path: ['endDate'],
  }
);

const updateContractSchema = z.object({
  departmentId: z.string().uuid().optional().nullable(),
  jobPositionId: z.string().uuid().optional().nullable(),
  workingScheduleId: z.string().uuid().optional().nullable(),
  salaryStructureId: z.string().uuid().optional(),
  startDate: z.string().regex(dateRegex, { message: 'startDate must be formatted as YYYY-MM-DD' }).optional(),
  endDate: z.string().regex(dateRegex, { message: 'endDate must be formatted as YYYY-MM-DD' }).optional().nullable(),
  wage: z.coerce.number().positive({ message: 'wage must be a positive number' }).optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate && new Date(data.endDate) <= new Date(data.startDate)) {
      return false;
    }
    return true;
  },
  {
    message: 'endDate must be after startDate. Employment contracts cannot be a single day.',
    path: ['endDate'],
  }
);

const queryContractSchema = z.object({
  employeeId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'RUNNING', 'EXPIRED', 'CANCELLED', 'ALL']).optional(),
  search: z.string().optional(),
});

module.exports = {
  createContractSchema,
  updateContractSchema,
  queryContractSchema,
};
