const db = require('../config/database');
const { decrypt } = require('../services/encryptionService');

class Group {
  static async create(groupData) {
    const {
      group_name,
      description,
      created_by,
      expiry_time,
      access_type = 'public',
      group_image = null
    } = groupData;
    const [result] = await db.query(
      'INSERT INTO chat_groups (group_name, description, created_by, expiry_time, access_type, group_image) VALUES (?, ?, ?, ?, ?, ?)',
      [group_name, description, created_by, expiry_time, access_type, group_image]
    );
    return result.insertId;
  }

  static async findById(groupId) {
    const [groups] = await db.query(
      `SELECT g.*, u.name AS creator_name,
       (SELECT COUNT(*) FROM groupmembers WHERE group_id = g.group_id) AS member_count
       FROM chat_groups g
       JOIN users u ON g.created_by = u.user_id
       WHERE g.group_id = ?`,
      [groupId]
    );
    return groups[0];
  }

  static async findByUserId(userId) {
    const [groups] = await db.query(
      `SELECT 
         g.*, 
         gm.role AS user_role, 
         u.name AS creator_name,
         gm.last_read_at,
         (SELECT COUNT(*) FROM groupmembers WHERE group_id = g.group_id) AS member_count,
         (SELECT COUNT(*) FROM messages WHERE group_id = g.group_id) AS message_count,
         m.message_id AS last_message_id,
         m.content AS last_message_content,
         m.created_at AS last_message_created_at,
         sender.name AS last_message_sender,
         (
           SELECT COUNT(*) 
           FROM messages mx
           WHERE mx.group_id = g.group_id
             AND mx.created_at > IFNULL(gm.last_read_at, '1970-01-01 00:00:00')
         ) AS unread_count
       FROM chat_groups g
       JOIN groupmembers gm ON g.group_id = gm.group_id
       JOIN users u ON g.created_by = u.user_id
       LEFT JOIN (
         SELECT m1.group_id, m1.message_id, m1.content, m1.created_at, m1.user_id
         FROM messages m1
         INNER JOIN (
           SELECT group_id, MAX(created_at) AS max_created
           FROM messages
           GROUP BY group_id
         ) m2 ON m1.group_id = m2.group_id AND m1.created_at = m2.max_created
       ) m ON m.group_id = g.group_id
       LEFT JOIN users sender ON m.user_id = sender.user_id
       WHERE gm.user_id = ?
       ORDER BY 
         CASE 
           WHEN m.created_at IS NULL THEN g.created_at
           ELSE m.created_at
         END DESC`,
      [userId]
    );

    return groups.map(g => ({
      ...g,
      last_message: g.last_message_id
        ? {
            message_id: g.last_message_id,
            content: g.last_message_content ? decrypt(g.last_message_content) : '',
            created_at: g.last_message_created_at,
            sender: g.last_message_sender
          }
        : null
    }));
  }

  static async update(groupId, updates) {
    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    values.push(groupId);

    const [result] = await db.query(
      `UPDATE chat_groups SET ${fields.join(', ')} WHERE group_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  static async delete(groupId) {
    const [result] = await db.query(
      'DELETE FROM chat_groups WHERE group_id = ?',
      [groupId]
    );
    return result.affectedRows > 0;
  }

  static async getExpiredGroups() {
    const [groups] = await db.query(
      `SELECT g.*, u.email, u.name 
       FROM chat_groups g 
       JOIN users u ON g.created_by = u.user_id 
       WHERE g.expiry_time <= NOW()`
    );
    return groups;
  }

  static async extendExpiry(groupId, newExpiryTime) {
    const [result] = await db.query(
      'UPDATE chat_groups SET expiry_time = ? WHERE group_id = ?',
      [newExpiryTime, groupId]
    );
    return result.affectedRows > 0;
  }

  static async exists(groupId) {
    const [groups] = await db.query(
      'SELECT group_id FROM chat_groups WHERE group_id = ?',
      [groupId]
    );
    return groups.length > 0;
  }

  static async getGroupStats(groupId) {
    const [stats] = await db.query(
      `SELECT 
         (SELECT COUNT(*) FROM groupmembers WHERE group_id = ?) AS member_count,
         (SELECT COUNT(*) FROM messages WHERE group_id = ?) AS message_count,
         (SELECT COUNT(*) FROM files f JOIN messages m ON f.message_id = m.message_id WHERE m.group_id = ?) AS file_count,
         (SELECT COUNT(*) FROM polls WHERE group_id = ?) AS poll_count`,
      [groupId, groupId, groupId, groupId]
    );
    return stats[0];
  }
}

module.exports = Group;
