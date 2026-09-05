const attendanceService = require('./attendance.service');
const {
  attendanceIdSchema,
  checkInSchema,
  checkOutSchema,
  correctAttendanceSchema,
  listAttendanceQuerySchema,
} = require('./attendance.validation');
const { ApiResponse, ApiError } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

class AttendanceController {
  /**
   * GET /api/attendance
   */
  getAttendanceList = asyncHandler(async (req, res) => {
    const filters = listAttendanceQuerySchema.parse(req.query);
    if (req.user.role === 'EMPLOYEE') {
      filters.employeeId = req.user.employeeId;
    }
    const records = await attendanceService.getAttendanceList({
      ...filters,
      userRole: req.user.role,
    });
    return ApiResponse.success(res, records, 'Attendance records retrieved successfully');
  });

  /**
   * GET /api/attendance/today-status
   */
  getTodayStatus = asyncHandler(async (req, res) => {
    const status = await attendanceService.getTodayStatus(req.user.employeeId);
    return ApiResponse.success(res, status, 'Today attendance status retrieved successfully');
  });

  /**
   * GET /api/attendance/:id
   */
  getAttendanceById = asyncHandler(async (req, res) => {
    const { id } = attendanceIdSchema.parse(req.params);
    const record = await attendanceService.getAttendanceById(id);

    // If regular Employee, block access to other employees' attendance details
    if (req.user.role === 'EMPLOYEE' && record.employeeId !== req.user.employeeId) {
      throw ApiError.forbidden('You are not authorized to view this attendance record', 'FORBIDDEN');
    }

    return ApiResponse.success(res, record, 'Attendance record retrieved successfully');
  });

  /**
   * POST /api/attendance/check-in
   */
  checkIn = asyncHandler(async (req, res) => {
    const body = checkInSchema.parse(req.body);
    const employeeId =
      req.user.role === 'EMPLOYEE' || !body.employeeId
        ? req.user.employeeId
        : body.employeeId;

    if (!employeeId) {
      throw ApiError.badRequest(
        'No employee profile linked to this user account.',
        null,
        'NO_LINKED_EMPLOYEE'
      );
    }

    const record = await attendanceService.checkIn({ employeeId });
    return ApiResponse.created(res, record, 'Checked in successfully');
  });

  /**
   * PATCH /api/attendance/:id/check-out OR POST /api/attendance/check-out
   */
  checkOut = asyncHandler(async (req, res) => {
    const id = req.params.id;
    let employeeId = null;

    if (!id) {
      const body = checkOutSchema.parse(req.body);
      employeeId =
        req.user.role === 'EMPLOYEE' || !body.employeeId
          ? req.user.employeeId
          : body.employeeId;

      if (!employeeId) {
        throw ApiError.badRequest(
          'No employee profile linked to this user account.',
          null,
          'NO_LINKED_EMPLOYEE'
        );
      }
    }

    const record = await attendanceService.checkOut({ id, employeeId });
    return ApiResponse.success(res, record, 'Checked out successfully');
  });

  /**
   * PATCH /api/attendance/:id/correct
   * Accessible by ADMIN, HR_MANAGER, HR_PAYROLL_USER, HR_PAYROLL_MANAGER
   */
  correctAttendance = asyncHandler(async (req, res) => {
    const { id } = attendanceIdSchema.parse(req.params);
    const data = correctAttendanceSchema.parse(req.body);

    const record = await attendanceService.correctAttendance(id, data, req.user.id);
    return ApiResponse.success(res, record, 'Attendance record corrected successfully');
  });
}

module.exports = new AttendanceController();
