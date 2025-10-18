const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeGroupMember } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { body } = require('express-validator');
const {
  sendMessage,
  getMessages,
  replyToMessage,
  getMessageThread,
  reactToMessage,
  removeReaction,
  getMessageReactions,
  deleteMessage,
} = require('../controllers/messageController');

// Validators
const messageValidators = [
  body('content').trim().notEmpty().isLength({ max: 5000 }),
  body('message_type').optional().isIn(['text', 'file', 'poll', 'code']),
  body('reply_to').optional().isInt(),
];

// Routes
router.post('/groups/:id/messages', authenticateToken, authorizeGroupMember, messageValidators, validate, sendMessage);
router.get('/groups/:id/messages', authenticateToken, authorizeGroupMember, getMessages);
router.post('/:id/reply', authenticateToken, messageValidators, validate, replyToMessage);
router.get('/:id/thread', authenticateToken, getMessageThread);
router.post('/:id/react', authenticateToken, reactToMessage);
router.delete('/:id/react', authenticateToken, removeReaction);
router.get('/:id/reactions', authenticateToken, getMessageReactions);
router.delete('/:id', authenticateToken, deleteMessage);

module.exports = router;