const express = require('express');
const payrunsRouter = express.Router();
const payslipsRouter = express.Router();
const payrunController = require('./payrun.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// All payrun/payslip endpoints require authentication
payrunsRouter.use(authenticate);
payslipsRouter.use(authenticate);

// Role groupings per overview.md §5 and features.md §9, §10, §11:
const PAYRUN_READ_ROLES = ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'];
const PAYRUN_OPERATOR_ROLES = ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'];
const PAYRUN_MANAGER_ROLES = ['ADMIN', 'HR_PAYROLL_MANAGER'];
const PAYSLIP_READ_ROLES = ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'EMPLOYEE'];

// ==========================================
// Payruns Routes (/api/payruns)
// ==========================================

// Wizard Step 1: Preview eligible employees (Zero DB persistence)
payrunsRouter.post(
  '/preview-eligible',
  authorize(PAYRUN_OPERATOR_ROLES),
  payrunController.previewEligible
);
payrunsRouter.get(
  '/preview-eligible',
  authorize(PAYRUN_OPERATOR_ROLES),
  payrunController.previewEligible
);

// List all payruns
payrunsRouter.get(
  '/',
  authorize(PAYRUN_READ_ROLES),
  payrunController.getPayruns
);

// Get single payrun detail
payrunsRouter.get(
  '/:id',
  authorize(PAYRUN_READ_ROLES),
  payrunController.getPayrunById
);

// Wizard Step 2: Confirm and create Payrun with DRAFT Payslips
payrunsRouter.post(
  '/',
  authorize(PAYRUN_OPERATOR_ROLES),
  payrunController.createPayrun
);

// Compute / Recompute Payrun (Batch rule engine execution)
payrunsRouter.post(
  '/:id/compute',
  authorize(PAYRUN_OPERATOR_ROLES),
  payrunController.computePayrun
);

// Validate Payrun (Checks blocking warnings, transitions to VALIDATED)
payrunsRouter.post(
  '/:id/validate',
  authorize(PAYRUN_OPERATOR_ROLES),
  payrunController.validatePayrun
);

// Mark Paid (Irreversible, HR Payroll Manager & Admin only)
payrunsRouter.post(
  '/:id/mark-paid',
  authorize(PAYRUN_MANAGER_ROLES),
  payrunController.markPaid
);

// Delete Payrun (Permitted only in DRAFT or COMPUTED, HR Payroll Manager & Admin only)
payrunsRouter.delete(
  '/:id',
  authorize(PAYRUN_MANAGER_ROLES),
  payrunController.deletePayrun
);

// ==========================================
// Payslips Routes (/api/payslips)
// ==========================================

// List payslips (All for payroll staff, self-scoped for Employee)
payslipsRouter.get(
  '/',
  authorize(PAYSLIP_READ_ROLES),
  payrunController.getPayslips
);

// Get detailed payslip with lines ordered by sequence
payslipsRouter.get(
  '/:id',
  authorize(PAYSLIP_READ_ROLES),
  payrunController.getPayslipById
);

module.exports = {
  payrunsRouter,
  payslipsRouter,
};
