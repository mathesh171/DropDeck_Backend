const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { secureDelete } = require('./secureDeleteService');
const { generateZIPExport, generateExportHash } = require('./exportService');
const { sendExportEmail } = require('./emailService');
const { logger } = require('../utils/logger');

const uploadDir = process.env.UPLOAD_PATH || path.join(__dirname, '..', 'uploads');

const cleanupExpiredGroups = async () => {
  try {
    logger.info('Starting cleanup of expired groups...');

    const [expiredGroups] = await db.query(
      `SELECT g.*, u.email, u.name 
       FROM chat_groups g 
       JOIN Users u ON g.created_by = u.user_id 
       WHERE g.expiry_time <= NOW()`
    );

    for (const group of expiredGroups) {
      try {
        logger.info(`Processing expired group: ${group.group_name}`);

        const exportPath = await generateZIPExport(group.group_id, group.group_name);
        const hashValue = generateExportHash(exportPath);

        await db.query(
          `INSERT INTO Exports (group_id, file_path, hash_value) VALUES (?, ?, ?)`,
          [group.group_id, exportPath, hashValue]
        );

        const [members] = await db.query(
          `SELECT u.email, u.name 
           FROM GroupMembers gm 
           JOIN Users u ON gm.user_id = u.user_id
           WHERE gm.group_id = ?`,
          [group.group_id]
        );

        for (const member of members) {
          await sendExportEmail(member.email, group.group_name, exportPath);
        }

        const [files] = await db.query(
          `SELECT f.file_path 
           FROM Files f 
           JOIN Messages m ON f.message_id = m.message_id 
           WHERE m.group_id = ?`,
          [group.group_id]
        );

        for (const file of files) {
          await secureDelete(file.file_path);
        }

        await db.query(`DELETE FROM Messages WHERE group_id = ?`, [group.group_id]);

        if (group.group_image) {
          const imagePath = path.join(uploadDir, group.group_image);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        }

        await db.query(`DELETE FROM chat_groups WHERE group_id = ?`, [group.group_id]);

        logger.info(`Cleaned up group: ${group.group_name} (ID: ${group.group_id})`);
      } catch (err) {
        logger.error(`Failed to cleanup group ${group.group_id}:`, err);
      }
    }

    logger.info(`Cleanup completed. Processed: ${expiredGroups.length} groups.`);
  } catch (error) {
    logger.error('Cleanup process failed:', error);
  }
};

module.exports = { cleanupExpiredGroups };
