const db = require('../config/database');

class User {
  // Create a new user
  static async create(userData) {
    const { name, email, password_hash, role = 'member' } = userData;
    const [result] = await db.query(
      'INSERT INTO Users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, password_hash, role]
    );
    return result.insertId;
  }

  // Find user by email
  static async findByEmail(email) {
    const [users] = await db.query(
      'SELECT * FROM Users WHERE email = ?',
      [email]
    );
    return users[0];
  }

  // Find user by ID
  static async findById(userId) {
    const [users] = await db.query(
      'SELECT user_id, name, email, role, created_at, last_login FROM Users WHERE user_id = ?',
      [userId]
    );
    return users[0];
  }

  // Update user
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
      `UPDATE Users SET ${fields.join(', ')} WHERE user_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  // Update last login
  static async updateLastLogin(userId) {
    await db.query(
      'UPDATE Users SET last_login = NOW() WHERE user_id = ?',
      [userId]
    );
  }

  // Delete user
  static async delete(userId) {
    const [result] = await db.query(
      'DELETE FROM Users WHERE user_id = ?',
      [userId]
    );
    return result.affectedRows > 0;
  }

  // Get all users (admin only)
  static async getAll(limit = 100, offset = 0) {
    const [users] = await db.query(
      'SELECT user_id, name, email, role, created_at, last_login FROM Users LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return users;
  }

  // Check if email exists
  static async emailExists(email) {
    const [users] = await db.query(
      'SELECT user_id FROM Users WHERE email = ?',
      [email]
    );
    return users.length > 0;
  }

  // Get user statistics
  static async getUserStats(userId) {
    const [stats] = await db.query(
      `SELECT 
        (SELECT COUNT(*) FROM GroupMembers WHERE user_id = ?) as groups_count,
        (SELECT COUNT(*) FROM Messages WHERE user_id = ?) as messages_count,
        (SELECT COUNT(*) FROM Files f JOIN Messages m ON f.message_id = m.message_id WHERE m.user_id = ?) as files_count
      `,
      [userId, userId, userId]
    );
    return stats[0];
  }

  // ===========================
  // NEW METHODS FOR EMAIL VERIFICATION
  // ===========================

  // Set verification token for user
  static async setVerificationToken(userId, token) {
    const [result] = await db.query(
      'UPDATE Users SET token = ?, authorize = 0 WHERE user_id = ?',
      [token, userId]
    );
    return result.affectedRows > 0;
  }

  // Find user by verification token
  static async findByToken(token) {
    const [users] = await db.query(
      'SELECT * FROM Users WHERE token = ?',
      [token]
    );
    return users[0];
  }

  // Verify user by token and clear token
  static async verifyByToken(token) {
    // First find user with token
    const user = await this.findByToken(token);
    if (!user) {
      return null;
    }

    // Check if already verified
    if (user.authorize === 1) {
      return user;
    }

    // Update authorize to 1 and clear token
    await db.query(
      'UPDATE Users SET authorize = 1, token = NULL WHERE user_id = ?',
      [user.user_id]
    );

    // Return updated user
    const [updatedUsers] = await db.query(
      'SELECT user_id, name, email, role, authorize FROM Users WHERE user_id = ?',
      [user.user_id]
    );
    return updatedUsers[0];
  }

  // Check if user is authorized (email verified)
  static async isAuthorized(userId) {
    const [users] = await db.query(
      'SELECT authorize FROM Users WHERE user_id = ?',
      [userId]
    );
    return users[0]?.authorize === 1;
  }

  // Get unverified users older than specified hours
  static async getUnverifiedUsers(hoursOld = 24) {
    const [users] = await db.query(
      `SELECT user_id, email, name, created_at 
       FROM Users 
       WHERE authorize = 0 
       AND token IS NOT NULL 
       AND created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
      [hoursOld]
    );
    return users;
  }

  // Delete unverified users (cleanup)
  static async deleteUnverifiedUsers(hoursOld = 24) {
    const [result] = await db.query(
      `DELETE FROM Users 
       WHERE authorize = 0 
       AND token IS NOT NULL 
       AND created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
      [hoursOld]
    );
    return result.affectedRows;
  }
}

module.exports = User;