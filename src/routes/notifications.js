const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { body } = require('express-validator');
const {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  actOnJoinRequest
} = require('../controllers/notificationController');

const markReadValidators = [
  body('notification_ids').isArray({ min: 1 }),
  body('notification_ids.*').isInt()
];

const joinActionValidators = [
  body('notification_id').isInt(),
  body('action').isIn(['accept', 'decline'])
];

router.get('/', authenticateToken, getUserNotifications);
router.post('/mark-read', authenticateToken, markReadValidators, validate, markNotificationAsRead);
router.post('/mark-all-read', authenticateToken, markAllNotificationsAsRead);
router.post('/join-request/action', authenticateToken, joinActionValidators, validate, actOnJoinRequest);
router.delete('/:id', authenticateToken, deleteNotification);

module.exports = router;