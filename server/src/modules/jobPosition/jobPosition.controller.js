const jobPositionService = require('./jobPosition.service');
const { ApiResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { idParamsSchema, querySchema, jobPositionSchema } = require('./jobPosition.validation');

class JobPositionController {
  getJobPositions = asyncHandler(async (req, res) => {
    const { departmentId } = querySchema.parse(req.query);
    const data = await jobPositionService.getJobPositions(departmentId);
    return ApiResponse.success(res, data, 'Job positions retrieved successfully');
  });

  createJobPosition = asyncHandler(async (req, res) => {
    const validated = jobPositionSchema.parse(req.body);
    const data = await jobPositionService.createJobPosition(validated);
    return ApiResponse.created(res, data, 'Job position created successfully');
  });

  updateJobPosition = asyncHandler(async (req, res) => {
    const validated = jobPositionSchema.partial().parse(req.body);
    const { id } = idParamsSchema.parse(req.params);
    const data = await jobPositionService.updateJobPosition(id, validated);
    return ApiResponse.success(res, data, 'Job position updated successfully');
  });

  archiveJobPosition = asyncHandler(async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    const data = await jobPositionService.archiveJobPosition(id);
    return ApiResponse.success(res, data, 'Job position archived successfully');
  });
}

module.exports = new JobPositionController();
