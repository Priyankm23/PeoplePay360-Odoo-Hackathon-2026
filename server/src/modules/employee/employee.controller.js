const employeeService = require('./employee.service');
const {
  createEmployeeSchema,
  updateEmployeeSchema,
  queryEmployeeSchema,
} = require('./employee.validation');
const { ApiResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { z } = require('zod');

const idParamsSchema = z.object({ id: z.string().uuid('Invalid Employee ID') });

class EmployeeController {
  /**
   * GET /api/employees
   * List or Kanban view with filtering & pagination
   */
  getEmployees = asyncHandler(async (req, res) => {
    const validatedQuery = queryEmployeeSchema.parse(req.query);
    const result = await employeeService.getEmployees(validatedQuery, req.user);
    return ApiResponse.success(res, result, 'Employees retrieved successfully');
  });

  /**
   * GET /api/employees/:id
   * Single employee profile with smart button metrics
   */
  getEmployeeById = asyncHandler(async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    const employee = await employeeService.getEmployeeById(id, req.user);
    return ApiResponse.success(res, employee, 'Employee profile retrieved successfully');
  });

  /**
   * POST /api/employees
   * Admin and HR Manager only
   */
  createEmployee = asyncHandler(async (req, res) => {
    const validatedData = createEmployeeSchema.parse(req.body);
    const result = await employeeService.createEmployee(validatedData, req.user);
    return ApiResponse.created(res, result, 'Employee created successfully');
  });

  /**
   * PATCH /api/employees/:id
   * Admin and HR Manager only
   */
  updateEmployee = asyncHandler(async (req, res) => {
    const validatedData = updateEmployeeSchema.parse(req.body);
    const { id } = idParamsSchema.parse(req.params);
    const updated = await employeeService.updateEmployee(id, validatedData, req.user);
    return ApiResponse.success(res, updated, 'Employee updated successfully');
  });

  /**
   * DELETE /api/employees/:id (Soft-delete / Archive)
   * Admin and HR Manager only
   */
  archiveEmployee = asyncHandler(async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    const result = await employeeService.archiveEmployee(id, req.user);
    return ApiResponse.success(res, result, 'Employee archived successfully');
  });
}

module.exports = new EmployeeController();
