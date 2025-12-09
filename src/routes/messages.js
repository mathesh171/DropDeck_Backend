const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  sendMessage,
  markGroupRead,
  getMessages,
  replyToMessage,
  getMessageThread,
  reactToMessage,
  removeReaction,
  getMessageReactions,
  deleteMessage
} = require('../controllers/messageController');

router.post('/groups/:id/messages', authenticateToken, sendMessage);
router.post('/groups/:id/read', authenticateToken, markGroupRead);
router.get('/groups/:id/messages', authenticateToken, getMessages);
router.post('/:id/reply', authenticateToken, replyToMessage);
router.get('/:id/thread', authenticateToken, getMessageThread);
router.post('/:id/react', authenticateToken, reactToMessage);
router.delete('/:id/react', authenticateToken, removeReaction);
router.get('/:id/reactions', authenticateToken, getMessageReactions);
router.delete('/:id', authenticateToken, deleteMessage);

module.exports = router;
