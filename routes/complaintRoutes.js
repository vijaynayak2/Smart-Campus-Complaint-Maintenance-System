const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public/semi-public track endpoint (anyone with complaint code can view progress)
router.get('/track/:code', complaintController.trackByCode);

// All following routes require authentication
router.use(authenticate);

// Get list of complaints (role-filtered in controller)
router.get('/', complaintController.getComplaints);

// Submit new complaint (with optional image)
router.post('/', upload.single('image'), complaintController.createComplaint);

// Get single complaint with timeline
router.get('/:id', complaintController.getComplaintById);

// Admin assign staff
router.post('/:id/assign', authorizeRoles('admin'), complaintController.assignStaff);

// Update status (staff or admin, with optional proof image)
router.post('/:id/status', authorizeRoles('admin', 'staff'), upload.single('proof_image'), complaintController.updateStatus);

// Update priority (admin only)
router.post('/:id/priority', authorizeRoles('admin'), complaintController.updatePriority);

// Delete complaint (admin only)
router.delete('/:id', authorizeRoles('admin'), complaintController.deleteComplaint);

module.exports = router;
