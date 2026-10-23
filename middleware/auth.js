const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'ajiet_campusfix_super_secure_jwt_secret_key_2026_mangalore';

/**
 * Authentication Middleware
 * Extracts JWT token from Authorization header or cookie, verifies it,
 * and attaches the authenticated user object to req.user.
 */
async function authenticate(req, res, next) {
  try {
    let token = null;

    // Check Authorization header: "Bearer <token>"
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      // Check HTTP cookie
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to continue.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Retrieve user from DB to ensure account is active and role is up-to-date
    const [rows] = await db.query(
      'SELECT id, name, email, role, department, phone, user_type FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User session expired or user no longer exists.'
      });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid or malformed authentication token.'
    });
  }
}

/**
 * Role-Based Access Control Middleware
 * Restricts access to specified roles.
 * Example: authorizeRoles('admin') or authorizeRoles('admin', 'staff')
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role "${req.user.role}" does not have permission to perform this action.`
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorizeRoles
};
