-- ===============================================================
-- Smart Campus Complaint & Maintenance System (AJIET CampusFix)
-- Database Schema & Realistic Seed Data
-- Target Database: MySQL 5.7+ / 8.0+
-- ===============================================================

CREATE DATABASE IF NOT EXISTS campusfix_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE campusfix_db;

-- ---------------------------------------------------------------
-- 1. Table: users
-- Roles: 'admin', 'staff', 'student'
-- ---------------------------------------------------------------
DROP TABLE IF EXISTS complaint_updates;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff', 'student') NOT NULL DEFAULT 'student',
  department VARCHAR(100) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  user_type VARCHAR(50) DEFAULT 'Student',
  avatar VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- 2. Table: complaints
-- Lifecycle: Submitted -> Assigned -> In Progress -> Resolved -> Verified
-- Priority: Low, Medium, High, Critical
-- ---------------------------------------------------------------
CREATE TABLE complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_code VARCHAR(30) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  category ENUM(
    'Electrical',
    'Plumbing',
    'Wi-Fi & Network',
    'Damaged Furniture',
    'Classroom Equipment',
    'Cleanliness & Sanitation',
    'Water Leakage',
    'Other Infrastructure'
  ) NOT NULL,
  location VARCHAR(200) NOT NULL,
  priority ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
  description TEXT NOT NULL,
  image_url VARCHAR(255) DEFAULT NULL,
  status ENUM('Submitted', 'Assigned', 'In Progress', 'Resolved', 'Verified') NOT NULL DEFAULT 'Submitted',
  assigned_to INT DEFAULT NULL,
  proof_image VARCHAR(255) DEFAULT NULL,
  resolution_remarks TEXT DEFAULT NULL,
  verified_by INT DEFAULT NULL,
  verification_remarks TEXT DEFAULT NULL,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  verified_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_complaints_user (user_id),
  INDEX idx_complaints_assigned (assigned_to),
  INDEX idx_complaints_status (status),
  INDEX idx_complaints_priority (priority),
  INDEX idx_complaints_category (category),
  INDEX idx_complaints_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- 3. Table: complaint_updates (Lifecycle Audit Log & Timeline)
-- ---------------------------------------------------------------
CREATE TABLE complaint_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  user_id INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  remarks TEXT DEFAULT NULL,
  proof_image VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_updates_complaint (complaint_id),
  INDEX idx_updates_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===============================================================
-- SAMPLE SEED DATA
-- Default Passwords:
-- Admin:        Admin@123
-- Staff:        Staff@123
-- Student:      Student@123
-- Faculty:      Faculty@123
-- ===============================================================

INSERT INTO users (id, name, email, password, role, department, phone, user_type) VALUES
-- Admin
(1, 'Prof. Rajesh K. (Chief Maintenance Officer)', 'admin@ajiet.ac.in', '$2b$10$R5x1.cMOedBAWwi7Txkoje2qDjkrRC7EFdE1qJqMtuhcJN1fHIn5u', 'admin', 'Administration / Estate Office', '+91 98450 12345', 'Administrator'),

-- Maintenance Staff
(2, 'Suresh Poojary (Electrical Lead)', 'staff.electrical@ajiet.ac.in', '$2b$10$0FHnbcYaTB2uAdjNBVslOuBbGI1MWWtsKkDDy659Vw2/wLgeNINU.', 'staff', 'Electrical Maintenance', '+91 98450 23456', 'Maintenance Staff'),
(3, 'Ramesh Shetty (Plumbing Specialist)', 'staff.plumbing@ajiet.ac.in', '$2b$10$0FHnbcYaTB2uAdjNBVslOuBbGI1MWWtsKkDDy659Vw2/wLgeNINU.', 'staff', 'Plumbing & Sanitation', '+91 98450 34567', 'Maintenance Staff'),
(4, 'Karthik Rao (Network Admin)', 'staff.network@ajiet.ac.in', '$2b$10$0FHnbcYaTB2uAdjNBVslOuBbGI1MWWtsKkDDy659Vw2/wLgeNINU.', 'staff', 'IT & Campus Wi-Fi', '+91 98450 45678', 'Maintenance Staff'),
(5, 'Ganesh Naik (Carpentry & Infra)', 'staff.civil@ajiet.ac.in', '$2b$10$0FHnbcYaTB2uAdjNBVslOuBbGI1MWWtsKkDDy659Vw2/wLgeNINU.', 'staff', 'Civil & Furniture Maintenance', '+91 98450 56789', 'Maintenance Staff'),

