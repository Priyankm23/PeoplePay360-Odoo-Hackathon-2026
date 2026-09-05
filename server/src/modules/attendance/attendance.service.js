const prisma = require('../../config/prisma');
const { ApiError } = require('../../utils/apiResponse');

class AttendanceService {
  /**
   * Helper: Normalize date to YYYY-MM-DD UTC midnight for consistent @db.Date storage
   */
  normalizeDate(date = new Date()) {
    const d = new Date(date);
    const dateStr = d.toISOString().split('T')[0];
    return new Date(`${dateStr}T00:00:00.000Z`);
  }

  /**
   * Helper: Convert JS getDay() to Prisma Weekday enum
   */
  getWeekdayEnum(date = new Date()) {
    const days = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];
    return days[date.getDay()];
  }

  /**
   * Helper: Parse "HH:mm" time string into minutes from midnight
   */
  parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, mins] = timeStr.split(':').map(Number);
    return hours * 60 + mins;
  }

  /**
   * Retrieve list of attendance records with filters & on-the-fly MISSING_CHECKOUT calculation
   */
  async getAttendanceList({ employeeId, from, to, status, today }) {
    const where = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    const todayDate = this.normalizeDate(new Date());

    if (today === true || today === 'true') {
      where.date = todayDate;
    } else if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = this.normalizeDate(from);
      }
      if (to) {
        where.date.lte = this.normalizeDate(to);
      }
    }

    if (status) {
      where.status = status;
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: {
              select: { id: true, name: true },
            },
            jobPosition: {
              select: { id: true, title: true },
            },
            manager: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        correctedBy: {
          select: { id: true, email: true, role: true },
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    // Evaluate on-the-fly MISSING_CHECKOUT for unfinished past records
    return records.map((record) => {
      const recordDate = new Date(record.date);
      const isPastDay = recordDate < todayDate;
      const isMissingCheckout =
        isPastDay &&
        record.checkIn &&
        !record.checkOut &&
        record.status !== 'MANUALLY_CORRECTED';

      const effectiveStatus = isMissingCheckout ? 'MISSING_CHECKOUT' : record.status;

      return {
        ...record,
        status: effectiveStatus,
        workedHours: record.workedHours !== null ? Number(record.workedHours) : null,
      };
    });
  }

  /**
   * Retrieve single attendance record by ID
   */
  async getAttendanceById(id) {
    const record = await prisma.attendance.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: {
              select: { id: true, name: true },
            },
            jobPosition: {
              select: { id: true, title: true },
            },
            manager: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        correctedBy: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    if (!record) {
      throw ApiError.notFound('Attendance record not found', 'ATTENDANCE_NOT_FOUND');
    }

    const todayDate = this.normalizeDate(new Date());
    const isPastDay = new Date(record.date) < todayDate;
    const isMissingCheckout =
      isPastDay &&
      record.checkIn &&
      !record.checkOut &&
      record.status !== 'MANUALLY_CORRECTED';

    return {
      ...record,
      status: isMissingCheckout ? 'MISSING_CHECKOUT' : record.status,
      workedHours: record.workedHours !== null ? Number(record.workedHours) : null,
    };
  }

  /**
   * Get current attendance status for an employee today (for Top-Right Widget)
   */
  async getTodayStatus(employeeId) {
    if (!employeeId) {
      return { hasEmployeeProfile: false, checkedIn: false, attendance: null };
    }

    const todayDate = this.normalizeDate(new Date());

    const record = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: todayDate,
        },
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!record || !record.checkIn) {
      return {
        hasEmployeeProfile: true,
        checkedIn: false,
        attendance: null,
        elapsedSeconds: 0,
        todayTotalHours: 0,
      };
    }

    const isCurrentlyCheckedIn = Boolean(record.checkIn && !record.checkOut);
    const isCompleted = Boolean(record.checkIn && record.checkOut);
    let elapsedSeconds = 0;
    let todayTotalHours = 0;

    if (isCurrentlyCheckedIn) {
      const checkInMs = new Date(record.checkIn).getTime();
      elapsedSeconds = Math.max(0, Math.floor((Date.now() - checkInMs) / 1000));
      todayTotalHours = parseFloat((elapsedSeconds / 3600).toFixed(2));
    } else {
      todayTotalHours = record.workedHours !== null ? Number(record.workedHours) : 0;
    }

    return {
      hasEmployeeProfile: true,
      checkedIn: isCurrentlyCheckedIn,
      isCompleted,
      attendance: {
        ...record,
        workedHours: record.workedHours !== null ? Number(record.workedHours) : null,
      },
      elapsedSeconds,
      todayTotalHours,
    };
  }

  /**
   * Clock In an employee
   */
  async checkIn({ employeeId }) {
    if (!employeeId) {
      throw ApiError.badRequest('No employee profile associated with this account.', null, 'NO_LINKED_EMPLOYEE');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        workingSchedule: {
          include: { lines: true },
        },
      },
    });

    if (!employee) {
      throw ApiError.notFound('Employee profile not found.', 'EMPLOYEE_NOT_FOUND');
    }

    const now = new Date();
    const todayDate = this.normalizeDate(now);

    // Check if employee already has a record today
    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: todayDate,
        },
      },
    });

    if (existing) {
      if (existing.checkIn && !existing.checkOut) {
        throw ApiError.badRequest('Already checked in. Please check out first.', null, 'ALREADY_CHECKED_IN');
      }
      if (existing.checkIn && existing.checkOut) {
        const timeStr = new Date(existing.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        throw ApiError.badRequest(
          `Attendance for today has already been completed (checked out at ${timeStr}). You cannot check in again today.`,
          null,
          'ALREADY_COMPLETED_TODAY'
        );
      }
    }

    // Determine if late based on working schedule line for today
    let initialStatus = 'PRESENT';
    if (employee.workingSchedule?.lines?.length) {
      const todayWeekday = this.getWeekdayEnum(now);
      const todayScheduleLine = employee.workingSchedule.lines.find(
        (line) => line.day === todayWeekday
      );

      if (todayScheduleLine) {
        const scheduledStartMinutes = this.parseTimeToMinutes(todayScheduleLine.startTime);
        const actualMinutes = now.getHours() * 60 + now.getMinutes();

        // If employee checks in after scheduled start time (with a 5 min grace period)
        if (actualMinutes > scheduledStartMinutes + 5) {
          initialStatus = 'LATE';
        }
      }
    }

    // Create attendance record (strictly one per calendar day)
    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        date: todayDate,
        checkIn: now,
        checkOut: null,
        workedHours: null,
        status: initialStatus,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return {
      ...attendance,
      workedHours: null,
    };
  }

  /**
   * Clock Out an employee
   */
  async checkOut({ id, employeeId }) {
    let attendance = null;

    if (id) {
      attendance = await prisma.attendance.findUnique({
        where: { id },
        include: {
          employee: {
            include: {
              workingSchedule: {
                include: { lines: true },
              },
            },
          },
        },
      });
    } else if (employeeId) {
      const todayDate = this.normalizeDate(new Date());
      attendance = await prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId,
            date: todayDate,
          },
        },
        include: {
          employee: {
            include: {
              workingSchedule: {
                include: { lines: true },
              },
            },
          },
        },
      });
    }

    if (!attendance || !attendance.checkIn) {
      throw ApiError.notFound('No active check-in record found to check out.', 'NO_ACTIVE_CHECKIN');
    }

    if (attendance.checkOut) {
      throw ApiError.badRequest('Attendance has already been checked out.', null, 'ALREADY_CHECKED_OUT');
    }

    const checkOutTime = new Date();
    const checkInTime = new Date(attendance.checkIn);
    const durationMs = Math.max(0, checkOutTime.getTime() - checkInTime.getTime());
    const workedHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));

    // Determine status (check for OVERTIME against scheduled daily hours)
    let finalStatus = attendance.status;

    if (attendance.employee?.workingSchedule?.lines?.length) {
      const todayWeekday = this.getWeekdayEnum(checkInTime);
      const scheduleLine = attendance.employee.workingSchedule.lines.find(
        (line) => line.day === todayWeekday
      );

      if (scheduleLine) {
        const startMin = this.parseTimeToMinutes(scheduleLine.startTime);
        const endMin = this.parseTimeToMinutes(scheduleLine.endTime);
        const breakMin = scheduleLine.breakMinutes || 0;
        const dailyScheduledHours = (endMin - startMin - breakMin) / 60;

        if (dailyScheduledHours > 0 && workedHours > dailyScheduledHours + 0.25) {
          finalStatus = 'OVERTIME';
        }
      }
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: checkOutTime,
        workedHours,
        status: finalStatus,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return {
      ...updated,
      workedHours: Number(updated.workedHours),
    };
  }

  /**
   * Correct attendance record (Admin, HR Manager, HR Payroll User, HR Payroll Manager)
   */
  async correctAttendance(id, data, adminUserId) {
    const attendance = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!attendance) {
      throw ApiError.notFound('Attendance record not found.', 'ATTENDANCE_NOT_FOUND');
    }

    let calculatedHours = attendance.workedHours ? Number(attendance.workedHours) : null;
    const finalCheckIn = data.checkIn !== undefined ? (data.checkIn ? new Date(data.checkIn) : null) : attendance.checkIn;
    const finalCheckOut = data.checkOut !== undefined ? (data.checkOut ? new Date(data.checkOut) : null) : attendance.checkOut;

    if (data.workedHours !== undefined && data.workedHours !== null) {
      calculatedHours = data.workedHours;
    } else if (finalCheckIn && finalCheckOut) {
      const diffMs = Math.max(0, new Date(finalCheckOut).getTime() - new Date(finalCheckIn).getTime());
      calculatedHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        checkIn: finalCheckIn,
        checkOut: finalCheckOut,
        workedHours: calculatedHours,
        status: data.status || 'MANUALLY_CORRECTED',
        correctedById: adminUserId,
        correctionNote: data.correctionNote,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: { select: { id: true, name: true } },
            jobPosition: { select: { id: true, title: true } },
          },
        },
        correctedBy: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    return {
      ...updated,
      workedHours: updated.workedHours !== null ? Number(updated.workedHours) : null,
    };
  }
}

module.exports = new AttendanceService();
