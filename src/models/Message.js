const db = require('../config/database');

class Message {
  // Create a new message
  static async create(messageData) {
    const { group_id, user_id, content, message_type = 'text', reply_to = null } = messageData;
    const [result] = await db.query(
      'INSERT INTO Messages (group_id, user_id, content, message_type, reply_to) VALUES (?, ?, ?, ?, ?)',
      [group_id, user_id, content, message_type, reply_to]
    );
    return result.insertId;
  }

  // Find message by ID
  static async findById(messageId) {
    const [messages] = await db.query(
      `SELECT m.*, u.name, u.email 
       FROM Messages m 
       JOIN Users u ON m.user_id = u.user_id 
       WHERE m.message_id = ?`,
      [messageId]
    );
    return messages[0];
  }

  // Get messages for a group
  static async getByGroupId(groupId, limit = 50, offset = 0) {
    const [messages] = await db.query(
      `SELECT m.*, u.name, u.email 
       FROM Messages m 
       JOIN Users u ON m.user_id = u.user_id 
       WHERE m.group_id = ? 
       ORDER BY m.created_at DESC 
       LIMIT ? OFFSET ?`,
      [groupId, limit, offset]
    );
    return messages;
  }

  // Get replies to a message
  static async getReplies(messageId) {
    const [replies] = await db.query(
      `SELECT m.*, u.name, u.email 
       FROM Messages m 
       JOIN Users u ON m.user_id = u.user_id 
       WHERE m.reply_to = ? 
       ORDER BY m.created_at ASC`,
      [messageId]
    );
    return replies;
  }

  // Update message
  static async update(messageId, content) {
    const [result] = await db.query(
      'UPDATE Messages SET content = ? WHERE message_id = ?',
      [content, messageId]
    );
    return result.affectedRows > 0;
  }

  // Delete message
  static async delete(messageId) {
    const [result] = await db.query(
      'DELETE FROM Messages WHERE message_id = ?',
      [messageId]
    );
    return result.affectedRows > 0;
  }

  // Get message count for group
  static async getMessageCount(groupId) {
    const [count] = await db.query(
      'SELECT COUNT(*) as count FROM Messages WHERE group_id = ?',
      [groupId]
    );
    return count[0].count;
  }

  // Search messages
  static async search(groupId, searchTerm, limit = 50) {
    const [messages] = await db.query(
      `SELECT m.*, u.name, u.email 
       FROM Messages m 
       JOIN Users u ON m.user_id = u.user_id 
       WHERE m.group_id = ? AND m.content LIKE ? 
       ORDER BY m.created_at DESC 
       LIMIT ?`,
      [groupId, `%${searchTerm}%`, limit]
    );
    return messages;
  }
}

module.exports = Message;