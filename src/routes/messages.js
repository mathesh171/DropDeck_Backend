const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeGroupMember } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { messageValidators } = require('../utils/validators');
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

router.post('/groups/:id/messages', authenticateToken, authorizeGroupMember, messageValidators.send, validate, sendMessage);
router.get('/groups/:id/messages', authenticateToken, authorizeGroupMember, getMessages);
router.post('/:id/reply', authenticateToken, replyToMessage);
router.get('/:id/thread', authenticateToken, getMessageThread);
router.post('/:id/react', authenticateToken, reactToMessage);
router.delete('/:id/react', authenticateToken, removeReaction);
router.get('/:id/reactions', authenticateToken, getMessageReactions);
router.delete('/:id', authenticateToken, deleteMessage);

module.exports = router;