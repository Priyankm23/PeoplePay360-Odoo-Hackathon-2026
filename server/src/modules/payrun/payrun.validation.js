const { z } = require('zod');

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const previewEligibleSchema = z
  .object({
    salaryStructureId: z.string().uuid('Invalid salary structure ID format'),
    periodStart: z.string().regex(dateRegex, 'periodStart must be in YYYY-MM-DD format'),
    periodEnd: z.string().regex(dateRegex, 'periodEnd must be in YYYY-MM-DD format'),
  })
  .refine(
    (data) => new Date(data.periodEnd) >= new Date(data.periodStart),
    {
      message: 'periodEnd must be greater than or equal to periodStart',
      path: ['periodEnd'],
    }
  );

const createPayrunSchema = z
  .object({
    name: z.string().trim().min(3, 'Payrun name must be at least 3 characters').max(100),
    salaryStructureId: z.string().uuid('Invalid salary structure ID format'),
    periodStart: z.string().regex(dateRegex, 'periodStart must be in YYYY-MM-DD format'),
    periodEnd: z.string().regex(dateRegex, 'periodEnd must be in YYYY-MM-DD format'),
    employeeIds: z
      .array(z.string().uuid('Invalid employee ID format'))
      .min(1, 'At least one eligible employee must be selected for the payrun'),
  })
  .refine(
    (data) => new Date(data.periodEnd) >= new Date(data.periodStart),
    {
      message: 'periodEnd must be greater than or equal to periodStart',
      path: ['periodEnd'],
    }
  );

const updatePayrunSchema = z.object({
  name: z.string().trim().min(3, 'Payrun name must be at least 3 characters').max(100).optional(),
});

module.exports = {
  previewEligibleSchema,
  createPayrunSchema,
  updatePayrunSchema,
};
