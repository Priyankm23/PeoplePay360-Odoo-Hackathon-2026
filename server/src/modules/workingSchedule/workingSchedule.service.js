const prisma = require('../../config/prisma');
const { ApiError } = require('../../utils/apiResponse');

/**
 * Converts a "HH:mm" time string into total minutes from midnight.
 * @param {string} timeString - e.g. "09:00" or "17:30"
 * @returns {number}
 */
const parseTimeStringToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Calculates total weekly working hours from schedule lines.
 * (endTime - startTime - breakMinutes) for each line, converted to hours.
 * @param {Array<{startTime: string, endTime: string, breakMinutes: number}>} lines
 * @returns {number}
 */
const calculateWeeklyHours = (lines = []) => {
  return lines.reduce((totalWeeklyHours, line) => {
    const startMinutes = parseTimeStringToMinutes(line.startTime);
    const endMinutes = parseTimeStringToMinutes(line.endTime);
    const dailyNetMinutes = endMinutes - startMinutes - (line.breakMinutes || 0);
    return totalWeeklyHours + dailyNetMinutes / 60;
  }, 0);
};

/**
 * Formats a working schedule record for API response including computed weekly hours and aggregate counts.
 * @param {object} schedule
 * @returns {object}
 */
const formatWorkingScheduleResponse = (schedule) => ({
  ...schedule,
  weeklyHours: calculateWeeklyHours(schedule.lines),
  daysPerWeek: schedule.lines ? schedule.lines.length : 0,
  employeeCount: schedule._count?.employees || 0,
  contractCount: schedule._count?.contracts || 0,
});

class WorkingScheduleService {
  /**
   * Validates schedule lines to ensure each day is unique and line times are valid.
   * @param {Array<{day: string, startTime: string, endTime: string, breakMinutes: number}>} scheduleLines
   */
  validateScheduleLines(scheduleLines) {
    const assignedDays = new Set(scheduleLines.map((line) => line.day));
    if (assignedDays.size !== scheduleLines.length) {
      throw ApiError.badRequest('Each weekday can appear only once in a schedule', null, 'DUPLICATE_SCHEDULE_DAY');
    }

    scheduleLines.forEach((line) => {
      const shiftDurationMinutes = parseTimeStringToMinutes(line.endTime) - parseTimeStringToMinutes(line.startTime);
      if (shiftDurationMinutes <= 0) {
        throw ApiError.badRequest(
          `End time (${line.endTime}) must be after start time (${line.startTime}) for ${line.day}`,
          null,
          'INVALID_SCHEDULE_TIME'
        );
      }
      if ((line.breakMinutes || 0) >= shiftDurationMinutes) {
        throw ApiError.badRequest(
          `Break time (${line.breakMinutes} mins) cannot equal or exceed shift duration (${shiftDurationMinutes} mins) for ${line.day}`,
          null,
          'INVALID_BREAK_DURATION'
        );
      }
    });
  }

  /**
   * Retrieves all active working schedules.
   * @returns {Promise<Array>}
   */
  async getWorkingSchedules() {
    const schedules = await prisma.workingSchedule.findMany({
      where: {},
      include: {
        lines: { orderBy: { day: 'asc' } },
        _count: { select: { employees: true, contracts: true } },
      },
      orderBy: { name: 'asc' },
    });

    return schedules.map(formatWorkingScheduleResponse);
  }

  /**
   * Retrieves a single working schedule by ID.
   * @param {string} scheduleId
   * @returns {Promise<object>}
   */
  async getWorkingScheduleById(scheduleId) {
    const schedule = await prisma.workingSchedule.findFirst({
      where: { id: scheduleId },
      include: {
        lines: { orderBy: { day: 'asc' } },
        _count: { select: { employees: true, contracts: true } },
      },
    });

    if (!schedule) {
      throw ApiError.notFound('Working schedule not found', 'SCHEDULE_NOT_FOUND');
    }

    return formatWorkingScheduleResponse(schedule);
  }

  /**
   * Creates a new working schedule with daily lines.
   * @param {{name: string, type?: string, lines: Array}} scheduleData
   * @returns {Promise<object>}
   */
  async createWorkingSchedule(scheduleData) {
    this.validateScheduleLines(scheduleData.lines);

    const createdSchedule = await prisma.workingSchedule.create({
      data: {
        name: scheduleData.name.trim(),
        type: scheduleData.type || 'FULL_TIME',
        lines: {
          create: scheduleData.lines,
        },
      },
      include: {
        lines: true,
        _count: { select: { employees: true, contracts: true } },
      },
    });

    return formatWorkingScheduleResponse(createdSchedule);
  }

  /**
   * Updates an existing working schedule and its lines.
   * @param {string} scheduleId
   * @param {{name?: string, type?: string, lines?: Array}} updateData
   * @returns {Promise<object>}
   */
  async updateWorkingSchedule(scheduleId, updateData) {
    await this.getWorkingScheduleById(scheduleId);

    if (updateData.lines) {
      this.validateScheduleLines(updateData.lines);
    }

    const updatedSchedule = await prisma.$transaction(async (tx) => {
      if (updateData.lines) {
        await tx.scheduleLine.deleteMany({
          where: { workingScheduleId: scheduleId },
        });
      }

      return tx.workingSchedule.update({
        where: { id: scheduleId },
        data: {
          ...(updateData.name && { name: updateData.name.trim() }),
          ...(updateData.type && { type: updateData.type }),
          ...(updateData.lines && {
            lines: {
              create: updateData.lines,
            },
          }),
        },
        include: {
          lines: true,
          _count: { select: { employees: true, contracts: true } },
        },
      });
    });

    return formatWorkingScheduleResponse(updatedSchedule);
  }

  /**
   * Soft-delete (archive) working schedule
   * @param {string} scheduleId
   */
  async archiveWorkingSchedule(scheduleId) {
    const existing = await prisma.workingSchedule.findFirst({
      where: { id: scheduleId, isArchived: false },
    });
    if (!existing) {
      throw ApiError.notFound('Working schedule not found', 'WORKING_SCHEDULE_NOT_FOUND');
    }

    return await prisma.workingSchedule.update({
      where: { id: scheduleId },
      data: { isArchived: true },
    });
  }

  async setArchived(scheduleId, isArchived) {
    const existing = await prisma.workingSchedule.findUnique({ where: { id: scheduleId } });
    if (!existing) throw ApiError.notFound('Working schedule not found', 'WORKING_SCHEDULE_NOT_FOUND');
    const updated = await prisma.workingSchedule.update({
      where: { id: scheduleId },
      data: { isArchived },
      include: { lines: true, _count: { select: { employees: true, contracts: true } } },
    });
    return formatWorkingScheduleResponse(updated);
  }
}

module.exports = new WorkingScheduleService();
