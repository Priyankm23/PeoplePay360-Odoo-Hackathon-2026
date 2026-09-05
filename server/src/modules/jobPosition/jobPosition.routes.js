const { Router } = require('express');
const jobPositionController = require('./jobPosition.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', jobPositionController.getJobPositions);
router.post('/', authorize('ADMIN', 'HR_MANAGER'), jobPositionController.createJobPosition);
router.patch('/:id', authorize('ADMIN', 'HR_MANAGER'), jobPositionController.updateJobPosition);
router.delete('/:id', authorize('ADMIN', 'HR_MANAGER'), jobPositionController.archiveJobPosition);

module.exports = router;
