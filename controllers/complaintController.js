const db = require('../config/db');

// Valid categories and priorities
const VALID_CATEGORIES = [
  'Electrical',
  'Plumbing',
  'Wi-Fi & Network',
  'Damaged Furniture',
  'Classroom Equipment',
  'Cleanliness & Sanitation',
  'Water Leakage',
  'Other Infrastructure'
];

const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const VALID_STATUSES = ['Submitted', 'Assigned', 'In Progress', 'Resolved', 'Verified'];

/**
 * Generate Next Unique Complaint Code
 * Format: AJIET-YYYY-XXXX (e.g. AJIET-2026-0009)
 */
async function generateComplaintCode() {
  const currentYear = new Date().getFullYear();
  const [rows] = await db.query(
    "SELECT id, complaint_code FROM complaints ORDER BY id DESC LIMIT 1"
  );
  let nextNumber = 1;
  if (rows && rows.length > 0) {
    const lastCode = rows[0].complaint_code;
    const parts = lastCode.split('-');
    if (parts.length >= 3) {
      const num = parseInt(parts[2], 10);
      if (!isNaN(num)) nextNumber = num + 1;
      else nextNumber = (rows[0].id || 0) + 1;
    } else {
      nextNumber = (rows[0].id || 0) + 1;
    }
  }
  return `AJIET-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
}

/**
 * Submit New Complaint
 * POST /api/complaints
 */
exports.createComplaint = async (req, res) => {
  try {
    const { title, category, location, priority, description } = req.body;
    const userId = req.user.id;

    if (!title || !category || !location || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title, category, location, and description are required.'
      });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
    }

    const complaintPriority = VALID_PRIORITIES.includes(priority) ? priority : 'Medium';
    const complaintCode = await generateComplaintCode();
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Insert complaint
    const [result] = await db.query(
      `INSERT INTO complaints (
        complaint_code, user_id, title, category, location, priority, description, image_url, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Submitted')`,
      [
        complaintCode,
        userId,
        title.trim(),
        category,
        location.trim(),
        complaintPriority,
        description.trim(),
        imageUrl
      ]
    );

    const newComplaintId = result.insertId;

    // Log to complaint_updates timeline
    await db.query(
      `INSERT INTO complaint_updates (complaint_id, user_id, status, remarks, proof_image)
       VALUES (?, ?, 'Submitted', ?, ?)`,
      [
        newComplaintId,
        userId,
        `Complaint registered by ${req.user.name} (${req.user.user_type || 'User'}).`,
        null
      ]
    );

    // Fetch created complaint
    const [createdRows] = await db.query(
      `SELECT c.*, u.name AS submitter_name, u.email AS submitter_email, u.department AS submitter_dept
       FROM complaints c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [newComplaintId]
    );

    return res.status(201).json({
      success: true,
      message: `Complaint #${complaintCode} submitted successfully! Our campus maintenance team will review it.`,
      complaint: createdRows[0]
    });
  } catch (err) {
    console.error('Create complaint error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit complaint. Please check your input and try again.'
    });
  }
};

/**
 * Get All Complaints (Role-based filtering)
 * GET /api/complaints
 */
exports.getComplaints = async (req, res) => {
  try {
    const user = req.user;
    const { status, category, priority, location, search, assigned_to } = req.query;

    let queryStr = `
      SELECT 
        c.*,
        u.name AS submitter_name,
        u.email AS submitter_email,
        u.department AS submitter_dept,
        u.phone AS submitter_phone,
        u.user_type AS submitter_type,
        s.name AS assigned_staff_name,
        s.email AS assigned_staff_email,
        s.phone AS assigned_staff_phone,
        v.name AS verified_by_name
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN users s ON c.assigned_to = s.id
      LEFT JOIN users v ON c.verified_by = v.id
      WHERE 1=1
    `;
    const params = [];

    // Role-based restrictions
    if (user.role === 'student') {
      queryStr += ' AND c.user_id = ?';
      params.push(user.id);
    } else if (user.role === 'staff') {
      // Staff sees only complaints assigned to them
      queryStr += ' AND c.assigned_to = ?';
      params.push(user.id);
    }
    // Admin has no user restriction - full access!

    // Filters
    if (status && status !== 'all') {
      queryStr += ' AND c.status = ?';
      params.push(status);
    }

    if (category && category !== 'all') {
      queryStr += ' AND c.category = ?';
      params.push(category);
    }

    if (priority && priority !== 'all') {
      queryStr += ' AND c.priority = ?';
      params.push(priority);
    }

    if (assigned_to && assigned_to !== 'all' && user.role === 'admin') {
      queryStr += ' AND c.assigned_to = ?';
      params.push(assigned_to);
    }

    if (location && location.trim() !== '') {
      queryStr += ' AND c.location LIKE ?';
      params.push(`%${location.trim()}%`);
    }

    if (search && search.trim() !== '') {
      const searchTerm = `%${search.trim()}%`;
      queryStr += ` AND (
        c.complaint_code LIKE ? OR 
        c.title LIKE ? OR 
        c.location LIKE ? OR 
        c.description LIKE ? OR 
        u.name LIKE ?
      )`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    queryStr += ' ORDER BY c.created_at DESC';

    const [rows] = await db.query(queryStr, params);

    return res.json({
      success: true,
      count: rows.length,
      complaints: rows
    });
  } catch (err) {
    console.error('Get complaints error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load complaints.'
    });
  }
};

