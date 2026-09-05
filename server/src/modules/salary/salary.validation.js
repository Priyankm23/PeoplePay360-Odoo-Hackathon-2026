const { z } = require('zod');

const createSalaryStructureSchema = z.object({
  name: z.string().trim().min(2, 'Structure name must be at least 2 characters').max(100),
  isActive: z.boolean().optional().default(true),
});

const updateSalaryStructureSchema = z.object({
  name: z.string().trim().min(2, 'Structure name must be at least 2 characters').max(100).optional(),
  isActive: z.boolean().optional(),
});

const ruleCategoryEnum = z.enum(['BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET']);
const computationMethodEnum = z.enum(['FIXED', 'PERCENTAGE']);

const createSalaryRuleSchema = z.object({
  name: z.string().trim().min(1, 'Rule name is required').max(100),
  code: z
    .string()
    .trim()
    .min(1, 'Rule code is required')
    .max(20)
    .regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric and underscores only (e.g., BASIC, HRA)'),
  category: ruleCategoryEnum,
  sequence: z.coerce.number().int().min(1, 'Sequence must be an integer of 1 or greater'),
  computationMethod: computationMethodEnum,
  fixedAmount: z.coerce.number().min(0, 'Fixed amount must be non-negative').optional().nullable(),
  percentage: z.coerce.number().min(0, 'Percentage must be positive').max(100, 'Percentage cannot exceed 100').optional().nullable(),
  baseRuleId: z.string().uuid('Valid baseRuleId UUID is required').optional().nullable(),
}).refine(
  (data) => {
    if (data.computationMethod === 'FIXED') {
      return data.fixedAmount !== null && data.fixedAmount !== undefined;
    }
    if (data.computationMethod === 'PERCENTAGE') {
      return (
        data.percentage !== null &&
        data.percentage !== undefined &&
        data.percentage > 0 &&
        Boolean(data.baseRuleId)
      );
    }
    return true;
  },
  {
    message:
      'If computationMethod is FIXED, fixedAmount is required. If PERCENTAGE, percentage and baseRuleId are required.',
    path: ['computationMethod'],
  }
);

const updateSalaryRuleSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  code: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric and underscores only')
    .optional(),
  category: ruleCategoryEnum.optional(),
  sequence: z.coerce.number().int().min(1).optional(),
  computationMethod: computationMethodEnum.optional(),
  fixedAmount: z.coerce.number().min(0).optional().nullable(),
  percentage: z.coerce.number().min(0).max(100).optional().nullable(),
  baseRuleId: z.string().uuid().optional().nullable(),
}).refine(
  (data) => {
    if (data.computationMethod === 'FIXED') {
      return data.fixedAmount !== null && data.fixedAmount !== undefined;
    }
    if (data.computationMethod === 'PERCENTAGE') {
      return (
        data.percentage !== null &&
        data.percentage !== undefined &&
        Boolean(data.baseRuleId)
      );
    }
    return true;
  },
  {
    message:
      'If computationMethod is updated to FIXED, fixedAmount is required. If PERCENTAGE, percentage and baseRuleId are required.',
    path: ['computationMethod'],
  }
);

module.exports = {
  createSalaryStructureSchema,
  updateSalaryStructureSchema,
  createSalaryRuleSchema,
  updateSalaryRuleSchema,
};
