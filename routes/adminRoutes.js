const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/admin');

// All routes require authentication and admin role
router.use(authenticate);
router.use(adminMiddleware);

// System stats
router.get('/stats', AdminController.getSystemStats);
router.get('/activity', AdminController.getRecentActivity);

// User management
router.get('/users', AdminController.getAllUsers);
router.get('/users/:userId', AdminController.getUserDetails);
router.put('/users/:userId', AdminController.updateUser);
router.delete('/users/:userId', AdminController.deleteUser);

// Link management
router.get('/links', AdminController.getAllLinks);
router.delete('/links/:linkId', AdminController.deleteLink);

module.exports = router;