/**
 * Get Single Complaint Details + Timeline
 * GET /api/complaints/:id
 */
exports.getComplaintById = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const user = req.user;

    const [rows] = await db.query(
      `SELECT 
        c.*,
        u.name AS submitter_name,
        u.email AS submitter_email,
        u.department AS submitter_dept,
        u.phone AS submitter_phone,
        u.user_type AS submitter_type,
        s.name AS assigned_staff_name,
        s.email AS assigned_staff_email,
        s.phone AS assigned_staff_phone,
        v.name AS verified_by_name
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN users s ON c.assigned_to = s.id
      LEFT JOIN users v ON c.verified_by = v.id
      WHERE c.id = ?`,
      [complaintId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    const complaint = rows[0];

    // Authorization check
    if (user.role === 'student' && complaint.user_id !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this complaint.'
      });
    }

    if (user.role === 'staff' && complaint.assigned_to !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'This complaint is not assigned to you.'
      });
    }

    // Fetch timeline updates
    const [timeline] = await db.query(
      `SELECT cu.*, u.name AS user_name, u.role AS user_role, u.user_type
       FROM complaint_updates cu
       LEFT JOIN users u ON cu.user_id = u.id
       WHERE cu.complaint_id = ?
       ORDER BY cu.created_at ASC`,
      [complaintId]
    );

    return res.json({
      success: true,
      complaint,
      timeline
    });
  } catch (err) {
    console.error('Get complaint by ID error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaint details.'
    });
  }
};

/**
 * Track Complaint by Public / Search Code
 * GET /api/complaints/track/:code
 */
exports.trackByCode = async (req, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();

    const [rows] = await db.query(
      `SELECT 
        c.*,
        u.name AS submitter_name,
        u.department AS submitter_dept,
        s.name AS assigned_staff_name,
        v.name AS verified_by_name
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN users s ON c.assigned_to = s.id
      LEFT JOIN users v ON c.verified_by = v.id
      WHERE UPPER(c.complaint_code) = ?`,
      [code]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Complaint with tracking code "${code}" was not found. Please verify the code.`
      });
    }

    const complaint = rows[0];

    // Fetch timeline
    const [timeline] = await db.query(
      `SELECT cu.*, u.name AS user_name, u.role AS user_role
       FROM complaint_updates cu
       LEFT JOIN users u ON cu.user_id = u.id
       WHERE cu.complaint_id = ?
       ORDER BY cu.created_at ASC`,
      [complaint.id]
    );

    return res.json({
      success: true,
      complaint,
      timeline
    });
  } catch (err) {
    console.error('Track complaint error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to track complaint.'
    });
  }
};

/**
 * Assign Staff to Complaint (Admin Only)
 * POST /api/complaints/:id/assign
 */
exports.assignStaff = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { staff_id, priority, remarks } = req.body;

    if (!staff_id) {
      return res.status(400).json({
        success: false,
        message: 'Please select a maintenance staff member to assign.'
      });
    }

    // Verify staff exists and has staff role
    const [staffRows] = await db.query(
      "SELECT id, name, email, department FROM users WHERE id = ? AND role = 'staff'",
      [staff_id]
    );

    if (!staffRows || staffRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'The selected user is not a valid maintenance staff member.'
      });
    }

    const staff = staffRows[0];

    // Check complaint exists
    const [compRows] = await db.query('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!compRows || compRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    const complaint = compRows[0];

    // Lifecycle: If complaint was 'Submitted', advance to 'Assigned'
    const newStatus = complaint.status === 'Submitted' ? 'Assigned' : complaint.status;
    const newPriority = VALID_PRIORITIES.includes(priority) ? priority : complaint.priority;

    await db.query(
      `UPDATE complaints 
       SET assigned_to = ?, status = ?, priority = ?, updated_at = NOW() 
       WHERE id = ?`,
      [staff.id, newStatus, newPriority, complaintId]
    );

    const updateRemarks = remarks && remarks.trim()
      ? `Assigned to ${staff.name} (${staff.department || 'Maintenance'}). Note: ${remarks.trim()}`
      : `Assigned to ${staff.name} (${staff.department || 'Maintenance'}).`;

    // Log update
    await db.query(
      `INSERT INTO complaint_updates (complaint_id, user_id, status, remarks)
       VALUES (?, ?, ?, ?)`,
      [complaintId, req.user.id, newStatus, updateRemarks]
    );

    return res.json({
      success: true,
      message: `Complaint #${complaint.complaint_code} assigned to ${staff.name} successfully.`,
      assigned_to: staff
    });
  } catch (err) {
    console.error('Assign staff error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign staff member.'
    });
  }
};

