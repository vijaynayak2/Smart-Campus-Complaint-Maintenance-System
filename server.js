const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');
const { initDatabase, getDriver } = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static frontend assets and uploaded images
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// Clean URL Page Routes
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student-dashboard.html'));
});

app.get('/staff', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'staff-dashboard.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/track', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'track-complaint.html'));
});

// Root route serves landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Multer and general error handler
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum allowed image size is 5MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  }

  if (err) {
    console.error('Unhandled Server Error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal Server Error'
    });
  }

  next();
});

// Start Server
async function startServer() {
  try {
    await initDatabase();
    const server = app.listen(PORT, () => {
      console.log('===========================================================');
      console.log('  AJIET CampusFix - Smart Campus Complaint & Maintenance');
      console.log('===========================================================');
      console.log(`  Server running on : http://localhost:${PORT}`);
      console.log(`  Active Database   : ${getDriver().toUpperCase()}`);
      console.log(`  Landing Page      : http://localhost:${PORT}/`);
      console.log(`  Login Page        : http://localhost:${PORT}/login`);
      console.log(`  Student Dashboard : http://localhost:${PORT}/student`);
      console.log(`  Staff Dashboard   : http://localhost:${PORT}/staff`);
      console.log(`  Admin Dashboard   : http://localhost:${PORT}/admin`);
      console.log(`  Public Tracking   : http://localhost:${PORT}/track`);
      console.log('===========================================================');
    });

    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
