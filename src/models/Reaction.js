const db = require('../config/database');

class Reaction {
  // Create or update reaction
  static async addOrUpdate(messageId, userId, reactionType) {
    // Check if user already reacted
    const [existing] = await db.query(
      'SELECT reaction_id FROM Reactions WHERE message_id = ? AND user_id = ?',
      [messageId, userId]
    );

    if (existing.length > 0) {
      // Update existing reaction
      await db.query(
        'UPDATE Reactions SET reaction_type = ?, reacted_at = NOW() WHERE reaction_id = ?',
        [reactionType, existing[0].reaction_id]
      );
      return existing[0].reaction_id;
    } else {
      // Create new reaction
      const [result] = await db.query(
        'INSERT INTO Reactions (message_id, user_id, reaction_type) VALUES (?, ?, ?)',
        [messageId, userId, reactionType]
      );
      return result.insertId;
    }
  }

  // Remove reaction
  static async remove(messageId, userId) {
    const [result] = await db.query(
      'DELETE FROM Reactions WHERE message_id = ? AND user_id = ?',
      [messageId, userId]
    );
    return result.affectedRows > 0;
  }

  // Get reactions for a message
  static async getByMessageId(messageId) {
    const [reactions] = await db.query(
      `SELECT r.*, u.name as user_name 
       FROM Reactions r 
       JOIN Users u ON r.user_id = u.user_id 
       WHERE r.message_id = ? 
       ORDER BY r.reacted_at DESC`,
      [messageId]
    );
    return reactions;
  }

  // Get reaction summary (grouped by type)
  static async getSummary(messageId) {
    const [summary] = await db.query(
      `SELECT reaction_type, COUNT(*) as count 
       FROM Reactions 
       WHERE message_id = ? 
       GROUP BY reaction_type`,
      [messageId]
    );
    return summary;
  }

  // Check if user reacted
  static async hasUserReacted(messageId, userId) {
    const [reactions] = await db.query(
      'SELECT reaction_id FROM Reactions WHERE message_id = ? AND user_id = ?',
      [messageId, userId]
    );
    return reactions.length > 0;
  }

  // Get user's reaction
  static async getUserReaction(messageId, userId) {
    const [reactions] = await db.query(
      'SELECT * FROM Reactions WHERE message_id = ? AND user_id = ?',
      [messageId, userId]
    );
    return reactions[0];
  }
}

module.exports = Reaction;
