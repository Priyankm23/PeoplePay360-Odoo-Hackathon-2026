const { z } = require('zod');

const idParamsSchema = z.object({ id: z.string().uuid('Invalid Job Position ID') });
const querySchema = z.object({ departmentId: z.string().uuid('Invalid Department ID').optional() });
const jobPositionSchema = z.object({
  title: z.string({ required_error: 'Job title is required' }).trim().min(1, 'Title cannot be empty'),
  departmentId: z.string().uuid('Invalid Department ID').optional().nullable(),
});

module.exports = { idParamsSchema, querySchema, jobPositionSchema };
