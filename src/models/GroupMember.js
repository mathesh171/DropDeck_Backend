const db = require('../config/database');

const GroupMember = {
  add: async (groupId, userId, role) => {
    const [result] = await db.query(
      'INSERT INTO groupmembers (group_id, user_id, role) VALUES (?, ?, ?)',
      [groupId, userId, role || 'member']
    );
    return result.insertId;
  },

  isMember: async (groupId, userId) => {
    const [rows] = await db.query(
      'SELECT 1 FROM groupmembers WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    return rows.length > 0;
  },

  getRole: async (groupId, userId) => {
    const [rows] = await db.query(
      'SELECT role FROM groupmembers WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    return rows[0]?.role || null;
  },

  updateRole: async (groupId, userId, role) => {
    await db.query(
      'UPDATE groupmembers SET role = ? WHERE group_id = ? AND user_id = ?',
      [role, groupId, userId]
    );
  },

  updateLastRead: async (groupId, userId) => {
    await db.query(
      'UPDATE groupmembers SET last_read_at = NOW() WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
  },

  getMembers: async groupId => {
    const [rows] = await db.query(
      'SELECT * FROM groupmembers WHERE group_id = ?',
      [groupId]
    );
    return rows;
  },

  getAdmins: async groupId => {
    const [rows] = await db.query(
      'SELECT gm.*, u.email FROM groupmembers gm JOIN users u ON gm.user_id = u.user_id WHERE gm.group_id = ? AND gm.role = "admin"',
      [groupId]
    );
    return rows;
  }
};

module.exports = GroupMember;