-- Students / Staff
(6, 'Rahul Sharma', 'student.rahul@ajiet.ac.in', '$2b$10$MI5gA6kCI5jU.I6Dc/z65.QQd9Za0fuCx1kNpSerbSUxLgCiZRJ6O', 'student', 'Computer Science & Engineering', '+91 98765 43210', 'Student'),
(7, 'Ananya Bhat', 'student.ananya@ajiet.ac.in', '$2b$10$MI5gA6kCI5jU.I6Dc/z65.QQd9Za0fuCx1kNpSerbSUxLgCiZRJ6O', 'student', 'Information Science & Engineering', '+91 98765 67890', 'Student'),
(8, 'Dr. Shreedhara Acharya (HOD Mech)', 'faculty.mech@ajiet.ac.in', '$2b$10$CNATZFkDhrlXItEsoGwHJuxy59Q4j/nWtSLBq/7AXFM8dTg5QIKKe', 'student', 'Mechanical Engineering', '+91 98765 11223', 'Faculty');

-- Sample Complaints
INSERT INTO complaints (
  id, complaint_code, user_id, title, category, location, priority, description, image_url,
  status, assigned_to, proof_image, resolution_remarks, verified_by, verification_remarks,
  resolved_at, verified_at, created_at
) VALUES
(
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
  DATE_SUB(NOW(), INTERVAL 2 DAY),
  DATE_SUB(NOW(), INTERVAL 1 DAY),
  DATE_SUB(NOW(), INTERVAL 5 DAY)
),
(
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
  NULL,
  NULL,
  DATE_SUB(NOW(), INTERVAL 6 HOUR),
  NULL,
  DATE_SUB(NOW(), INTERVAL 2 DAY)
),
(
  3, 'AJIET-2026-003', 6,
  'Wi-Fi Access Point Offline / No Internet in Lab 3',
  'Wi-Fi & Network',
  'Central Computing Facility - Lab 3',
  'Critical',
  'Cisco AP LED is blinking amber. No student machines can connect to AJIET-CAMPUS-WIFI during lab sessions.',
  NULL,
  'In Progress',
  4,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  DATE_SUB(NOW(), INTERVAL 1 DAY)
),
(
  4, 'AJIET-2026-004', 8,
  'Broken Desks and Loose Chairs in Drawing Hall',
  'Damaged Furniture',
  'Mechanical Block - 1st Floor Drawing Hall',
  'Medium',
  'Four drafting tables have cracked laminate edges and two stools have loose welding screws that shake when sitting.',
  NULL,
  'Assigned',
  5,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  DATE_SUB(NOW(), INTERVAL 18 HOUR)
),
(
  5, 'AJIET-2026-005', 7,
  'Projector HDMI Port Damaged & Dim Lamp',
  'Classroom Equipment',
  'Seminar Hall 1 - Ground Floor',
  'High',
  'Epson ceiling projector HDMI 1 port has bent pins, causing no signal display for guest speaker presentations.',
  NULL,
  'Submitted',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  DATE_SUB(NOW(), INTERVAL 4 HOUR)
),
(
  6, 'AJIET-2026-006', 6,
  'Severe Water Seepage Near Library Reference Section',
  'Water Leakage',
  'Central Library - 1st Floor Reference Section',
  'Critical',
  'Rainwater is seeping along the outer wall near Shelf 14 (Computer Science books). Needs immediate attention before books get damaged.',
  NULL,
  'In Progress',
  3,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  DATE_SUB(NOW(), INTERVAL 8 HOUR)
),
(
  7, 'AJIET-2026-007', 8,
  'Garbage Disposal Bin Broken & Overflowing',
  'Cleanliness & Sanitation',
  'Campus Canteen Courtyard',
  'Low',
  'The foot pedal mechanism on the dry waste bin is disconnected and waste is spilling around the bench area.',
  NULL,
  'Verified',
  5,
  NULL,
  'Replaced foot pedal linkage and sanitized surrounding area with housekeeping team.',
  1,
  'Verified cleanliness during campus round.',
  DATE_SUB(NOW(), INTERVAL 3 DAY),
  DATE_SUB(NOW(), INTERVAL 2 DAY),
  DATE_SUB(NOW(), INTERVAL 4 DAY)
),
(
  8, 'AJIET-2026-008', 7,
  'Flickering Tube Lights in Corridor',
  'Electrical',
  'Boys Hostel Block A - 3rd Floor Wing',
  'Low',
  'Two LED battens at the north end corridor flicker constantly causing eye strain at night.',
  NULL,
  'Submitted',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  DATE_SUB(NOW(), INTERVAL 2 HOUR)
);

