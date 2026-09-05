const { z } = require('zod');

const attendanceIdSchema = z.object({
  id: z.string().uuid('Invalid Attendance ID'),
});

const checkInSchema = z.object({
  employeeId: z.string().uuid('Invalid Employee ID').optional(),
});

const checkOutSchema = z.object({
  employeeId: z.string().uuid('Invalid Employee ID').optional(),
});

const correctAttendanceSchema = z.object({
  checkIn: z.string().optional().nullable(),
  checkOut: z.string().optional().nullable(),
  workedHours: z.number().min(0).max(24).optional().nullable(),
  status: z
    .enum(['PRESENT', 'LATE', 'ABSENT', 'OVERTIME', 'MISSING_CHECKOUT', 'MANUALLY_CORRECTED'])
    .optional(),
  correctionNote: z
    .string({ required_error: 'Correction note is required' })
    .trim()
    .min(3, 'Correction note must be at least 3 characters long'),
});

const listAttendanceQuerySchema = z.object({
  employeeId: z.string().uuid('Invalid Employee ID').optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z
    .enum(['PRESENT', 'LATE', 'ABSENT', 'OVERTIME', 'MISSING_CHECKOUT', 'MANUALLY_CORRECTED'])
    .optional(),
  today: z.union([z.boolean(), z.string()]).optional(),
});

module.exports = {
  attendanceIdSchema,
  checkInSchema,
  checkOutSchema,
  correctAttendanceSchema,
  listAttendanceQuerySchema,
};
