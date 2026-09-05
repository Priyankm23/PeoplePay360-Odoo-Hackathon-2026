const salaryService = require('./salary.service');
const { ApiResponse } = require('../../utils/apiResponse');
const {
  createSalaryStructureSchema,
  updateSalaryStructureSchema,
  createSalaryRuleSchema,
  updateSalaryRuleSchema,
} = require('./salary.validation');

class SalaryController {
  async getStructures(req, res, next) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const structures = await salaryService.getSalaryStructures({ includeInactive });
      return ApiResponse.success(res, structures, 'Salary structures retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getStructureById(req, res, next) {
    try {
      const structure = await salaryService.getSalaryStructureById(req.params.id);
      return ApiResponse.success(res, structure, 'Salary structure retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async createStructure(req, res, next) {
    try {
      const validatedData = createSalaryStructureSchema.parse(req.body);
      const structure = await salaryService.createSalaryStructure(validatedData, req.user, {
        ip: req.ip,
      });
      return ApiResponse.created(res, structure, 'Salary structure created successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateStructure(req, res, next) {
    try {
      const validatedData = updateSalaryStructureSchema.parse(req.body);
      const structure = await salaryService.updateSalaryStructure(req.params.id, validatedData, req.user, {
        ip: req.ip,
      });
      return ApiResponse.success(res, structure, 'Salary structure updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async deleteStructure(req, res, next) {
    try {
      const result = await salaryService.deleteSalaryStructure(req.params.id, req.user, {
        ip: req.ip,
      });
      return ApiResponse.success(res, result, 'Salary structure archived successfully');
    } catch (err) {
      next(err);
    }
  }

  async getAllRules(req, res, next) {
    try {
      const { structureId } = req.query;
      const rules = await salaryService.getAllSalaryRules({ structureId });
      return ApiResponse.success(res, rules, 'Salary rules retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getRules(req, res, next) {
    try {
      const rules = await salaryService.getStructureRules(req.params.id);
      return ApiResponse.success(res, rules, 'Salary rules retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async createRule(req, res, next) {
    try {
      const validatedData = createSalaryRuleSchema.parse(req.body);
      const rule = await salaryService.createSalaryRule(req.params.id, validatedData, req.user, {
        ip: req.ip,
      });
      return ApiResponse.created(res, rule, 'Salary rule created successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateRule(req, res, next) {
    try {
      const validatedData = updateSalaryRuleSchema.parse(req.body);
      const rule = await salaryService.updateSalaryRule(req.params.id, validatedData, req.user, {
        ip: req.ip,
      });
      return ApiResponse.success(res, rule, 'Salary rule updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async deleteRule(req, res, next) {
    try {
      const result = await salaryService.deleteSalaryRule(req.params.id, req.user, {
        ip: req.ip,
      });
      return ApiResponse.success(res, result, 'Salary rule removed successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SalaryController();
