const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'campusfix_db';

async function runInitDb() {
  console.log('====================================================');
  console.log('AJIET CampusFix - MySQL Database Initializer');
  console.log('====================================================');
  console.log(`Connecting to MySQL at ${DB_HOST}:${DB_PORT} as user "${DB_USER}"...`);

  let connection;
  try {
    // Connect without selecting database first
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true
    });

    console.log('Connected to MySQL server.');

    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log(`Executing ${schemaPath}...`);

    await connection.query(schemaSql);
    console.log(`[Success] Database "${DB_NAME}" and all tables initialized with sample seed data!`);
    console.log('You can now start the server with: npm start');
  } catch (err) {
    console.error('[Error] Failed to initialize MySQL database:', err.message);
    console.log('\nMake sure your MySQL service (e.g., MySQL Workbench, XAMPP, or Windows service) is running.');
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

if (require.main === module) {
  runInitDb();
}

module.exports = runInitDb;
