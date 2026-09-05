const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Accessible by Admin, HR Payroll Manager, HR Payroll User, and HR Manager (with redacted salary)
const DASHBOARD_ROLES = ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'HR_MANAGER'];

router.use(authenticate);

router.get(
  '/',
  authorize(DASHBOARD_ROLES),
  dashboardController.getDashboard
);

module.exports = router;
