const departmentService = require('./department.service');
const { ApiResponse, ApiError } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { z } = require('zod');

const departmentSchema = z.object({
  name: z.string({ required_error: 'Department name is required' }).trim().min(1, 'Department name cannot be empty'),
});
const idParamsSchema = z.object({ id: z.string().uuid('Invalid Department ID') });

class DepartmentController {
  getDepartments = asyncHandler(async (req, res) => {
    const data = await departmentService.getDepartments();
    return ApiResponse.success(res, data, 'Departments retrieved successfully');
  });

  createDepartment = asyncHandler(async (req, res) => {
    const validated = departmentSchema.parse(req.body);
    const data = await departmentService.createDepartment(validated);
    return ApiResponse.created(res, data, 'Department created successfully');
  });

  updateDepartment = asyncHandler(async (req, res) => {
    const validated = departmentSchema.parse(req.body);
    const { id } = idParamsSchema.parse(req.params);
    const data = await departmentService.updateDepartment(id, validated);
    return ApiResponse.success(res, data, 'Department updated successfully');
  });

  archiveDepartment = asyncHandler(async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    const data = await departmentService.archiveDepartment(id);
    return ApiResponse.success(res, data, 'Department archived successfully');
  });
}

module.exports = new DepartmentController();
