const db = require('../config/database');

class Export {
  // Create export record
  static async create(exportData) {
    const { group_id, file_path, hash_value } = exportData;
    const [result] = await db.query(
      'INSERT INTO Exports (group_id, file_path, hash_value) VALUES (?, ?, ?)',
      [group_id, file_path, hash_value]
    );
    return result.insertId;
  }

  // Find export by ID
  static async findById(exportId) {
    const [exports] = await db.query(
      'SELECT * FROM Exports WHERE export_id = ?',
      [exportId]
    );
    return exports[0];
  }

  // Get exports for a group
  static async getByGroupId(groupId) {
    const [exports] = await db.query(
      'SELECT * FROM Exports WHERE group_id = ? ORDER BY created_at DESC',
      [groupId]
    );
    return exports;
  }

  // Delete export
  static async delete(exportId) {
    const [result] = await db.query(
      'DELETE FROM Exports WHERE export_id = ?',
      [exportId]
    );
    return result.affectedRows > 0;
  }

  // Verify export hash
  static async verifyHash(exportId, providedHash) {
    const [exports] = await db.query(
      'SELECT hash_value FROM Exports WHERE export_id = ?',
      [exportId]
    );
    
    if (exports.length === 0) return false;
    return exports[0].hash_value === providedHash;
  }

  // Get all exports
  static async getAll(limit = 100, offset = 0) {
    const [exports] = await db.query(
      `SELECT e.*, g.group_name 
       FROM Exports e 
       LEFT JOIN Groups g ON e.group_id = g.group_id 
       ORDER BY e.created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return exports;
  }

  // Delete old exports (cleanup)
  static async deleteOld(daysOld = 30) {
    const [result] = await db.query(
      'DELETE FROM Exports WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [daysOld]
    );
    return result.affectedRows;
  }
}

module.exports = Export;