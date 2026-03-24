const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Analytics endpoints
router.get('/user', AnalyticsController.getUserAnalytics);
router.get('/links/:linkId', AnalyticsController.getLinkAnalytics);
router.get('/links/:linkId/realtime', AnalyticsController.getRealtimeAnalytics);
router.get('/export', AnalyticsController.exportAnalytics);

module.exports = router;
