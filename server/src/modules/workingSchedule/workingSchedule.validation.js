const { z } = require('zod');

const WeekdayEnum = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]);

const ScheduleTypeEnum = z.enum(['FULL_TIME', 'PART_TIME']);

const scheduleLineSchema = z.object({
  day: WeekdayEnum,
  startTime: z
    .string({ required_error: 'Start time is required' })
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must be in HH:mm format (24-hour)'),
  endTime: z
    .string({ required_error: 'End time is required' })
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must be in HH:mm format (24-hour)'),
  breakMinutes: z
    .number()
    .int('Break minutes must be an integer')
    .min(0, 'Break minutes cannot be negative')
    .default(0),
});

const createWorkingScheduleSchema = z.object({
  name: z
    .string({ required_error: 'Schedule name is required' })
    .trim()
    .min(1, 'Schedule name cannot be empty'),
  type: ScheduleTypeEnum.default('FULL_TIME'),
  lines: z
    .array(scheduleLineSchema, { required_error: 'Schedule lines are required' })
    .min(1, 'At least one day schedule line must be specified'),
});

const updateWorkingScheduleSchema = z.object({
  name: z.string().trim().min(1, 'Schedule name cannot be empty').optional(),
  type: ScheduleTypeEnum.optional(),
  lines: z.array(scheduleLineSchema).min(1, 'At least one day schedule line must be specified').optional(),
});

const workingScheduleIdSchema = z.object({
  id: z.string().uuid('Invalid Working Schedule ID'),
});

module.exports = {
  WeekdayEnum,
  ScheduleTypeEnum,
  scheduleLineSchema,
  createWorkingScheduleSchema,
  updateWorkingScheduleSchema,
  workingScheduleIdSchema,
};
