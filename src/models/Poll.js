const db = require('../config/database');

class Poll {
  // Create a new poll
  static async create(pollData) {
    const { group_id, question, created_by } = pollData;
    const [result] = await db.query(
      'INSERT INTO Polls (group_id, question, created_by) VALUES (?, ?, ?)',
      [group_id, question, created_by]
    );
    return result.insertId;
  }

  // Find poll by ID
  static async findById(pollId) {
    const [polls] = await db.query(
      `SELECT p.*, u.name as creator_name 
       FROM Polls p 
       JOIN Users u ON p.created_by = u.user_id 
       WHERE p.poll_id = ?`,
      [pollId]
    );
    return polls[0];
  }

  // Get polls for a group
  static async getByGroupId(groupId) {
    const [polls] = await db.query(
      `SELECT p.*, u.name as creator_name,
       (SELECT COUNT(DISTINCT user_id) FROM PollVotes WHERE poll_id = p.poll_id) as total_votes
       FROM Polls p 
       JOIN Users u ON p.created_by = u.user_id 
       WHERE p.group_id = ? 
       ORDER BY p.created_at DESC`,
      [groupId]
    );
    return polls;
  }

  // Delete poll
  static async delete(pollId) {
    const [result] = await db.query(
      'DELETE FROM Polls WHERE poll_id = ?',
      [pollId]
    );
    return result.affectedRows > 0;
  }

  // Get poll with options
  static async getWithOptions(pollId) {
    const poll = await this.findById(pollId);
    if (!poll) return null;

    const [options] = await db.query(
      `SELECT po.*, COUNT(pv.vote_id) as vote_count 
       FROM PollOptions po 
       LEFT JOIN PollVotes pv ON po.option_id = pv.option_id 
       WHERE po.poll_id = ? 
       GROUP BY po.option_id`,
      [pollId]
    );

    poll.options = options;
    return poll;
  }
}

class PollOption {
  // Create poll option
  static async create(pollId, optionText) {
    const [result] = await db.query(
      'INSERT INTO PollOptions (poll_id, option_text) VALUES (?, ?)',
      [pollId, optionText]
    );
    return result.insertId;
  }

  // Get options for poll
  static async getByPollId(pollId) {
    const [options] = await db.query(
      'SELECT * FROM PollOptions WHERE poll_id = ?',
      [pollId]
    );
    return options;
  }

  // Delete option
  static async delete(optionId) {
    const [result] = await db.query(
      'DELETE FROM PollOptions WHERE option_id = ?',
      [optionId]
    );
    return result.affectedRows > 0;
  }
}

class PollVote {
  // Create or update vote
  static async vote(pollId, optionId, userId) {
    // Check if user already voted
    const [existing] = await db.query(
      'SELECT vote_id FROM PollVotes WHERE poll_id = ? AND user_id = ?',
      [pollId, userId]
    );

    if (existing.length > 0) {
      // Update existing vote
      await db.query(
        'UPDATE PollVotes SET option_id = ?, voted_at = NOW() WHERE vote_id = ?',
        [optionId, existing[0].vote_id]
      );
      return existing[0].vote_id;
    } else {
      // Create new vote
      const [result] = await db.query(
        'INSERT INTO PollVotes (poll_id, option_id, user_id) VALUES (?, ?, ?)',
        [pollId, optionId, userId]
      );
      return result.insertId;
    }
  }

  // Get user's vote for a poll
  static async getUserVote(pollId, userId) {
    const [votes] = await db.query(
      'SELECT * FROM PollVotes WHERE poll_id = ? AND user_id = ?',
      [pollId, userId]
    );
    return votes[0];
  }

  // Get all votes for a poll
  static async getByPollId(pollId) {
    const [votes] = await db.query(
      `SELECT pv.*, u.name as voter_name, po.option_text 
       FROM PollVotes pv 
       JOIN Users u ON pv.user_id = u.user_id 
       JOIN PollOptions po ON pv.option_id = po.option_id 
       WHERE pv.poll_id = ?`,
      [pollId]
    );
    return votes;
  }

  // Remove vote
  static async remove(pollId, userId) {
    const [result] = await db.query(
      'DELETE FROM PollVotes WHERE poll_id = ? AND user_id = ?',
      [pollId, userId]
    );
    return result.affectedRows > 0;
  }

  // Get vote count for option
  static async getOptionVoteCount(optionId) {
    const [count] = await db.query(
      'SELECT COUNT(*) as count FROM PollVotes WHERE option_id = ?',
      [optionId]
    );
    return count[0].count;
  }
}

module.exports = { Poll, PollOption, PollVote };