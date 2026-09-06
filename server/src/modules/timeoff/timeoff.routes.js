const express = require('express');
const timeOffController = require('./timeoff.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// =======================================================
// 1. TIME OFF TYPES ROUTER
// =======================================================
const typesRouter = express.Router();
typesRouter.use(authenticate);

typesRouter.get('/', timeOffController.listTypes);
typesRouter.get('/:id', timeOffController.getTypeById);
typesRouter.post('/', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'), timeOffController.createType);
typesRouter.patch('/:id', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'), timeOffController.updateType);
typesRouter.delete('/:id', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'), timeOffController.archiveType);

// =======================================================
// 2. TIME OFF ALLOCATIONS ROUTER
// =======================================================
const allocationsRouter = express.Router();
allocationsRouter.use(authenticate);

allocationsRouter.get('/', timeOffController.listAllocations);
allocationsRouter.get('/:id', timeOffController.getAllocationById);
allocationsRouter.post('/', authorize('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'), timeOffController.createAllocation);
allocationsRouter.patch('/:id/approve', authorize('ADMIN', 'HR_MANAGER'), timeOffController.approveAllocation);
allocationsRouter.patch('/:id/refuse', authorize('ADMIN', 'HR_MANAGER'), timeOffController.refuseAllocation);
allocationsRouter.delete('/:id', authorize('ADMIN', 'HR_MANAGER'), timeOffController.deleteAllocation);

// =======================================================
// 3. TIME OFF REQUESTS ROUTER
// =======================================================
const requestsRouter = express.Router();
requestsRouter.use(authenticate);

requestsRouter.get('/', timeOffController.listRequests);
requestsRouter.get('/:id', timeOffController.getRequestById);
requestsRouter.post('/', timeOffController.createRequest);
requestsRouter.patch('/:id/approve', authorize('ADMIN', 'HR_MANAGER'), timeOffController.approveRequest);
requestsRouter.patch('/:id/refuse', authorize('ADMIN', 'HR_MANAGER'), timeOffController.refuseRequest);
requestsRouter.delete('/:id', timeOffController.deleteRequest);

module.exports = {
  typesRouter,
  allocationsRouter,
  requestsRouter,
};
