const mysql = require('mysql2/promise');
const { logger } = require('../utils/logger');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test connection
pool.getConnection()
  .then((connection) => {
    logger.info('✅ Database connected successfully');
    connection.release();
  })
  .catch((err) => {
    logger.error('❌ Database connection failed:', err);
    process.exit(1);
  });

module.exports = pool;