/**
 * Update Complaint Status (Enforce Lifecycle Transitions)
 * POST /api/complaints/:id/status
 *
 * Lifecycle: Submitted -> Assigned -> In Progress -> Resolved -> Verified
 */
exports.updateStatus = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { status, remarks } = req.body;
    const user = req.user;
    const proofImage = req.file ? `/uploads/${req.file.filename}` : null;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const [rows] = await db.query('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    const complaint = rows[0];
    const currentStatus = complaint.status;

    // Strict Role-Based Lifecycle Enforcement
    if (user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'Students cannot alter complaint status.'
      });
    }

    if (user.role === 'staff') {
      // Must be assigned to this task
      if (complaint.assigned_to !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only update tasks assigned directly to you.'
        });
      }

      // Staff allowed transitions:
      // Assigned -> In Progress
      // In Progress -> Resolved
      if (currentStatus === 'Assigned' && status === 'In Progress') {
        // Valid
      } else if (currentStatus === 'In Progress' && status === 'Resolved') {
        // Valid - proof image and remarks encouraged
      } else {
        return res.status(400).json({
          success: false,
          message: `Invalid transition from "${currentStatus}" to "${status}" for staff role. Allowed: Assigned -> In Progress, In Progress -> Resolved.`
        });
      }
    }

    if (user.role === 'admin') {
      // Admin has full control, but verify rule:
      if (status === 'Verified' && currentStatus !== 'Resolved') {
        return res.status(400).json({
          success: false,
          message: 'A complaint must be marked "Resolved" by maintenance staff before an Admin can verify it.'
        });
      }
    }

    // Build update query
    let updateSql = 'UPDATE complaints SET status = ?, updated_at = NOW()';
    const updateParams = [status];

    if (status === 'Resolved') {
      updateSql += ', resolved_at = NOW()';
      if (proofImage) {
        updateSql += ', proof_image = ?';
        updateParams.push(proofImage);
      }
      if (remarks) {
        updateSql += ', resolution_remarks = ?';
        updateParams.push(remarks.trim());
      }
    } else if (status === 'Verified') {
      updateSql += ', verified_at = NOW(), verified_by = ?';
      updateParams.push(user.id);
      if (remarks) {
        updateSql += ', verification_remarks = ?';
        updateParams.push(remarks.trim());
      }
    }

    updateSql += ' WHERE id = ?';
    updateParams.push(complaintId);

    await db.query(updateSql, updateParams);

    // Timeline update log
    const timelineRemarks = remarks && remarks.trim()
      ? remarks.trim()
      : `Status updated from ${currentStatus} to ${status} by ${user.name} (${user.role}).`;

    await db.query(
      `INSERT INTO complaint_updates (complaint_id, user_id, status, remarks, proof_image)
       VALUES (?, ?, ?, ?, ?)`,
      [complaintId, user.id, status, timelineRemarks, proofImage]
    );

    return res.json({
      success: true,
      message: `Complaint #${complaint.complaint_code} status updated to "${status}".`,
      status,
      proof_image: proofImage
    });
  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update complaint status.'
    });
  }
};

/**
 * Update Complaint Priority (Admin Only)
 * POST /api/complaints/:id/priority
 */
exports.updatePriority = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { priority, remarks } = req.body;

    if (!priority || !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`
      });
    }

    const [rows] = await db.query('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    const complaint = rows[0];
    const oldPriority = complaint.priority;

    await db.query('UPDATE complaints SET priority = ?, updated_at = NOW() WHERE id = ?', [
      priority,
      complaintId
    ]);

    const logRemarks = remarks && remarks.trim()
      ? `Priority changed from ${oldPriority} to ${priority}. Note: ${remarks.trim()}`
      : `Priority changed from ${oldPriority} to ${priority} by Admin ${req.user.name}.`;

    await db.query(
      `INSERT INTO complaint_updates (complaint_id, user_id, status, remarks)
       VALUES (?, ?, ?, ?)`,
      [complaintId, req.user.id, complaint.status, logRemarks]
    );

    return res.json({
      success: true,
      message: `Priority updated to "${priority}" successfully.`
    });
  } catch (err) {
    console.error('Update priority error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update priority.'
    });
  }
};

/**
 * Delete Complaint (Admin Only)
 * DELETE /api/complaints/:id
 */
exports.deleteComplaint = async (req, res) => {
  try {
    const complaintId = req.params.id;

    const [rows] = await db.query('SELECT complaint_code FROM complaints WHERE id = ?', [complaintId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    const code = rows[0].complaint_code;
    await db.query('DELETE FROM complaints WHERE id = ?', [complaintId]);

    return res.json({
      success: true,
      message: `Complaint #${code} has been permanently deleted.`
    });
  } catch (err) {
    console.error('Delete complaint error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete complaint.'
    });
  }
};
