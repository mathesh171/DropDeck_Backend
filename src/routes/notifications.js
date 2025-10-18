const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} = require('../controllers/notificationController');

router.get('/', authenticateToken, getUserNotifications);
router.post('/mark-read', authenticateToken, markNotificationAsRead);
router.post('/mark-all-read', authenticateToken, markAllNotificationsAsRead);
router.delete('/:id', authenticateToken, deleteNotification);

module.exports = router;
