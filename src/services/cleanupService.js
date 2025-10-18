const db = require('../config/database');
const { secureDelete } = require('./secureDeleteService');
const { generateZIPExport, generateExportHash } = require('./exportService');
const { sendExportEmail } = require('./emailService');
const { logger } = require('../utils/logger');

const cleanupExpiredGroups = async () => {
  try {
    logger.info('Starting cleanup of expired groups...');

    // Find expired groups
    const [expiredGroups] = await db.query(
      `SELECT g.*, u.email, u.name 
       FROM Groups g 
       JOIN Users u ON g.created_by = u.user_id 
       WHERE g.expiry_time <= NOW()`
    );

    for (const group of expiredGroups) {
      try {
        // Generate export
        const exportPath = await generateZIPExport(group.group_id, group.group_name);
        const hashValue = generateExportHash(exportPath);

        // Save export record
        await db.query(
          'INSERT INTO Exports (group_id, file_path, hash_value) VALUES (?, ?, ?)',
          [group.group_id, exportPath, hashValue]
        );

        // Get all group members
        const [members] = await db.query(
          `SELECT u.email, u.name FROM Users u 
           JOIN GroupMembers gm ON u.user_id = gm.user_id 
           WHERE gm.group_id = ?`,
          [group.group_id]
        );

        // Send export to all members
        for (const member of members) {
          await sendExportEmail(member.email, group.group_name, exportPath);
        }

        // Secure delete all files
        const [files] = await db.query(
          `SELECT f.file_path FROM Files f 
           JOIN Messages m ON f.message_id = m.message_id 
           WHERE m.group_id = ?`,
          [group.group_id]
        );

        for (const file of files) {
          await secureDelete(file.file_path);
        }

        // Delete group (cascade will handle related records)
        await db.query('DELETE FROM Groups WHERE group_id = ?', [group.group_id]);

        logger.info(`Cleaned up group: ${group.group_name} (ID: ${group.group_id})`);
      } catch (error) {
        logger.error(`Failed to cleanup group ${group.group_id}:`, error);
      }
    }

    logger.info(`Cleanup completed. Processed ${expiredGroups.length} groups.`);
  } catch (error) {
    logger.error('Cleanup process failed:', error);
  }
};

module.exports = { cleanupExpiredGroups };