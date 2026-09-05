const workingScheduleService = require('./workingSchedule.service');
const {
  createWorkingScheduleSchema,
  updateWorkingScheduleSchema,
} = require('./workingSchedule.validation');
const { ApiResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

class WorkingScheduleController {
  /**
   * GET /api/working-schedules
   * Retrieves all active working schedules with weekly hours & associated counts.
   */
  getWorkingSchedules = asyncHandler(async (req, res) => {
    const schedules = await workingScheduleService.getWorkingSchedules();
    return ApiResponse.success(res, schedules, 'Working schedules retrieved successfully');
  });

  /**
   * GET /api/working-schedules/:id
   * Retrieves a single working schedule by ID.
   */
  getWorkingScheduleById = asyncHandler(async (req, res) => {
    const schedule = await workingScheduleService.getWorkingScheduleById(req.params.id);
    return ApiResponse.success(res, schedule, 'Working schedule retrieved successfully');
  });

  /**
   * POST /api/working-schedules
   * Admin and HR Manager only - creates a new working schedule.
   */
  createWorkingSchedule = asyncHandler(async (req, res) => {
    const validatedData = createWorkingScheduleSchema.parse(req.body);
    const createdSchedule = await workingScheduleService.createWorkingSchedule(validatedData);
    return ApiResponse.created(res, createdSchedule, 'Working schedule created successfully');
  });

  /**
   * PATCH /api/working-schedules/:id
   * Admin and HR Manager only - updates an existing working schedule.
   */
  updateWorkingSchedule = asyncHandler(async (req, res) => {
    const validatedData = updateWorkingScheduleSchema.parse(req.body);
    const updatedSchedule = await workingScheduleService.updateWorkingSchedule(req.params.id, validatedData);
    return ApiResponse.success(res, updatedSchedule, 'Working schedule updated successfully');
  });

  /**
   * DELETE /api/working-schedules/:id
   * Admin and HR Manager only - soft deletes (archives) an existing working schedule.
   */
  archiveWorkingSchedule = asyncHandler(async (req, res) => {
    const data = await workingScheduleService.archiveWorkingSchedule(req.params.id);
    return ApiResponse.success(res, data, 'Working schedule archived successfully');
  });
}

module.exports = new WorkingScheduleController();
