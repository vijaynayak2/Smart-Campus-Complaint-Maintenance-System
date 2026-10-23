const bcrypt = require('bcryptjs');
const db = require('../config/db');

/**
 * Get All Users (Admin Only)
 * GET /api/users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;

    let queryStr = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.department, 
        u.phone, 
        u.user_type, 
        u.created_at,
        (SELECT COUNT(*) FROM complaints WHERE user_id = u.id) AS filed_count,
        (SELECT COUNT(*) FROM complaints WHERE assigned_to = u.id) AS assigned_count
      FROM users u
      WHERE 1=1
    `;
    const params = [];

    if (role && role !== 'all') {
      queryStr += ' AND u.role = ?';
      params.push(role);
    }

    if (search && search.trim() !== '') {
      const s = `%${search.trim()}%`;
      queryStr += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.department LIKE ?)';
      params.push(s, s, s);
    }

    queryStr += ' ORDER BY u.created_at DESC';

    const [users] = await db.query(queryStr, params);

    return res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (err) {
    console.error('Get all users error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users.'
    });
  }
};

/**
 * Get Staff Members (For Assignment Dropdowns)
 * GET /api/users/staff
 */
exports.getStaffList = async (req, res) => {
  try {
    const [staff] = await db.query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.department, 
        u.phone,
        (SELECT COUNT(*) FROM complaints WHERE assigned_to = u.id AND status IN ('Assigned', 'In Progress')) AS active_tasks_count
      FROM users u
      WHERE u.role = 'staff'
      ORDER BY u.name ASC
    `);

    return res.json({
      success: true,
      count: staff.length,
      staff
    });
  } catch (err) {
    console.error('Get staff list error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve maintenance staff list.'
    });
  }
};

/**
 * Create New User (Admin Only)
 * POST /api/users
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, department, phone, user_type } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required.'
      });
    }

    const validRoles = ['student', 'staff', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed roles: ${validRoles.join(', ')}`
      });
    }

    // Check if email taken
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (name, email, password, role, department, phone, user_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        email.toLowerCase().trim(),
        hashedPassword,
        role,
        department ? department.trim() : null,
        phone ? phone.trim() : null,
        user_type || (role === 'staff' ? 'Maintenance Staff' : role === 'admin' ? 'Administrator' : 'Student')
      ]
    );

    return res.status(201).json({
      success: true,
      message: `User "${name}" created successfully with role "${role}".`,
      user: {
        id: result.insertId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role,
        department,
        phone
      }
    });
  } catch (err) {
    console.error('Create user error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user.'
    });
  }
};

/**
 * Update User Role or Details (Admin Only)
 * PUT /api/users/:id
 */
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role, department, phone, user_type } = req.body;

    const [rows] = await db.query('SELECT id, email, role FROM users WHERE id = ?', [userId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Prevent removing the last admin
    if (rows[0].role === 'admin' && role && role !== 'admin') {
      const [adminCount] = await db.query("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
      if (adminCount[0].count <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change role. At least one administrator must remain active.'
        });
      }
    }

    await db.query(
      `UPDATE users 
       SET role = COALESCE(?, role),
           department = COALESCE(?, department),
           phone = COALESCE(?, phone),
           user_type = COALESCE(?, user_type)
       WHERE id = ?`,
      [role || null, department || null, phone || null, user_type || null, userId]
    );

    return res.json({
      success: true,
      message: 'User account updated successfully.'
    });
  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user.'
    });
  }
};
