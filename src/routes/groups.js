const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const {
  authenticateToken,
  authorizeGroupMember,
  authorizeGroupAdmin
} = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { body } = require('express-validator');
const db = require('../config/database');
const { createNotification } = require('../controllers/notificationController');

router.post('/:id/request', authenticateToken, async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.user_id;

    const [already] = await db.query(
      'SELECT id FROM group_join_requests WHERE group_id = ? AND user_id = ? AND status = "pending"',
      [groupId, userId]
    );
    if (already.length) {
      return res.status(400).json({ error: 'Request already pending' });
    }

    const [admins] = await db.query(
      `SELECT gm.user_id 
       FROM groupmembers gm 
       WHERE gm.group_id = ? AND gm.role = 'admin'`,
      [groupId]
    );

    const [groupRows] = await db.query(
      'SELECT group_name FROM chat_groups WHERE group_id = ?',
      [groupId]
    );
    const groupName = groupRows[0]?.group_name || 'Group';

    const [userRows] = await db.query(
      'SELECT name FROM users WHERE user_id = ?',
      [userId]
    );
    const requesterName = userRows[0]?.name || 'User';

    await db.query(
      'INSERT INTO group_join_requests (group_id, user_id, status, created_at) VALUES (?, ?, "pending", NOW())',
      [groupId, userId]
    );

    for (const admin of admins) {
      await createNotification(
        admin.user_id,
        groupId,
        `${requesterName} requested to join ${groupName}`,
        'in_app'
      );
    }

    res.status(200).json({ message: 'Join request sent for approval' });
  } catch (err) {
    next(err);
  }
});

router.get('/discover', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    const [groups] = await db.query(
      `SELECT g.*
       FROM chat_groups g
       WHERE g.group_id NOT IN (
         SELECT group_id FROM groupmembers WHERE user_id = ?
       )
       AND (g.access_type = 'public' OR g.access_type = 'approval')
       AND g.expiry_time > NOW()
       ORDER BY g.created_at DESC`,
      [userId]
    );

    res.status(200).json({ groups });
  } catch (error) {
    next(error);
  }
});

const {
  createGroup,
  getUserGroups,
  getGroupDetails,
  extendGroupExpiry,
  deleteGroup,
  inviteToGroup,
  getGroupMembers,
  updateMemberRole,
  leaveGroup,
  joinPublicGroup
} = require('../controllers/groupController');

const createGroupValidators = [
  body('group_name').trim().isLength({ min: 3, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('expiry_time').isISO8601().toDate(),
  body('access_type').optional().isIn(['public', 'private', 'approval'])
];

router.post(
  '/create',
  authenticateToken,
  upload.single('group_image'),
  createGroupValidators,
  validate,
  createGroup
);
router.get('/', authenticateToken, getUserGroups);
router.get('/:id', authenticateToken, authorizeGroupMember, getGroupDetails);
router.patch('/:id/extend', authenticateToken, authorizeGroupAdmin, extendGroupExpiry);
router.delete('/:id', authenticateToken, authorizeGroupAdmin, deleteGroup);
router.post(
  '//:id/invite',
  authenticateToken,
  authorizeGroupAdmin,
  body('email').isEmail(),
  validate,
  inviteToGroup
);
router.get('/:id/members', authenticateToken, authorizeGroupMember, getGroupMembers);
router.patch(
  '/:id/roles',
  authenticateToken,
  authorizeGroupAdmin,
  body('user_id').isInt(),
  body('role').isIn(['admin', 'moderator', 'member']),
  validate,
  updateMemberRole
);
router.post('/:id/leave', authenticateToken, authorizeGroupMember, leaveGroup);
router.post('/:id/join', authenticateToken, joinPublicGroup);

module.exports = router;
