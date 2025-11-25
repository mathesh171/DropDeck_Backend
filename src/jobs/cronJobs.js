const cron = require('node-cron');
const { cleanupExpiredGroups } = require('../services/cleanupService');
const { logger } = require('../utils/logger');
const db = require('../config/database');

const cleanupExpiredTokens = async () => {
  try {
    // Delete unverified users older than 24 hours
    await db.query(
      `DELETE FROM Users 
       WHERE authorize = 0 
       AND token IS NOT NULL 
       AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );
    logger.info('Expired verification tokens cleaned up');
  } catch (error) {
    logger.error('Cleanup expired tokens failed:', error);
  }
};

const initCronJobs = () => {
  // Run cleanup every hour
  // cron.schedule('0 * * * *', async () => {
  // Run cleanup every minute
  cron.schedule('* * * * *', async () => {
    logger.info('Running scheduled cleanup job...');
    try {
      await cleanupExpiredGroups();
      logger.info('Cleanup job completed successfully');
    } catch (error) {
      logger.error('Cleanup job failed:', error);
    }
  });

  // Run cleanup every day at midnight (additional safety check)
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running daily cleanup job...');
    try {
      await cleanupExpiredGroups();
      logger.info('Daily cleanup job completed successfully');
    } catch (error) {
      logger.error('Daily cleanup job failed:', error);
    }
  });

  cron.schedule('0 2 * * *', async () => {
    logger.info('Running token cleanup job...');
    await cleanupExpiredTokens();
  });

  logger.info('✅ Cron jobs initialized');
};

module.exports = { initCronJobs };