-- Seed Timeline Updates
INSERT INTO complaint_updates (complaint_id, user_id, status, remarks, proof_image, created_at) VALUES
-- Timeline for Complaint 1 (Verified)
(1, 6, 'Submitted', 'Complaint submitted by Rahul Sharma.', NULL, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(1, 1, 'Assigned', 'Assigned to Suresh Poojary (Electrical Lead). Priority set to High.', NULL, DATE_SUB(NOW(), INTERVAL 4 DAY)),
(1, 2, 'In Progress', 'Inspected motor. Procuring replacement 6202ZZ bearings from stores.', NULL, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(1, 2, 'Resolved', 'Replaced worn bearings, balanced blades, and tested. Working smoothly.', '/uploads/seed_fan_fixed.jpg', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(1, 1, 'Verified', 'Verified on-site by Prof. Rajesh K. (Chief Maintenance Officer). Noise completely resolved.', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),

-- Timeline for Complaint 2 (Resolved)
(2, 7, 'Submitted', 'Complaint submitted by Ananya Bhat.', NULL, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 1, 'Assigned', 'Assigned to Ramesh Shetty (Plumbing Specialist).', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(2, 3, 'In Progress', 'Diagnosing washbasin valve connection.', NULL, DATE_SUB(NOW(), INTERVAL 12 HOUR)),
(2, 3, 'Resolved', 'Replaced Teflon seal and washers. Faucet tested with full water pressure.', '/uploads/seed_plumbing_fixed.jpg', DATE_SUB(NOW(), INTERVAL 6 HOUR)),

-- Timeline for Complaint 3 (In Progress)
(3, 6, 'Submitted', 'Complaint submitted by Rahul Sharma.', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(3, 1, 'Assigned', 'Assigned to Karthik Rao (Network Admin). Escalated to Critical.', NULL, DATE_SUB(NOW(), INTERVAL 20 HOUR)),
(3, 4, 'In Progress', 'PoE switch port 18 power cycle performed. Testing CAT6 drop line with cable tester.', NULL, DATE_SUB(NOW(), INTERVAL 15 HOUR)),

-- Timeline for Complaint 4 (Assigned)
(4, 8, 'Submitted', 'Complaint submitted by Dr. Shreedhara Acharya.', NULL, DATE_SUB(NOW(), INTERVAL 18 HOUR)),
(4, 1, 'Assigned', 'Assigned to Ganesh Naik (Carpentry & Infra).', NULL, DATE_SUB(NOW(), INTERVAL 10 HOUR)),

-- Timeline for Complaint 5 (Submitted)
(5, 7, 'Submitted', 'Complaint submitted by Ananya Bhat.', NULL, DATE_SUB(NOW(), INTERVAL 4 HOUR)),

-- Timeline for Complaint 6 (In Progress)
(6, 6, 'Submitted', 'Complaint submitted by Rahul Sharma.', NULL, DATE_SUB(NOW(), INTERVAL 8 HOUR)),
(6, 1, 'Assigned', 'Assigned to Ramesh Shetty. Escalated to Critical priority.', NULL, DATE_SUB(NOW(), INTERVAL 7 HOUR)),
(6, 3, 'In Progress', 'Tarpaulin cover placed over shelf. Repairing roof drain gutter blockage.', NULL, DATE_SUB(NOW(), INTERVAL 5 HOUR)),

-- Timeline for Complaint 7 (Verified)
(7, 8, 'Submitted', 'Complaint submitted by Dr. Shreedhara Acharya.', NULL, DATE_SUB(NOW(), INTERVAL 4 DAY)),
(7, 1, 'Assigned', 'Assigned to Ganesh Naik.', NULL, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(7, 5, 'In Progress', 'Procuring replacement spring and pedal rod.', NULL, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(7, 5, 'Resolved', 'Fixed pedal and cleaned bin bay.', NULL, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(7, 1, 'Verified', 'Verified by Admin.', NULL, DATE_SUB(NOW(), INTERVAL 2 DAY)),

-- Timeline for Complaint 8 (Submitted)
(8, 7, 'Submitted', 'Complaint submitted by Ananya Bhat.', NULL, DATE_SUB(NOW(), INTERVAL 2 HOUR));
