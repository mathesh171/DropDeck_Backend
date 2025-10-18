const db = require('../config/database');

class Group {
  // Create a new group
  static async create(groupData) {
    const { group_name, description, created_by, expiry_time, access_type = 'public' } = groupData;
    const [result] = await db.query(
      'INSERT INTO Groups (group_name, description, created_by, expiry_time, access_type) VALUES (?, ?, ?, ?, ?)',
      [group_name, description, created_by, expiry_time, access_type]
    );
    return result.insertId;
  }

  // Find group by ID
  static async findById(groupId) {
    const [groups] = await db.query(
      `SELECT g.*, u.name as creator_name,
       (SELECT COUNT(*) FROM GroupMembers WHERE group_id = g.group_id) as member_count
       FROM Groups g
       JOIN Users u ON g.created_by = u.user_id
       WHERE g.group_id = ?`,
      [groupId]
    );
    return groups[0];
  }

  // Get all groups for a user
  static async findByUserId(userId) {
    const [groups] = await db.query(
      `SELECT g.*, gm.role as user_role, u.name as creator_name,
       (SELECT COUNT(*) FROM GroupMembers WHERE group_id = g.group_id) as member_count,
       (SELECT COUNT(*) FROM Messages WHERE group_id = g.group_id) as message_count
       FROM Groups g
       JOIN GroupMembers gm ON g.group_id = gm.group_id
       JOIN Users u ON g.created_by = u.user_id
       WHERE gm.user_id = ?
       ORDER BY g.created_at DESC`,
      [userId]
    );
    return groups;
  }

  // Update group
  static async update(groupId, updates) {
    const fields = [];
    const values = [];

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    values.push(groupId);

    const [result] = await db.query(
      `UPDATE Groups SET ${fields.join(', ')} WHERE group_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  // Delete group
  static async delete(groupId) {
    const [result] = await db.query(
      'DELETE FROM Groups WHERE group_id = ?',
      [groupId]
    );
    return result.affectedRows > 0;
  }

  // Get expired groups
  static async getExpiredGroups() {
    const [groups] = await db.query(
      `SELECT g.*, u.email, u.name 
       FROM Groups g 
       JOIN Users u ON g.created_by = u.user_id 
       WHERE g.expiry_time <= NOW()`
    );
    return groups;
  }

  // Extend group expiry
  static async extendExpiry(groupId, newExpiryTime) {
    const [result] = await db.query(
      'UPDATE Groups SET expiry_time = ? WHERE group_id = ?',
      [newExpiryTime, groupId]
    );
    return result.affectedRows > 0;
  }

  // Check if group exists
  static async exists(groupId) {
    const [groups] = await db.query(
      'SELECT group_id FROM Groups WHERE group_id = ?',
      [groupId]
    );
    return groups.length > 0;
  }

  // Get group statistics
  static async getGroupStats(groupId) {
    const [stats] = await db.query(
      `SELECT 
        (SELECT COUNT(*) FROM GroupMembers WHERE group_id = ?) as member_count,
        (SELECT COUNT(*) FROM Messages WHERE group_id = ?) as message_count,
        (SELECT COUNT(*) FROM Files f JOIN Messages m ON f.message_id = m.message_id WHERE m.group_id = ?) as file_count,
        (SELECT COUNT(*) FROM Polls WHERE group_id = ?) as poll_count
      `,
      [groupId, groupId, groupId, groupId]
    );
    return stats[0];
  }
}

module.exports = Group;