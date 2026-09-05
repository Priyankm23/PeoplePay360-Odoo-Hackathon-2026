const { Router } = require('express');
const attendanceController = require('./attendance.controller');
const {
  authenticate,
  authorize,
  scopeToSelf,
} = require('../../middleware/auth.middleware');

const router = Router();

// All attendance routes require an authenticated user
router.use(authenticate);

// Quick Widget: Get today's attendance status & active elapsed time for current user
router.get('/today-status', attendanceController.getTodayStatus);

// Check in (self or manager on behalf of employee)
router.post('/check-in', attendanceController.checkIn);

// Check out (self active session)
router.post('/check-out', attendanceController.checkOut);

// Check out specific record by ID
router.patch('/:id/check-out', attendanceController.checkOut);

// List attendance records (scoping to self enforced for EMPLOYEE)
router.get('/', scopeToSelf, attendanceController.getAttendanceList);

// View single attendance record by ID
router.get('/:id', attendanceController.getAttendanceById);

// Manual attendance correction (Admin, HR Manager, HR Payroll User, HR Payroll Manager)
router.patch(
  '/:id/correct',
  authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'),
  attendanceController.correctAttendance
);

module.exports = router;
