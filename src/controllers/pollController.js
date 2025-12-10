const db = require('../config/database');
const { HTTP_STATUS } = require('../config/constants');
const { Poll, PollOption, PollVote } = require('../models/Poll');

const createPoll = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.user_id;
    const { question, options } = req.body;

    if (!question || !Array.isArray(options) || options.length < 2) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Question and at least two options are required'
      });
    }

    const pollId = await Poll.create({
      group_id: groupId,
      question,
      created_by: userId
    });

    for (const option of options) {
      if (option && option.trim()) {
        await PollOption.create(pollId, option.trim());
      }
    }

    const poll = await Poll.getWithOptions(pollId, userId);

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Poll created successfully',
      poll
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

    if (!option_id) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'option_id is required'
      });
    }

    const [options] = await db.query(
      'SELECT option_id FROM PollOptions WHERE option_id = ? AND poll_id = ?',
      [option_id, pollId]
    );
    if (options.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Option not found for this poll'
      });
    }

    await PollVote.vote(pollId, option_id, userId);

    const poll = await Poll.getWithOptions(pollId, userId);

    res.status(HTTP_STATUS.OK).json({
      message: 'Vote recorded successfully',
      poll
    });
  } catch (error) {
    next(error);
  }
};

const getGroupPolls = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.user_id;
    const polls = await Poll.getByGroupId(groupId, userId);
    res.status(HTTP_STATUS.OK).json({ polls });
  } catch (error) {
    next(error);
  }
};

const getPollResults = async (req, res, next) => {
  try {
    const pollId = req.params.poll_id;
    const userId = req.user.user_id;
    const poll = await Poll.getWithOptions(pollId, userId);

    if (!poll) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Poll not found'
      });
    }

    res.status(HTTP_STATUS.OK).json({
      poll,
      options: poll.options,
      total_votes: poll.total_votes
    });
  } catch (error) {
    next(error);
  }
};

const deletePoll = async (req, res, next) => {
  try {
    const pollId = req.params.poll_id;
    const userId = req.user.user_id;

    const [polls] = await db.query(
      'SELECT created_by, group_id FROM Polls WHERE poll_id = ?',
      [pollId]
    );

    if (polls.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Poll not found'
      });
    }

    const poll = polls[0];

    const [members] = await db.query(
      'SELECT role FROM GroupMembers WHERE group_id = ? AND user_id = ?',
      [poll.group_id, userId]
    );

    const isCreator = poll.created_by === userId;
    const isAdmin = members.length > 0 && members[0].role === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: 'You do not have permission to delete this poll'
      });
    }

    await db.query('DELETE FROM Polls WHERE poll_id = ?', [pollId]);

    res.status(HTTP_STATUS.OK).json({
      message: 'Poll deleted successfully'
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
  deletePoll
};
