const { Router } = require('express');
const authController = require('./auth.controller');
const { authenticate } = require('../../middleware/auth.middleware');

const router = Router();

// Public routes
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.patch('/change-password', authenticate, authController.changePassword);

module.exports = router;
