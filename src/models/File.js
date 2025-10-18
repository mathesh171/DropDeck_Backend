const db = require('../config/database');

class File {
  // Create file record
  static async create(fileData) {
    const { message_id, file_name, file_path, file_size, file_type } = fileData;
    const [result] = await db.query(
      'INSERT INTO Files (message_id, file_name, file_path, file_size, file_type) VALUES (?, ?, ?, ?, ?)',
      [message_id, file_name, file_path, file_size, file_type]
    );
    return result.insertId;
  }

  // Find file by ID
  static async findById(fileId) {
    const [files] = await db.query(
      'SELECT * FROM Files WHERE file_id = ?',
      [fileId]
    );
    return files[0];
  }

  // Get files for a group
  static async getByGroupId(groupId) {
    const [files] = await db.query(
      `SELECT f.*, m.created_at, u.name as uploaded_by 
       FROM Files f 
       JOIN Messages m ON f.message_id = m.message_id 
       JOIN Users u ON m.user_id = u.user_id 
       WHERE m.group_id = ? 
       ORDER BY f.uploaded_at DESC`,
      [groupId]
    );
    return files;
  }

  // Get file by message ID
  static async getByMessageId(messageId) {
    const [files] = await db.query(
      'SELECT * FROM Files WHERE message_id = ?',
      [messageId]
    );
    return files;
  }

  // Delete file
  static async delete(fileId) {
    const [result] = await db.query(
      'DELETE FROM Files WHERE file_id = ?',
      [fileId]
    );
    return result.affectedRows > 0;
  }

  // Get total file size for group
  static async getTotalSize(groupId) {
    const [size] = await db.query(
      `SELECT SUM(f.file_size) as total_size 
       FROM Files f 
       JOIN Messages m ON f.message_id = m.message_id 
       WHERE m.group_id = ?`,
      [groupId]
    );
    return size[0].total_size || 0;
  }
}

module.exports = File;