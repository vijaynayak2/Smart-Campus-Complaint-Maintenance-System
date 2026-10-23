const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.use(authenticate);

// Staff list for task assignment (accessible by admin and staff)
router.get('/staff', authorizeRoles('admin', 'staff'), userController.getStaffList);

// Admin-only user management
router.get('/', authorizeRoles('admin'), userController.getAllUsers);
router.post('/', authorizeRoles('admin'), userController.createUser);
router.put('/:id', authorizeRoles('admin'), userController.updateUser);

module.exports = router;
