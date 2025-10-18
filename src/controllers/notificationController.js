const db = require('../config/database');
const { HTTP_STATUS } = require('../config/constants');

const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { limit = 50, offset = 0, unread_only } = req.query;

    let query = `
      SELECT n.*, g.group_name 
      FROM Notifications n 
      LEFT JOIN Groups g ON n.group_id = g.group_id 
      WHERE n.user_id = ?
    `;

    const params = [userId];

    if (unread_only === 'true') {
      query += ' AND n.is_read = FALSE';
    }

    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [notifications] = await db.query(query, params);

    // Get unread count
    const [unreadCount] = await db.query(
      'SELECT COUNT(*) as count FROM Notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    res.status(HTTP_STATUS.OK).json({
      notifications,
      unread_count: unreadCount[0].count,
    });
  } catch (error) {
    next(error);
  }
};

const markNotificationAsRead = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { notification_ids } = req.body;

    if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'notification_ids must be a non-empty array',
      });
    }

    // Mark notifications as read
    const placeholders = notification_ids.map(() => '?').join(',');
    await db.query(
      `UPDATE Notifications SET is_read = TRUE 
       WHERE notification_id IN (${placeholders}) AND user_id = ?`,
      [...notification_ids, userId]
    );

    res.status(HTTP_STATUS.OK).json({
      message: 'Notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    await db.query(
      'UPDATE Notifications SET is_read = TRUE WHERE user_id = ?',
      [userId]
    );

    res.status(HTTP_STATUS.OK).json({
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const notificationId = req.params.id;

    await db.query(
      'DELETE FROM Notifications WHERE notification_id = ? AND user_id = ?',
      [notificationId, userId]
    );

    res.status(HTTP_STATUS.OK).json({
      message: 'Notification deleted',
    });
  } catch (error) {
    next(error);
  }
};

const createNotification = async (userId, groupId, message, type = 'in_app') => {
  try {
    await db.query(
      'INSERT INTO Notifications (user_id, group_id, message, type) VALUES (?, ?, ?, ?)',
      [userId, groupId, message, type]
    );
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

module.exports = {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  createNotification,
};