const dashboardService = require('./dashboard.service');
const { ApiResponse } = require('../../utils/apiResponse');

class DashboardController {
  async getDashboard(req, res, next) {
    try {
      const { period, departmentId, employeeType } = req.query;
      const data = await dashboardService.getDashboardData(
        { period, departmentId, employeeType },
        req.user
      );
      return ApiResponse.success(res, data, 'Dashboard data retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DashboardController();
