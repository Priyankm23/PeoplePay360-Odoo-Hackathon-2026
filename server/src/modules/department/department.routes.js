const { Router } = require('express');
const departmentController = require('./department.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', departmentController.getDepartments);
router.post('/', authorize('ADMIN', 'HR_MANAGER'), departmentController.createDepartment);
router.patch('/:id', authorize('ADMIN', 'HR_MANAGER'), departmentController.updateDepartment);
router.delete('/:id', authorize('ADMIN', 'HR_MANAGER'), departmentController.archiveDepartment);

module.exports = router;
