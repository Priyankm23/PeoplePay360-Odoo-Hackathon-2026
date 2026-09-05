const payrunService = require('./payrun.service');
const {
  previewEligibleSchema,
  createPayrunSchema,
  updatePayrunSchema,
} = require('./payrun.validation');
const { ApiResponse } = require('../../utils/apiResponse');

class PayrunController {
  async previewEligible(req, res, next) {
    try {
      const input =
        req.body && Object.keys(req.body).length > 0 ? req.body : req.query;
      const validatedData = previewEligibleSchema.parse(input);
      const preview = await payrunService.previewEligible(validatedData);
      return ApiResponse.success(res, preview, 'Eligible employees previewed successfully');
    } catch (err) {
      next(err);
    }
  }

  async createPayrun(req, res, next) {
    try {
      const validatedData = createPayrunSchema.parse(req.body);
      const payrun = await payrunService.createPayrun(validatedData, req.user, {
        ip: req.ip,
      });
      return ApiResponse.created(res, payrun, 'Payrun created successfully in DRAFT status');
    } catch (err) {
      next(err);
    }
  }

  async getPayruns(req, res, next) {
    try {
      const { status, search } = req.query;
      const payruns = await payrunService.getPayruns({ status, search });
      return ApiResponse.success(res, payruns, 'Payruns retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getPayrunById(req, res, next) {
    try {
      const payrun = await payrunService.getPayrunById(req.params.id);
      return ApiResponse.success(res, payrun, 'Payrun retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async computePayrun(req, res, next) {
    try {
      const result = await payrunService.computePayrun(req.params.id, req.user, {
        ip: req.ip,
      });
      return ApiResponse.success(res, result, 'Payrun computed successfully');
    } catch (err) {
      next(err);
    }
  }

  async validatePayrun(req, res, next) {
    try {
      const result = await payrunService.validatePayrun(req.params.id, req.user, {
        ip: req.ip,
      });
      return ApiResponse.success(res, result, 'Payrun validated successfully');
    } catch (err) {
      next(err);
    }
  }

  async markPaid(req, res, next) {
    try {
      const result = await payrunService.markPaid(req.params.id, req.user, {
        ip: req.ip,
      });
      return ApiResponse.success(res, result, 'Payrun marked as paid successfully');
    } catch (err) {
      next(err);
    }
  }

  async deletePayrun(req, res, next) {
    try {
      const result = await payrunService.deletePayrun(req.params.id, req.user, {
        ip: req.ip,
      });
      return ApiResponse.success(res, result, 'Payrun deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  async getPayslips(req, res, next) {
    try {
      const { payrunId, employeeId, status } = req.query;
      const payslips = await payrunService.getPayslips(
        { payrunId, employeeId, status },
        req.user
      );
      return ApiResponse.success(res, payslips, 'Payslips retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getPayslipById(req, res, next) {
    try {
      const payslip = await payrunService.getPayslipById(req.params.id, req.user);
      return ApiResponse.success(res, payslip, 'Payslip retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PayrunController();
