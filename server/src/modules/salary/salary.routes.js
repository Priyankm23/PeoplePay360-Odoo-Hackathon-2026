const express = require('express');
const structuresRouter = express.Router();
const rulesRouter = express.Router();
const salaryController = require('./salary.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// All salary endpoints require authentication
structuresRouter.use(authenticate);
rulesRouter.use(authenticate);

// Allowed roles per overview.md §5 and features.md §8:
// - Read: Admin, HR Payroll Manager, HR Payroll User
// - Write: Admin, HR Payroll Manager
const READ_ROLES = ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'];
const WRITE_ROLES = ['ADMIN', 'HR_PAYROLL_MANAGER'];

// ==========================================
// Salary Structures Routes (/api/salary-structures)
// ==========================================
structuresRouter.get(
  '/',
  authorize(READ_ROLES),
  salaryController.getStructures
);

structuresRouter.get(
  '/:id',
  authorize(READ_ROLES),
  salaryController.getStructureById
);

structuresRouter.post(
  '/',
  authorize(WRITE_ROLES),
  salaryController.createStructure
);

structuresRouter.patch(
  '/:id',
  authorize(WRITE_ROLES),
  salaryController.updateStructure
);

structuresRouter.delete(
  '/:id',
  authorize(WRITE_ROLES),
  salaryController.deleteStructure
);

// Get rules for structure
structuresRouter.get(
  '/:id/rules',
  authorize(READ_ROLES),
  salaryController.getRules
);

// Create rule within structure
structuresRouter.post(
  '/:id/rules',
  authorize(WRITE_ROLES),
  salaryController.createRule
);

// ==========================================
// Salary Rules Routes (/api/salary-rules)
// ==========================================
rulesRouter.get(
  '/',
  authorize(READ_ROLES),
  salaryController.getAllRules
);

rulesRouter.patch(
  '/:id',
  authorize(WRITE_ROLES),
  salaryController.updateRule
);

rulesRouter.delete(
  '/:id',
  authorize(WRITE_ROLES),
  salaryController.deleteRule
);

module.exports = {
  structuresRouter,
  rulesRouter,
};
