const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeGroupMember } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { pollValidators } = require('../utils/validators');
const {
  createPoll,
  voteOnPoll,
  getGroupPolls,
  getPollResults,
  deletePoll,
} = require('../controllers/pollController');

router.post('/groups/:id/polls', authenticateToken, authorizeGroupMember, pollValidators.create, validate, createPoll);
router.post('/:poll_id/vote', authenticateToken, voteOnPoll);
router.get('/groups/:id/polls', authenticateToken, authorizeGroupMember, getGroupPolls);
router.get('/:poll_id/results', authenticateToken, getPollResults);
router.delete('/:poll_id', authenticateToken, deletePoll);

module.exports = router;