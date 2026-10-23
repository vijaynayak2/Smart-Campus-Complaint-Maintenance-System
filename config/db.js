const mysql = require('mysql2/promise');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

let pool = null;
let sqliteDb = null;
let activeDriver = null; // 'mysql' or 'sqlite'

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'campusfix_db';

// Helper to initialize embedded SQLite if MySQL is offline
function initSqliteFallback() {
  const sqlitePath = path.join(__dirname, '..', 'campusfix_local.db');
  sqliteDb = new Database(sqlitePath);
  activeDriver = 'sqlite';

  // Enable foreign keys
  sqliteDb.pragma('foreign_keys = ON');

  // Register MySQL compatible helper functions for SQLite
  sqliteDb.function('NOW', () => new Date().toISOString());
  sqliteDb.function('CURRENT_TIMESTAMP', () => new Date().toISOString());
  sqliteDb.function('DATE_SUB', (dateStr, intervalExpr) => {
    const d = new Date(dateStr || Date.now());
    // simple parsing e.g. "INTERVAL 2 DAY"
    const match = String(intervalExpr).match(/(\d+)\s*(DAY|HOUR|MINUTE|SECOND|MONTH|YEAR)/i);
    if (match) {
      const val = parseInt(match[1], 10);
      const unit = match[2].toUpperCase();
      if (unit.startsWith('DAY')) d.setDate(d.getDate() - val);
      else if (unit.startsWith('HOUR')) d.setHours(d.getHours() - val);
      else if (unit.startsWith('MINUTE')) d.setMinutes(d.getMinutes() - val);
      else if (unit.startsWith('MONTH')) d.setMonth(d.getMonth() - val);
      else if (unit.startsWith('YEAR')) d.setFullYear(d.getFullYear() - val);
    }
    return d.toISOString();
  });

  // Create SQLite tables if they do not exist
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      department TEXT,
      phone TEXT,
      user_type TEXT DEFAULT 'Student',
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_code TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'Medium',
      description TEXT NOT NULL,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'Submitted',
      assigned_to INTEGER,
      proof_image TEXT,
      resolution_remarks TEXT,
      verified_by INTEGER,
      verification_remarks TEXT,
      resolved_at DATETIME,
      verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS complaint_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      remarks TEXT,
      proof_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Check if data already exists
  const countRow = sqliteDb.prepare('SELECT COUNT(*) AS count FROM users').get();
  if (countRow.count === 0) {
    // Seed SQLite with initial seed data
    const bcrypt = require('bcryptjs');
    const adminPass = bcrypt.hashSync('Admin@123', 10);
    const staffPass = bcrypt.hashSync('Staff@123', 10);
    const studentPass = bcrypt.hashSync('Student@123', 10);
    const facultyPass = bcrypt.hashSync('Faculty@123', 10);

    const insertUser = sqliteDb.prepare(`
      INSERT INTO users (id, name, email, password, role, department, phone, user_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(1, 'Prof. Rajesh K. (Chief Maintenance Officer)', 'admin@ajiet.ac.in', adminPass, 'admin', 'Administration / Estate Office', '+91 98450 12345', 'Administrator');
    insertUser.run(2, 'Suresh Poojary (Electrical Lead)', 'staff.electrical@ajiet.ac.in', staffPass, 'staff', 'Electrical Maintenance', '+91 98450 23456', 'Maintenance Staff');
    insertUser.run(3, 'Ramesh Shetty (Plumbing Specialist)', 'staff.plumbing@ajiet.ac.in', staffPass, 'staff', 'Plumbing & Sanitation', '+91 98450 34567', 'Maintenance Staff');
    insertUser.run(4, 'Karthik Rao (Network Admin)', 'staff.network@ajiet.ac.in', staffPass, 'staff', 'IT & Campus Wi-Fi', '+91 98450 45678', 'Maintenance Staff');
    insertUser.run(5, 'Ganesh Naik (Carpentry & Infra)', 'staff.civil@ajiet.ac.in', staffPass, 'staff', 'Civil & Furniture Maintenance', '+91 98450 56789', 'Maintenance Staff');
    insertUser.run(6, 'Rahul Sharma', 'student.rahul@ajiet.ac.in', studentPass, 'student', 'Computer Science & Engineering', '+91 98765 43210', 'Student');
    insertUser.run(7, 'Ananya Bhat', 'student.ananya@ajiet.ac.in', studentPass, 'student', 'Information Science & Engineering', '+91 98765 67890', 'Student');
    insertUser.run(8, 'Dr. Shreedhara Acharya (HOD Mech)', 'faculty.mech@ajiet.ac.in', facultyPass, 'student', 'Mechanical Engineering', '+91 98765 11223', 'Faculty');

    const insertComplaint = sqliteDb.prepare(`
      INSERT INTO complaints (
        id, complaint_code, user_id, title, category, location, priority, description, image_url,
        status, assigned_to, proof_image, resolution_remarks, verified_by, verification_remarks,
        resolved_at, verified_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?), datetime('now', ?))
    `);

    insertComplaint.run(
      1, 'AJIET-2026-001', 6,
      'Ceiling Fan Making Loud Grinding Noise & Wobbling',
      'Electrical',
      'Academic Block A - Room 204 (CSE Lecture Hall)',
      'High',
      'The second ceiling fan on the window row is vibrating excessively and producing a harsh metallic screech. Disturbs lectures and presents a safety hazard.',
      '/uploads/seed_fan_issue.jpg',
      'Verified',
      2,
      '/uploads/seed_fan_fixed.jpg',
      'Replaced worn-out ball bearings and tightened motor mounting bracket. Tested across all 5 speeds - smooth and quiet operation confirmed.',
      1,
      'Inspected on site by Estate Officer. Noise completely resolved and mounting is sturdy. Complaint closed.',
      '-2 days', '-1 days', '-5 days'
    );

    insertComplaint.run(
      2, 'AJIET-2026-002', 7,
      'Main Water Tap Leakage in 2nd Floor Washroom',
      'Plumbing',
      'Academic Block B - 2nd Floor Men Washroom',
      'Medium',
      'Continuous leak under the washbasin pipe causing puddle formation on the floor and slippery tiles.',
      '/uploads/seed_plumbing_leak.jpg',
      'Resolved',
      3,
      '/uploads/seed_plumbing_fixed.jpg',
      'Replaced deteriorated Teflon tape and rubber washers on the faucet inlet connection. Leak stopped completely.',
      null, null,
      '-6 hours', null, '-2 days'
    );

    insertComplaint.run(
      3, 'AJIET-2026-003', 6,
      'Wi-Fi Access Point Offline / No Internet in Lab 3',
      'Wi-Fi & Network',
      'Central Computing Facility - Lab 3',
      'Critical',
      'Cisco AP LED is blinking amber. No student machines can connect to AJIET-CAMPUS-WIFI during lab sessions.',
      null,
      'In Progress',
      4,
      null, null, null, null,
      null, null, '-1 days'
    );

    insertComplaint.run(
      4, 'AJIET-2026-004', 8,
      'Broken Desks and Loose Chairs in Drawing Hall',
      'Damaged Furniture',
      'Mechanical Block - 1st Floor Drawing Hall',
      'Medium',
      'Four drafting tables have cracked laminate edges and two stools have loose welding screws that shake when sitting.',
      null,
      'Assigned',
      5,
      null, null, null, null,
      null, null, '-18 hours'
    );

    insertComplaint.run(
      5, 'AJIET-2026-005', 7,
      'Projector HDMI Port Damaged & Dim Lamp',
      'Classroom Equipment',
      'Seminar Hall 1 - Ground Floor',
      'High',
      'Epson ceiling projector HDMI 1 port has bent pins, causing no signal display for guest speaker presentations.',
      null,
      'Submitted',
      null,
      null, null, null, null,
      null, null, '-4 hours'
    );

    insertComplaint.run(
      6, 'AJIET-2026-006', 6,
      'Severe Water Seepage Near Library Reference Section',
      'Water Leakage',
      'Central Library - 1st Floor Reference Section',
      'Critical',
      'Rainwater is seeping along the outer wall near Shelf 14 (Computer Science books). Needs immediate attention before books get damaged.',
      null,
      'In Progress',
      3,
      null, null, null, null,
      null, null, '-8 hours'
    );

    insertComplaint.run(
      7, 'AJIET-2026-007', 8,
      'Garbage Disposal Bin Broken & Overflowing',
      'Cleanliness & Sanitation',
      'Campus Canteen Courtyard',
      'Low',
      'The foot pedal mechanism on the dry waste bin is disconnected and waste is spilling around the bench area.',
      null,
      'Verified',
      5,
      null,
      'Replaced foot pedal linkage and sanitized surrounding area with housekeeping team.',
      1,
      'Verified cleanliness during campus round.',
      '-3 days', '-2 days', '-4 days'
    );

    insertComplaint.run(
      8, 'AJIET-2026-008', 7,
      'Flickering Tube Lights in Corridor',
      'Electrical',
      'Boys Hostel Block A - 3rd Floor Wing',
      'Low',
      'Two LED battens at the north end corridor flicker constantly causing eye strain at night.',
      null,
      'Submitted',
      null,
      null, null, null, null,
      null, null, '-2 hours'
    );

    const insertUpdate = sqliteDb.prepare(`
      INSERT INTO complaint_updates (complaint_id, user_id, status, remarks, proof_image, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', ?))
    `);

    insertUpdate.run(1, 6, 'Submitted', 'Complaint submitted by Rahul Sharma.', null, '-5 days');
    insertUpdate.run(1, 1, 'Assigned', 'Assigned to Suresh Poojary (Electrical Lead). Priority set to High.', null, '-4 days');
    insertUpdate.run(1, 2, 'In Progress', 'Inspected motor. Procuring replacement 6202ZZ bearings from stores.', null, '-3 days');
    insertUpdate.run(1, 2, 'Resolved', 'Replaced worn bearings, balanced blades, and tested. Working smoothly.', '/uploads/seed_fan_fixed.jpg', '-2 days');
    insertUpdate.run(1, 1, 'Verified', 'Verified on-site by Prof. Rajesh K. (Chief Maintenance Officer). Noise completely resolved.', null, '-1 days');

    insertUpdate.run(2, 7, 'Submitted', 'Complaint submitted by Ananya Bhat.', null, '-2 days');
    insertUpdate.run(2, 1, 'Assigned', 'Assigned to Ramesh Shetty (Plumbing Specialist).', null, '-1 days');
    insertUpdate.run(2, 3, 'In Progress', 'Diagnosing washbasin valve connection.', null, '-12 hours');
    insertUpdate.run(2, 3, 'Resolved', 'Replaced Teflon seal and washers. Faucet tested with full water pressure.', '/uploads/seed_plumbing_fixed.jpg', '-6 hours');

    insertUpdate.run(3, 6, 'Submitted', 'Complaint submitted by Rahul Sharma.', null, '-1 days');
    insertUpdate.run(3, 1, 'Assigned', 'Assigned to Karthik Rao (Network Admin). Escalated to Critical.', null, '-20 hours');
    insertUpdate.run(3, 4, 'In Progress', 'PoE switch port 18 power cycle performed. Testing CAT6 drop line with cable tester.', null, '-15 hours');

    insertUpdate.run(4, 8, 'Submitted', 'Complaint submitted by Dr. Shreedhara Acharya.', null, '-18 hours');
    insertUpdate.run(4, 1, 'Assigned', 'Assigned to Ganesh Naik (Carpentry & Infra).', null, '-10 hours');

    insertUpdate.run(5, 7, 'Submitted', 'Complaint submitted by Ananya Bhat.', null, '-4 hours');

    insertUpdate.run(6, 6, 'Submitted', 'Complaint submitted by Rahul Sharma.', null, '-8 hours');
    insertUpdate.run(6, 1, 'Assigned', 'Assigned to Ramesh Shetty. Escalated to Critical priority.', null, '-7 hours');
    insertUpdate.run(6, 3, 'In Progress', 'Tarpaulin cover placed over shelf. Repairing roof drain gutter blockage.', null, '-5 hours');

    insertUpdate.run(7, 8, 'Submitted', 'Complaint submitted by Dr. Shreedhara Acharya.', null, '-4 days');
    insertUpdate.run(7, 1, 'Assigned', 'Assigned to Ganesh Naik.', null, '-3 days');
    insertUpdate.run(7, 5, 'In Progress', 'Procuring replacement spring and pedal rod.', null, '-3 days');
    insertUpdate.run(7, 5, 'Resolved', 'Fixed pedal and cleaned bin bay.', null, '-3 days');
    insertUpdate.run(7, 1, 'Verified', 'Verified by Admin.', null, '-2 days');

    insertUpdate.run(8, 7, 'Submitted', 'Complaint submitted by Ananya Bhat.', null, '-2 hours');
  }
}

// Connect to Database
async function initDatabase() {
  try {
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 2000
    });

    // Test connection with a fast query
    const connection = await pool.getConnection();
    connection.release();
    activeDriver = 'mysql';
    console.log(`[Database] Successfully connected to MySQL database "${DB_NAME}" at ${DB_HOST}:${DB_PORT}`);
  } catch (err) {
    console.warn(`[Database Notice] Could not connect to MySQL at ${DB_HOST}:${DB_PORT} (${err.code || err.message}).`);
    console.log('[Database] Falling back to embedded local SQLite database so the application works out-of-the-box.');
    console.log('[Database] When your MySQL server is ready, import schema.sql and restart the server.');
    initSqliteFallback();
  }
}

// Execute query abstraction that works seamlessly across MySQL & SQLite
async function query(sql, params = []) {
  if (!activeDriver) {
    await initDatabase();
  }

  if (activeDriver === 'mysql') {
    // Return [rows, fields]
    return await pool.query(sql, params);
  }

  // SQLite execution
  // Adapt MySQL functions or syntax if necessary
  let sqliteSql = sql;

  // Handle NOW() in SELECT or INSERT
  sqliteSql = sqliteSql.replace(/NOW\(\)/gi, "datetime('now')");

  const trimmed = sqliteSql.trim();
  const isSelect = /^SELECT/i.test(trimmed) || /^SHOW/i.test(trimmed) || /^DESCRIBE/i.test(trimmed) || /^PRAGMA/i.test(trimmed);

  try {
    const stmt = sqliteDb.prepare(sqliteSql);
    if (isSelect) {
      const rows = stmt.all(...params);
      return [rows, []];
    } else {
      const info = stmt.run(...params);
      const resultObj = {
        insertId: info.lastInsertRowid,
        affectedRows: info.changes
      };
      return [resultObj, []];
    }
  } catch (sqliteErr) {
    console.error('[SQLite Query Error]', sqliteErr.message, 'SQL:', sqliteSql, 'Params:', params);
    throw sqliteErr;
  }
}

// Utility to get current active driver name
function getDriver() {
  return activeDriver;
}

module.exports = {
  initDatabase,
  query,
  getDriver,
  getPool: () => pool
};
