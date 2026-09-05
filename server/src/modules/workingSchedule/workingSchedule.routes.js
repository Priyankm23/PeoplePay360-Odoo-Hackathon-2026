const { Router } = require('express');
const workingScheduleController = require('./workingSchedule.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

const router = Router();

// All working schedule routes require authentication
router.use(authenticate);

// List all working schedules & retrieve single working schedule by ID
router.get('/', workingScheduleController.getWorkingSchedules);
router.get('/:id', workingScheduleController.getWorkingScheduleById);

// Create and update working schedules (Admin and HR Manager only)
router.post(
  '/',
  authorize('ADMIN', 'HR_MANAGER'),
  workingScheduleController.createWorkingSchedule
);

router.patch(
  '/:id',
  authorize('ADMIN', 'HR_MANAGER'),
  workingScheduleController.updateWorkingSchedule
);

router.delete(
  '/:id',
  authorize('ADMIN', 'HR_MANAGER'),
  workingScheduleController.archiveWorkingSchedule
);

module.exports = router;
