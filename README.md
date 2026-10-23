# AJIET CampusFix - Smart Campus Complaint & Maintenance System

> **A.J. Institute of Engineering & Technology (AJIET), Mangaluru**  
> Central Facility & Infrastructure Maintenance Portal

CampusFix is a modern, full-stack campus infrastructure and complaint maintenance platform designed for AJIET College. It empowers students and faculty to report campus issues (electrical, plumbing, Wi-Fi, damaged furniture, classroom tech, cleanliness, water seepage), track them in real time through an interactive visual lifecycle stepper, and enables maintenance technicians and administrators to resolve, audit, and verify work end-to-end.

---

## 🚀 Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Bootstrap 5, Bootstrap Icons
- **Backend**: Node.js, Express.js
- **Database**: MySQL 5.7+ / 8.0+ (complete `schema.sql` included with relational foreign keys, indexes, and realistic AJIET seed data) + automatic out-of-the-box local fallback engine for zero-configuration instant local development
- **Authentication**: JWT & Cookie-based authentication with bcrypt password hashing (10 salt rounds)
- **Data Analytics & Charts**: Chart.js for real-time visual analytics
- **File Uploads**: `multer` middleware storing issue and proof images locally in `/uploads` with real-time client preview

---

## 👥 User Roles & Permissions

Strict role-based access control (RBAC) is enforced across all API routes and UI views:

| Role | Access & Capabilities |
| :--- | :--- |
| **Student / Faculty** | Register & log in; submit complaints with category, location, priority, and photo upload; view personal complaint history; inspect real-time 5-stage progress stepper and audit notes. |
| **Maintenance Staff** | Log in; view only complaints assigned to them; update task status (`Assigned` &rarr; `In Progress` &rarr; `Resolved`); record maintenance remarks; upload proof-of-completion photos. |
| **Administrator** | **Full, unrestricted control over the entire system:** view, search, and filter all campus complaints; assign/reassign complaints to specialized staff; alter priority and status; verify and sign off on resolved complaints; manage users and staff; view interactive Chart.js analytics dashboard. |

---

## 🔄 Complaint Lifecycle

Strict transitions are enforced by the backend:

```
[ Submitted ] ──(Admin Assigns)──> [ Assigned ] ──(Staff Starts)──> [ In Progress ]
                                                                           │
                                                                           ▼
[ Verified ] <──(Admin Signs Off)── [ Resolved (Proof Uploaded) ] ─────────┘
```

1. **Submitted**: Filed by student/faculty with initial details, location, and photo.
2. **Assigned**: Admin reviews request, sets urgency, and dispatches to appropriate technician.
3. **In Progress**: Technician begins physical diagnosis and repairs on-site.
4. **Resolved**: Technician completes repairs, notes parts replaced, and uploads proof-of-work photo.
5. **Verified**: Estate Admin inspects work on-site, enters verification remarks, and formally closes the case.

---

## 🔑 Default Seed Accounts & Credentials

The system comes pre-seeded with realistic AJIET campus accounts. You can log in using these credentials or use the **One-Click Demo Buttons** on the `/login` page:

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Administrator** | Prof. Rajesh K. (Estate Officer) | `admin@ajiet.ac.in` | `Admin@123` |
| **Staff (Electrical)** | Suresh Poojary (Senior Electrician) | `staff.electrical@ajiet.ac.in` | `Staff@123` |
| **Staff (Plumbing)** | Ramesh Shetty (Plumbing Specialist) | `staff.plumbing@ajiet.ac.in` | `Staff@123` |
| **Staff (Wi-Fi / IT)** | Karthik Rao (Network Admin) | `staff.network@ajiet.ac.in` | `Staff@123` |
| **Staff (Carpentry)** | Ganesh Naik (Civil & Furniture) | `staff.civil@ajiet.ac.in` | `Staff@123` |
| **Student** | Rahul Sharma (CSE 6th Sem) | `student.rahul@ajiet.ac.in` | `Student@123` |
| **Student** | Ananya Bhat (ISE 4th Sem) | `student.ananya@ajiet.ac.in` | `Student@123` |
| **Faculty** | Dr. Shreedhara Acharya (HOD Mech) | `faculty.mech@ajiet.ac.in` | `Faculty@123` |

---

## 📁 Project Structure

