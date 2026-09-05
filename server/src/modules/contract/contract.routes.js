const express = require('express');
const router = express.Router();
const contractController = require('./contract.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// All contract endpoints require authentication
router.use(authenticate);

// Lookup metadata (Salary Structures, Working Schedules) for contract creation
router.get(
  '/meta/lookup',
  authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'),
  contractController.getLookupOptions
);

// List contracts - Admin, HR Manager, HR Payroll roles only (Employee blocked)
router.get(
  '/',
  authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'),
  contractController.getContractsList
);

// Get single contract details
router.get(
  '/:id',
  authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'),
  contractController.getContractById
);

// Create new contract - Admin, HR Manager only
router.post(
  '/',
  authorize('ADMIN', 'HR_MANAGER'),
  contractController.createContract
);

// Update contract - Admin, HR Manager only
router.patch(
  '/:id',
  authorize('ADMIN', 'HR_MANAGER'),
  contractController.updateContract
);

// Activate contract - Admin, HR Manager only (runs overlap check and auto-expiration)
router.patch(
  '/:id/activate',
  authorize('ADMIN', 'HR_MANAGER'),
  contractController.activateContract
);

// Cancel contract - Admin, HR Manager only
router.patch(
  '/:id/cancel',
  authorize('ADMIN', 'HR_MANAGER'),
  contractController.cancelContract
);

// Soft-delete / Archive contract - Admin, HR Manager only
router.delete(
  '/:id',
  authorize('ADMIN', 'HR_MANAGER'),
  contractController.archiveContract
);

module.exports = router;
