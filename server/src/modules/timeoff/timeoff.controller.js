const timeOffService = require('./timeoff.service');
const {
  createTimeOffTypeSchema,
  updateTimeOffTypeSchema,
  createAllocationSchema,
  queryAllocationSchema,
  createRequestSchema,
  refusalSchema,
  queryRequestSchema,
} = require('./timeoff.validation');

class TimeOffController {
  // =======================================================
  // 1. TIME OFF TYPES
  // =======================================================

  async listTypes(req, res, next) {
    try {
      const types = await timeOffService.listTypes();
      res.status(200).json({
        success: true,
        data: types,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTypeById(req, res, next) {
    try {
      const type = await timeOffService.getTypeById(req.params.id);
      res.status(200).json({
        success: true,
        data: type,
      });
    } catch (error) {
      next(error);
    }
  }

  async createType(req, res, next) {
    try {
      const validated = createTimeOffTypeSchema.parse(req.body);
      const created = await timeOffService.createType(validated, req.user.id);
      res.status(201).json({
        success: true,
        message: 'Time off type created successfully',
        data: created,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateType(req, res, next) {
    try {
      const validated = updateTimeOffTypeSchema.parse(req.body);
      const updated = await timeOffService.updateType(req.params.id, validated, req.user.id);
      res.status(200).json({
        success: true,
        message: 'Time off type updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async archiveType(req, res, next) {
    try {
      const archived = await timeOffService.archiveType(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: 'Time off type archived successfully',
        data: archived,
      });
    } catch (error) {
      next(error);
    }
  }

  // =======================================================
  // 2. TIME OFF ALLOCATIONS
  // =======================================================

  async listAllocations(req, res, next) {
    try {
      const query = queryAllocationSchema.parse(req.query);
      const allocations = await timeOffService.listAllocations({
        ...query,
        user: req.user,
      });
      res.status(200).json({
        success: true,
        data: allocations,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllocationById(req, res, next) {
    try {
      const alloc = await timeOffService.getAllocationById(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data: alloc,
      });
    } catch (error) {
      next(error);
    }
  }

  async createAllocation(req, res, next) {
    try {
      const validated = createAllocationSchema.parse(req.body);
      const created = await timeOffService.createAllocation(validated, req.user.id);
      res.status(201).json({
        success: true,
        message: 'Time off allocation created successfully',
        data: created,
      });
    } catch (error) {
      next(error);
    }
  }

  async approveAllocation(req, res, next) {
    try {
      const approved = await timeOffService.approveAllocation(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: 'Time off allocation approved successfully',
        data: approved,
      });
    } catch (error) {
      next(error);
    }
  }

  async refuseAllocation(req, res, next) {
    try {
      const refused = await timeOffService.refuseAllocation(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: 'Time off allocation refused successfully',
        data: refused,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAllocation(req, res, next) {
    try {
      const result = await timeOffService.deleteAllocation(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // =======================================================
  // 3. TIME OFF REQUESTS
  // =======================================================

  async listRequests(req, res, next) {
    try {
      const query = queryRequestSchema.parse(req.query);
      const requests = await timeOffService.listRequests({
        ...query,
        user: req.user,
      });
      res.status(200).json({
        success: true,
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRequestById(req, res, next) {
    try {
      const request = await timeOffService.getRequestById(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data: request,
      });
    } catch (error) {
      next(error);
    }
  }

  async createRequest(req, res, next) {
    try {
      const validated = createRequestSchema.parse(req.body);
      const created = await timeOffService.createRequest(validated, req.user);
      res.status(201).json({
        success: true,
        message: 'Time off request submitted successfully',
        data: created,
      });
    } catch (error) {
      next(error);
    }
  }

  async approveRequest(req, res, next) {
    try {
      const approved = await timeOffService.approveRequest(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: 'Time off request approved successfully',
        data: approved,
      });
    } catch (error) {
      next(error);
    }
  }

  async refuseRequest(req, res, next) {
    try {
      const validated = refusalSchema.parse(req.body);
      const refused = await timeOffService.refuseRequest(req.params.id, validated, req.user.id);
      res.status(200).json({
        success: true,
        message: 'Time off request refused successfully',
        data: refused,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteRequest(req, res, next) {
    try {
      const result = await timeOffService.deleteRequest(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TimeOffController();
