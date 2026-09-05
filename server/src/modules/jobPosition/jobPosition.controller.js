const jobPositionService = require('./jobPosition.service');
const { ApiResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { z } = require('zod');

const jobPositionSchema = z.object({
  title: z.string({ required_error: 'Job title is required' }).trim().min(1, 'Title cannot be empty'),
  departmentId: z.string().uuid('Invalid Department ID').optional().nullable(),
});

class JobPositionController {
  getJobPositions = asyncHandler(async (req, res) => {
    const data = await jobPositionService.getJobPositions(req.query.departmentId);
    return ApiResponse.success(res, data, 'Job positions retrieved successfully');
  });

  createJobPosition = asyncHandler(async (req, res) => {
    const validated = jobPositionSchema.parse(req.body);
    const data = await jobPositionService.createJobPosition(validated);
    return ApiResponse.created(res, data, 'Job position created successfully');
  });

  updateJobPosition = asyncHandler(async (req, res) => {
    const validated = jobPositionSchema.partial().parse(req.body);
    const data = await jobPositionService.updateJobPosition(req.params.id, validated);
    return ApiResponse.success(res, data, 'Job position updated successfully');
  });

  archiveJobPosition = asyncHandler(async (req, res) => {
    const data = await jobPositionService.archiveJobPosition(req.params.id);
    return ApiResponse.success(res, data, 'Job position archived successfully');
  });
}

module.exports = new JobPositionController();
