const db = require('../config/database');

class Notification {
  // Create notification
  static async create(notificationData) {
    const { user_id, group_id, message, type = 'in_app' } = notificationData;
    const [result] = await db.query(
      'INSERT INTO Notifications (user_id, group_id, message, type) VALUES (?, ?, ?, ?)',
      [user_id, group_id, message, type]
    );
    return result.insertId;
  }

  // Get user notifications
  static async getByUserId(userId, limit = 50, offset = 0, unreadOnly = false) {
    let query = `
      SELECT n.*, g.group_name 
      FROM Notifications n 
      LEFT JOIN Groups g ON n.group_id = g.group_id 
      WHERE n.user_id = ?
    `;

    const params = [userId];

    if (unreadOnly) {
      query += ' AND n.is_read = FALSE';
    }

    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [notifications] = await db.query(query, params);
    return notifications;
  }

  // Mark as read
  static async markAsRead(notificationIds, userId) {
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return false;
    }

    const placeholders = notificationIds.map(() => '?').join(',');
    const [result] = await db.query(
      `UPDATE Notifications SET is_read = TRUE 
       WHERE notification_id IN (${placeholders}) AND user_id = ?`,
      [...notificationIds, userId]
    );
    return result.affectedRows > 0;
  }

  // Mark all as read
  static async markAllAsRead(userId) {
    const [result] = await db.query(
      'UPDATE Notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    return result.affectedRows;
  }

  // Delete notification
  static async delete(notificationId, userId) {
    const [result] = await db.query(
      'DELETE FROM Notifications WHERE notification_id = ? AND user_id = ?',
      [notificationId, userId]
    );
    return result.affectedRows > 0;
  }

  // Get unread count
  static async getUnreadCount(userId) {
    const [count] = await db.query(
      'SELECT COUNT(*) as count FROM Notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    return count[0].count;
  }

  // Delete old notifications (cleanup)
  static async deleteOld(daysOld = 30) {
    const [result] = await db.query(
      'DELETE FROM Notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [daysOld]
    );
    return result.affectedRows;
  }

  // Get notifications by group
  static async getByGroupId(groupId, userId) {
    const [notifications] = await db.query(
      `SELECT n.* 
       FROM Notifications n 
       WHERE n.user_id = ? AND n.group_id = ? 
       ORDER BY n.created_at DESC`,
      [userId, groupId]
    );
    return notifications;
  }
}

module.exports = Notification;