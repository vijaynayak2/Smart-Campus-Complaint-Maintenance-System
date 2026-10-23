const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Analytics is admin-only
router.get('/', authenticate, authorizeRoles('admin'), analyticsController.getAnalytics);

module.exports = router;