```
Smart Campus Complaint & Maintenance System/
├── .env                  # Active environment variables
├── .env.example          # Template environment file
├── .gitignore            # Git exclusions
├── package.json          # Project metadata and dependencies
├── schema.sql            # Complete MySQL database schema and seed data
├── server.js             # Express application entry point
├── test-e2e.js           # Automated end-to-end test suite
│
├── config/
│   └── db.js             # Unified database driver (MySQL + Auto-fallback)
│
├── middleware/
│   ├── auth.js           # JWT verification & RBAC authorization
│   └── upload.js         # Multer image upload configuration (5MB limit)
│
├── controllers/
│   ├── authController.js       # Register, login, me, logout
│   ├── complaintController.js  # CRUD, assignment, status update, track
│   ├── userController.js       # User list, role update, staff directory
│   └── analyticsController.js  # Chart.js metrics, trends, breakdown
│
├── routes/
│   ├── authRoutes.js
│   ├── complaintRoutes.js
│   ├── userRoutes.js
│   └── analyticsRoutes.js
│
├── utils/
│   └── initDb.js         # MySQL database initializer script
│
├── uploads/              # Local storage for complaint and proof photos
│
└── public/               # Client-side frontend application
    ├── css/
    │   └── style.css     # Master styling, stepper, cards, badges
    ├── js/
    │   ├── api.js        # REST API fetch client
    │   ├── auth.js       # Session & navbar management
    │   ├── toast.js      # Toast notifications
    │   ├── student.js    # Student dashboard logic
    │   ├── staff.js      # Staff dashboard logic
    │   ├── admin.js      # Admin operations & user management logic
    │   └── analytics.js  # Chart.js visualizations & KPI metrics
    ├── index.html        # Landing page with hero & workflow
    ├── login.html        # Sign in & registration with validation
    ├── student-dashboard.html   # Student complaints portal
    ├── staff-dashboard.html     # Maintenance technician desk
    ├── admin-dashboard.html     # Admin command center & analytics
    └── track-complaint.html     # Public/direct code tracking
```

---

## 🛠️ Step-by-Step Installation & Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **MySQL**: (Optional for quick local testing; required for production MySQL deployment)

### 2. Install Dependencies
Open your terminal inside the project directory:
```bash
npm install
```

### 3. Configure Environment Variables
A default `.env` is already included. You can customize DB credentials if desired:
```ini
PORT=3000
NODE_ENV=development
JWT_SECRET=ajiet_campusfix_super_secure_jwt_secret_key_2026_mangalore
JWT_EXPIRES_IN=7d

# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=campusfix_db

# File Storage
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=5
```

### 4. Set Up the MySQL Database

#### Option A: Automatic Initialization Script
Ensure your MySQL server is running (e.g. XAMPP, MySQL Workbench, or service), then run:
```bash
npm run init-db
```
This script reads `schema.sql`, creates the `campusfix_db` database, creates all relational tables, and inserts all sample seed records.

#### Option B: Using MySQL CLI
```bash
mysql -u root -p < schema.sql
```

#### Option C: Using phpMyAdmin or MySQL Workbench
1. Open phpMyAdmin or MySQL Workbench.
2. Open the file `schema.sql`.
3. Execute the SQL script.

> **💡 Zero-Config Fallback**: If MySQL is not running on your machine, CampusFix will automatically detect this and switch to a built-in embedded SQLite database with the exact same seed data so you can immediately preview and test the complete system!

---

## 🏃 Running the Application

Start the server:
```bash
npm start
```
For auto-reload during development:
```bash
npm run dev
```

The application will be live at:
- **Landing Page**: [http://localhost:3000/](http://localhost:3000/)
- **Sign In & Register**: [http://localhost:3000/login](http://localhost:3000/login)
- **Student Dashboard**: [http://localhost:3000/student](http://localhost:3000/student)
- **Maintenance Staff Desk**: [http://localhost:3000/staff](http://localhost:3000/staff)
- **Admin Control Center**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Direct Tracking Tool**: [http://localhost:3000/track](http://localhost:3000/track)

---

## 🧪 Running Automated End-to-End Tests

To verify that all REST endpoints, authentication tokens, file uploads, role boundaries, and lifecycle transitions work correctly:
```bash
npm test
```

---

## 📡 REST API Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a student or staff account
- `POST /api/auth/login` — Sign in and receive JWT token + cookie
- `GET /api/auth/me` — Retrieve active user session profile
- `POST /api/auth/logout` — Invalidate session

### Complaints (`/api/complaints`)
- `GET /api/complaints` — List complaints (filtered by role and query params: status, category, priority, staff, search)
- `POST /api/complaints` — Submit new complaint (multipart with optional image)
- `GET /api/complaints/:id` — Get single complaint details and audit timeline
- `GET /api/complaints/track/:code` — Public/direct code tracking lookup
- `POST /api/complaints/:id/assign` — Admin assigns complaint to maintenance staff
- `POST /api/complaints/:id/status` — Advance lifecycle status (`In Progress`, `Resolved`, `Verified` with proof upload)
- `POST /api/complaints/:id/priority` — Admin updates urgency (`Low`, `Medium`, `High`, `Critical`)
- `DELETE /api/complaints/:id` — Admin permanently deletes a complaint

### Users (`/api/users`)
- `GET /api/users/staff` — List maintenance staff with current active workload count
- `GET /api/users` — Admin view of all registered accounts
- `POST /api/users` — Admin creates new staff or administrator account
- `PUT /api/users/:id` — Admin updates user role or details

### Analytics (`/api/analytics`)
- `GET /api/analytics` — Admin KPI metrics, Chart.js dataset arrays, and live activity stream

---

## 🛡️ License & Copyright
Developed for **A.J. Institute of Engineering & Technology (AJIET), Mangaluru**.  
All rights reserved © 2026.
