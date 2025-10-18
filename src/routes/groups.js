const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeGroupMember, authorizeGroupAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { body, param } = require('express-validator');
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
} = require('../controllers/groupController');

// Validators
const createGroupValidators = [
  body('group_name').trim().isLength({ min: 3, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('expiry_time').isISO8601().toDate(),
  body('access_type').optional().isIn(['public', 'private', 'approval']),
];

const inviteValidators = [
  body('email').isEmail().normalizeEmail(),
];

const updateRoleValidators = [
  body('user_id').isInt(),
  body('role').isIn(['admin', 'moderator', 'member']),
];

// Routes
router.post('/create', authenticateToken, createGroupValidators, validate, createGroup);
router.get('/', authenticateToken, getUserGroups);
router.get('/:id', authenticateToken, authorizeGroupMember, getGroupDetails);
router.patch('/:id/extend', authenticateToken, authorizeGroupAdmin, extendGroupExpiry);
router.delete('/:id', authenticateToken, authorizeGroupAdmin, deleteGroup);
router.post('/:id/invite', authenticateToken, authorizeGroupAdmin, inviteValidators, validate, inviteToGroup);
router.get('/:id/members', authenticateToken, authorizeGroupMember, getGroupMembers);
router.patch('/:id/roles', authenticateToken, authorizeGroupAdmin, updateRoleValidators, validate, updateMemberRole);
router.post('/:id/leave', authenticateToken, authorizeGroupMember, leaveGroup);

module.exports = router;
