const { Router } = require('express');
const employeeController = require('./employee.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { employeeImageUpload, uploadEmployeeImage } = require('../../middleware/upload.middleware');

const router = Router();

// All employee routes require authentication
router.use(authenticate);

// Read routes: All authenticated roles can read (scoping enforced inside service per role)
router.get('/', employeeController.getEmployees);
router.get('/:id', employeeController.getEmployeeById);

// Write routes: Admin and HR Manager only
router.post('/', authorize('ADMIN', 'HR_MANAGER'), employeeImageUpload, uploadEmployeeImage, employeeController.createEmployee);
router.patch('/:id', authorize('ADMIN', 'HR_MANAGER'), employeeImageUpload, uploadEmployeeImage, employeeController.updateEmployee);
router.delete('/:id', authorize('ADMIN', 'HR_MANAGER'), employeeController.archiveEmployee);

module.exports = router;
