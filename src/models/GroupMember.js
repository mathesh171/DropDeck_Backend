const db = require('../config/database');

class GroupMember {
  // Add member to group
  static async add(groupId, userId, role = 'member') {
    const [result] = await db.query(
      'INSERT INTO GroupMembers (group_id, user_id, role) VALUES (?, ?, ?)',
      [groupId, userId, role]
    );
    return result.insertId;
  }

  // Check if user is member of group
  static async isMember(groupId, userId) {
    const [members] = await db.query(
      'SELECT id FROM GroupMembers WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    return members.length > 0;
  }

  // Get member role
  static async getRole(groupId, userId) {
    const [members] = await db.query(
      'SELECT role FROM GroupMembers WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    return members[0]?.role;
  }

  // Update member role
  static async updateRole(groupId, userId, role) {
    const [result] = await db.query(
      'UPDATE GroupMembers SET role = ? WHERE group_id = ? AND user_id = ?',
      [role, groupId, userId]
    );
    return result.affectedRows > 0;
  }

  // Remove member from group
  static async remove(groupId, userId) {
    const [result] = await db.query(
      'DELETE FROM GroupMembers WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    return result.affectedRows > 0;
  }

  // Get all members of a group
  static async getMembers(groupId) {
    const [members] = await db.query(
      `SELECT u.user_id, u.name, u.email, gm.role, gm.joined_at
       FROM GroupMembers gm
       JOIN Users u ON gm.user_id = u.user_id
       WHERE gm.group_id = ?
       ORDER BY gm.joined_at ASC`,
      [groupId]
    );
    return members;
  }

  // Get member count
  static async getMemberCount(groupId) {
    const [count] = await db.query(
      'SELECT COUNT(*) as count FROM GroupMembers WHERE group_id = ?',
      [groupId]
    );
    return count[0].count;
  }

  // Get admins of a group
  static async getAdmins(groupId) {
    const [admins] = await db.query(
      `SELECT u.user_id, u.name, u.email
       FROM GroupMembers gm
       JOIN Users u ON gm.user_id = u.user_id
       WHERE gm.group_id = ? AND gm.role = 'admin'`,
      [groupId]
    );
    return admins;
  }

  // Check if user is admin
  static async isAdmin(groupId, userId) {
    const [members] = await db.query(
      'SELECT role FROM GroupMembers WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    return members[0]?.role === 'admin';
  }
}

module.exports = GroupMember;