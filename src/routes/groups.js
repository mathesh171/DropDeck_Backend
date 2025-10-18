const express = require('express');
const router = express.Router();
const {
  authenticateToken,
  authorizeGroupMember,
  authorizeGroupAdmin,
} = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { groupValidators } = require('../utils/validators');
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

router.post('/create', authenticateToken, groupValidators.create, validate, createGroup);
router.get('/', authenticateToken, getUserGroups);
router.get('/:id', authenticateToken, authorizeGroupMember, getGroupDetails);
router.patch('/:id/extend', authenticateToken, authorizeGroupAdmin, extendGroupExpiry);
router.delete('/:id', authenticateToken, authorizeGroupAdmin, deleteGroup);
router.post('/:id/invite', authenticateToken, authorizeGroupAdmin, inviteToGroup);
router.get('/:id/members', authenticateToken, authorizeGroupMember, getGroupMembers);
router.patch('/:id/roles', authenticateToken, authorizeGroupAdmin, updateMemberRole);
router.delete('/:id/leave', authenticateToken, authorizeGroupMember, leaveGroup);

module.exports = router;