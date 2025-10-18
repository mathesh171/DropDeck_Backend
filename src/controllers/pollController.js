const db = require('../config/database');
const { HTTP_STATUS } = require('../config/constants');

const createPoll = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.user_id;
    const { question, options } = req.body;

    // Create poll
    const [pollResult] = await db.query(
      'INSERT INTO Polls (group_id, question, created_by) VALUES (?, ?, ?)',
      [groupId, question, userId]
    );

    const pollId = pollResult.insertId;

    // Insert poll options
    for (const option of options) {
      await db.query(
        'INSERT INTO PollOptions (poll_id, option_text) VALUES (?, ?)',
        [pollId, option]
      );
    }

    // Get created poll with options
    const [polls] = await db.query(
      `SELECT p.*, u.name as creator_name 
       FROM Polls p 
       JOIN Users u ON p.created_by = u.user_id 
       WHERE p.poll_id = ?`,
      [pollId]
    );

    const [pollOptions] = await db.query(
      'SELECT * FROM PollOptions WHERE poll_id = ?',
      [pollId]
    );

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Poll created successfully',
      poll: {
        ...polls[0],
        options: pollOptions,
      },
    });
  } catch (error) {
    next(error);
  }
};

const voteOnPoll = async (req, res, next) => {
  try {
    const pollId = req.params.poll_id;
    const userId = req.user.user_id;
    const { option_id } = req.body;

    // Check if user already voted
    const [existingVotes] = await db.query(
      'SELECT vote_id FROM PollVotes WHERE poll_id = ? AND user_id = ?',
      [pollId, userId]
    );

    if (existingVotes.length > 0) {
      // Update existing vote
      await db.query(
        'UPDATE PollVotes SET option_id = ? WHERE vote_id = ?',
        [option_id, existingVotes[0].vote_id]
      );
    } else {
      // Create new vote
      await db.query(
        'INSERT INTO PollVotes (poll_id, option_id, user_id) VALUES (?, ?, ?)',
        [pollId, option_id, userId]
      );
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Vote recorded successfully',
    });
  } catch (error) {
    next(error);
  }
};

const getGroupPolls = async (req, res, next) => {
  try {
    const groupId = req.params.id;

    const [polls] = await db.query(
      `SELECT p.*, u.name as creator_name 
       FROM Polls p 
       JOIN Users u ON p.created_by = u.user_id 
       WHERE p.group_id = ? 
       ORDER BY p.created_at DESC`,
      [groupId]
    );

    // Get options for each poll
    for (let poll of polls) {
      const [options] = await db.query(
        'SELECT * FROM PollOptions WHERE poll_id = ?',
        [poll.poll_id]
      );
      poll.options = options;
    }

    res.status(HTTP_STATUS.OK).json({
      polls,
    });
  } catch (error) {
    next(error);
  }
};

const getPollResults = async (req, res, next) => {
  try {
    const pollId = req.params.poll_id;

    // Get poll details
    const [polls] = await db.query(
      `SELECT p.*, u.name as creator_name 
       FROM Polls p 
       JOIN Users u ON p.created_by = u.user_id 
       WHERE p.poll_id = ?`,
      [pollId]
    );

    if (polls.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Poll not found',
      });
    }

    // Get options with vote counts
    const [options] = await db.query(
      `SELECT po.*, COUNT(pv.vote_id) as vote_count 
       FROM PollOptions po 
       LEFT JOIN PollVotes pv ON po.option_id = pv.option_id 
       WHERE po.poll_id = ? 
       GROUP BY po.option_id`,
      [pollId]
    );

    // Get total votes
    const [totalVotes] = await db.query(
      'SELECT COUNT(*) as total FROM PollVotes WHERE poll_id = ?',
      [pollId]
    );

    res.status(HTTP_STATUS.OK).json({
      poll: polls[0],
      options,
      total_votes: totalVotes[0].total,
    });
  } catch (error) {
    next(error);
  }
};

const deletePoll = async (req, res, next) => {
  try {
    const pollId = req.params.poll_id;
    const userId = req.user.user_id;

    // Check if user created the poll or is admin
    const [polls] = await db.query(
      'SELECT created_by, group_id FROM Polls WHERE poll_id = ?',
      [pollId]
    );

    if (polls.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Poll not found',
      });
    }

    const poll = polls[0];

    // Check permissions
    const [members] = await db.query(
      'SELECT role FROM GroupMembers WHERE group_id = ? AND user_id = ?',
      [poll.group_id, userId]
    );

    const isCreator = poll.created_by === userId;
    const isAdmin = members.length > 0 && members[0].role === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: 'You do not have permission to delete this poll',
      });
    }

    // Delete poll (cascade will handle options and votes)
    await db.query('DELETE FROM Polls WHERE poll_id = ?', [pollId]);

    res.status(HTTP_STATUS.OK).json({
      message: 'Poll deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPoll,
  voteOnPoll,
  getGroupPolls,
  getPollResults,
  deletePoll,
};