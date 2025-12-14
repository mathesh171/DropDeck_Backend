const db = require('../config/database');

class User {
  static async create(userData) {
    const { name, email, password_hash, role = 'member' } = userData;
    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, password_hash, role]
    );
    return result.insertId;
  }

  static async findByEmail(email) {
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return users[0];
  }

  static async findByName(name) {
    const [users] = await db.query(
      'SELECT * FROM users WHERE name = ?',
      [name]
    );
    return users[0];
  }

  static async findById(userId) {
    const [users] = await db.query(
      'SELECT user_id, name, email, role, created_at, last_login FROM users WHERE user_id = ?',
      [userId]
    );
    return users[0];
  }

  static async update(userId, updates) {
    const fields = [];
    const values = [];

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    values.push(userId);

    const [result] = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  static async updateLastLogin(userId) {
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE user_id = ?',
      [userId]
    );
  }

  static async delete(userId) {
    const [result] = await db.query(
      'DELETE FROM users WHERE user_id = ?',
      [userId]
    );
    return result.affectedRows > 0;
  }

  static async getAll(limit = 100, offset = 0) {
    const [users] = await db.query(
      'SELECT user_id, name, email, role, created_at, last_login FROM users LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return users;
  }

  static async emailExists(email) {
    const [users] = await db.query(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );
    return users.length > 0;
  }

  static async nameExists(name) {
    const [users] = await db.query(
      'SELECT user_id FROM users WHERE name = ?',
      [name]
    );
    return users.length > 0;
  }

  static async getUserStats(userId) {
    const [stats] = await db.query(
      `SELECT 
        (SELECT COUNT(*) FROM groupmembers WHERE user_id = ?) as groups_count,
        (SELECT COUNT(*) FROM messages WHERE user_id = ?) as messages_count,
        (SELECT COUNT(*) FROM files f JOIN messages m ON f.message_id = m.message_id WHERE m.user_id = ?) as files_count
      `,
      [userId, userId, userId]
    );
    return stats[0];
  }

  static async setVerificationToken(userId, token) {
    const [result] = await db.query(
      'UPDATE users SET token = ?, authorize = 0 WHERE user_id = ?',
      [token, userId]
    );
    return result.affectedRows > 0;
  }

  static async findByToken(token) {
    const [users] = await db.query(
      'SELECT * FROM users WHERE token = ?',
      [token]
    );
    return users[0];
  }

  static async verifyByToken(token) {
    const user = await this.findByToken(token);
    if (!user) {
      return null;
    }

    if (user.authorize === 1) {
      return user;
    }

    await db.query(
      'UPDATE users SET authorize = 1, token = NULL WHERE user_id = ?',
      [user.user_id]
    );

    const [updatedUsers] = await db.query(
      'SELECT user_id, name, email, role, authorize FROM users WHERE user_id = ?',
      [user.user_id]
    );
    return updatedUsers[0];
  }

  static async isAuthorized(userId) {
    const [users] = await db.query(
      'SELECT authorize FROM users WHERE user_id = ?',
      [userId]
    );
    return users[0]?.authorize === 1;
  }

  static async getUnverifiedUsers(hoursOld = 24) {
    const [users] = await db.query(
      `SELECT user_id, email, name, created_at 
       FROM users 
       WHERE authorize = 0 
       AND token IS NOT NULL 
       AND created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
      [hoursOld]
    );
    return users;
  }

  static async deleteUnverifiedUsers(hoursOld = 24) {
    const [result] = await db.query(
      `DELETE FROM users 
       WHERE authorize = 0 
       AND token IS NOT NULL 
       AND created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
      [hoursOld]
    );
    return result.affectedRows;
  }
}

module.exports = User;
