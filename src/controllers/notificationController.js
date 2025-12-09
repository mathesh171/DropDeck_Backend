const db = require('../config/database');
const { HTTP_STATUS } = require('../config/constants');

const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { limit = 50, offset = 0, unread_only } = req.query;

    let query = `
      SELECT n.*, g.group_name 
      FROM notifications n 
      LEFT JOIN chat_groups g ON n.group_id = g.group_id 
      WHERE n.user_id = ?
    `;
    const params = [userId];

    if (unread_only === 'true') {
      query += ' AND n.is_read = FALSE';
    }

    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [notifications] = await db.query(query, params);

    const [unreadCount] = await db.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    res.status(HTTP_STATUS.OK).json({
      notifications,
      unread_count: unreadCount[0].count
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
        error: 'notification_ids must be a non-empty array'
      });
    }

    const placeholders = notification_ids.map(() => '?').join(',');
    await db.query(
      `UPDATE notifications SET is_read = TRUE 
       WHERE notification_id IN (${placeholders}) AND user_id = ?`,
      [...notification_ids, userId]
    );

    res.status(HTTP_STATUS.OK).json({
      message: 'Notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [userId]
    );

    res.status(HTTP_STATUS.OK).json({
      message: 'All notifications marked as read'
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
      'DELETE FROM notifications WHERE notification_id = ? AND user_id = ?',
      [notificationId, userId]
    );

    res.status(HTTP_STATUS.OK).json({
      message: 'Notification deleted'
    });
  } catch (error) {
    next(error);
  }
};

const createNotification = async (userId, groupId, message, type = 'in_app') => {
  try {
    await db.query(
      'INSERT INTO notifications (user_id, group_id, message, type) VALUES (?, ?, ?, ?)',
      [userId, groupId, message, type]
    );
    global.io.to(`user:${userId}`).emit('notificationUpdate', { groupId });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

const actOnJoinRequest = async (req, res, next) => {
  try {
    const adminId = req.user.user_id;
    const { notification_id, action } = req.body;

    const [notifRows] = await db.query(
      'SELECT notification_id, user_id, group_id, message FROM notifications WHERE notification_id = ? AND user_id = ?',
      [notification_id, adminId]
    );
    if (!notifRows.length) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Notification not found' });
    }
    const notif = notifRows[0];

    const [reqRows] = await db.query(
      `SELECT id, user_id, group_id, status 
       FROM group_join_requests 
       WHERE group_id = ? AND status = 'pending' 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [notif.group_id]
    );
    if (!reqRows.length) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'No pending request' });
    }
    const joinReq = reqRows[0];

    if (action === 'accept') {
      await db.query(
        'UPDATE group_join_requests SET status = "accepted" WHERE id = ?',
        [joinReq.id]
      );
      await db.query(
        'INSERT INTO groupmembers (group_id, user_id, role) VALUES (?, ?, "member")',
        [joinReq.group_id, joinReq.user_id]
      );
    } else if (action === 'decline') {
      await db.query(
        'UPDATE group_join_requests SET status = "declined" WHERE id = ?',
        [joinReq.id]
      );
    } else {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid action' });
    }

    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE notification_id = ?',
      [notification_id]
    );

    global.io.to(`user:${joinReq.user_id}`).emit('groupListUpdate', {
      groupId: joinReq.group_id
    });

    res.status(HTTP_STATUS.OK).json({ message: 'Action completed' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  createNotification,
  actOnJoinRequest
};