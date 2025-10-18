const db = require('../config/database');
const { HTTP_STATUS } = require('../config/constants');
const { generateZIPExport } = require('../services/exportService');

const getAuditLogs = async (req, res, next) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    // This is a placeholder - you'd implement actual audit logging
    const logs = [];

    res.status(HTTP_STATUS.OK).json({
      logs,
      message: 'Audit logging to be implemented',
    });
  } catch (error) {
    next(error);
  }
};

const getReportedMessages = async (req, res, next) => {
  try {
    // This would require a Reports table - placeholder implementation
    res.status(HTTP_STATUS.OK).json({
      reports: [],
      message: 'Message reporting to be implemented',
    });
  } catch (error) {
    next(error);
  }
};

const moderateMessage = async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const { action } = req.body; // delete, ignore, warn

    if (action === 'delete') {
      await db.query('DELETE FROM Messages WHERE message_id = ?', [messageId]);
    }

    res.status(HTTP_STATUS.OK).json({
      message: `Message ${action} completed`,
    });
  } catch (error) {
    next(error);
  }
};

const exportGroupData = async (req, res, next) => {
  try {
    const groupId = req.params.id;

    const [groups] = await db.query(
      'SELECT group_name FROM Groups WHERE group_id = ?',
      [groupId]
    );

    if (groups.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Group not found',
      });
    }

    const exportPath = await generateZIPExport(groupId, groups[0].group_name);

    res.status(HTTP_STATUS.OK).json({
      message: 'Export generated successfully',
      export_path: exportPath,
    });
  } catch (error) {
    next(error);
  }
};

const getSystemStats = async (req, res, next) => {
  try {
    const [userCount] = await db.query('SELECT COUNT(*) as count FROM Users');
    const [groupCount] = await db.query('SELECT COUNT(*) as count FROM Groups');
    const [messageCount] = await db.query('SELECT COUNT(*) as count FROM Messages');
    const [fileCount] = await db.query('SELECT COUNT(*) as count FROM Files');

    res.status(HTTP_STATUS.OK).json({
      stats: {
        total_users: userCount[0].count,
        total_groups: groupCount[0].count,
        total_messages: messageCount[0].count,
        total_files: fileCount[0].count,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
  getReportedMessages,
  moderateMessage,
  exportGroupData,
  getSystemStats,
};