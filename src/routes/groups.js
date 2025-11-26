const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const { authenticateToken, authorizeGroupMember, authorizeGroupAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { body } = require('express-validator');

const {
  createGroup,
  getUserGroups,
  getGroupDetails,
  extendGroupExpiry,
  deleteGroup,
  inviteToGroup,
  getGroupMembers,
  updateMemberRole,
  leaveGroup
} = require('../controllers/groupController');

const createGroupValidators = [
  body('group_name').trim().isLength({ min: 3, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('expiry_time').isISO8601().toDate(),
  body('access_type').optional().isIn(['public', 'private', 'approval'])
];

router.post('/create', authenticateToken, upload.single('group_image'), createGroupValidators, validate, createGroup);
router.get('/', authenticateToken, getUserGroups);
router.get('/:id', authenticateToken, authorizeGroupMember, getGroupDetails);
router.patch('/:id/extend', authenticateToken, authorizeGroupAdmin, extendGroupExpiry);
router.delete('/:id', authenticateToken, authorizeGroupAdmin, deleteGroup);
router.post('/:id/invite', authenticateToken, authorizeGroupAdmin, body('email').isEmail(), validate, inviteToGroup);
router.get('/:id/members', authenticateToken, authorizeGroupMember, getGroupMembers);
router.patch('/:id/roles', authenticateToken, authorizeGroupAdmin, body('user_id').isInt(), body('role').isIn(['admin', 'moderator', 'member']), validate, updateMemberRole);
router.post('/:id/leave', authenticateToken, authorizeGroupMember, leaveGroup);

module.exports = router;
