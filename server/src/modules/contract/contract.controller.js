const contractService = require('./contract.service');
const {
  createContractSchema,
  updateContractSchema,
  queryContractSchema,
} = require('./contract.validation');

class ContractController {
  async getContractsList(req, res, next) {
    try {
      const validatedQuery = queryContractSchema.parse(req.query);
      const contracts = await contractService.getContractsList(validatedQuery);
      res.status(200).json({
        success: true,
        data: contracts,
      });
    } catch (error) {
      next(error);
    }
  }

  async getContractById(req, res, next) {
    try {
      const contract = await contractService.getContractById(req.params.id);
      res.status(200).json({
        success: true,
        data: contract,
      });
    } catch (error) {
      next(error);
    }
  }

  async createContract(req, res, next) {
    try {
      const validatedData = createContractSchema.parse(req.body);
      const contract = await contractService.createContract(validatedData, req.user, {
        ip: req.ip,
      });
      res.status(201).json({
        success: true,
        message: 'Contract created successfully',
        data: contract,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateContract(req, res, next) {
    try {
      const validatedData = updateContractSchema.parse(req.body);
      const contract = await contractService.updateContract(
        req.params.id,
        validatedData,
        req.user,
        { ip: req.ip }
      );
      res.status(200).json({
        success: true,
        message: 'Contract updated successfully',
        data: contract,
      });
    } catch (error) {
      next(error);
    }
  }

  async activateContract(req, res, next) {
    try {
      const contract = await contractService.activateContract(req.params.id, req.user, {
        ip: req.ip,
      });
      res.status(200).json({
        success: true,
        message: 'Contract activated successfully',
        data: contract,
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelContract(req, res, next) {
    try {
      const contract = await contractService.cancelContract(req.params.id, req.user, {
        ip: req.ip,
      });
      res.status(200).json({
        success: true,
        message: 'Contract cancelled successfully',
        data: contract,
      });
    } catch (error) {
      next(error);
    }
  }

  async archiveContract(req, res, next) {
    try {
      const result = await contractService.archiveContract(req.params.id, req.user, {
        ip: req.ip,
      });
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLookupOptions(req, res, next) {
    try {
      const options = await contractService.getLookupOptions();
      res.status(200).json({
        success: true,
        data: options,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContractController();
