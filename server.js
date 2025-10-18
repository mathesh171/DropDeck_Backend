require('dotenv').config();
const app = require('./src/app');
const { logger } = require('./src/utils/logger');
const { initCronJobs } = require('./src/jobs/cronJobs');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`🚀 DropDeck Server running on port ${PORT}`);
  logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
  
  // Initialize cron jobs for cleanup
  initCronJobs();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});