const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  getAuditLogs,
  getReportedMessages,
  moderateMessage,
  exportGroupData,
  getSystemStats,
} = require('../controllers/adminController');

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

router.get('/logs', getAuditLogs);
router.get('/reports', getReportedMessages);
router.patch('/messages/:id/moderate', moderateMessage);
router.post('/groups/:id/export', exportGroupData);
router.get('/stats', getSystemStats);

module.exports = router;