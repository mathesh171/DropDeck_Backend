const db = require('../config/database');
const { encrypt, decrypt } = require('../services/encryptionService');
const { HTTP_STATUS } = require('../config/constants');
const { io } = require('../../server'); // Import the socket.io instance

const sendMessage = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.user_id;
    const { content, message_type, reply_to } = req.body;

    const encryptedContent = encrypt(content);

    const [result] = await db.query(
      `INSERT INTO Messages (group_id, user_id, content, message_type, reply_to) 
       VALUES (?, ?, ?, ?, ?)`,
      [groupId, userId, encryptedContent, message_type || 'text', reply_to || null]
    );

    const messageId = result.insertId;

    const [messages] = await db.query(
      `SELECT m.*, u.name, u.email 
       FROM Messages m 
       JOIN Users u ON m.user_id = u.user_id 
       WHERE m.message_id = ?`,
      [messageId]
    );

    const message = messages[0];
    message.content = decrypt(message.content);

    // Emit notification to all group members about the new message
    const [members] = await db.query('SELECT user_id FROM GroupMembers WHERE group_id = ?', [groupId]);
    for (const member of members) {
      io.to(`user:${member.user_id}`).emit('groupListUpdate', { groupId });
    }

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};


const getMessages = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const { limit = 50, offset = 0 } = req.query;

    const [messages] = await db.query(
      `SELECT m.*, u.name, u.email 
       FROM Messages m 
       JOIN Users u ON m.user_id = u.user_id 
       WHERE m.group_id = ? 
       ORDER BY m.created_at DESC 
       LIMIT ? OFFSET ?`,
      [groupId, parseInt(limit), parseInt(offset)]
    );

    // Decrypt messages
    const decryptedMessages = messages.map((msg) => ({
      ...msg,
      content: msg.content ? decrypt(msg.content) : null,
    }));

    res.status(HTTP_STATUS.OK).json({
      messages: decryptedMessages,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    next(error);
  }
};

const replyToMessage = async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.user_id;
    const { content } = req.body;

    // Get original message to find group_id
    const [originalMessages] = await db.query(
      'SELECT group_id FROM Messages WHERE message_id = ?',
      [messageId]
    );

    if (originalMessages.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Original message not found',
      });
    }

    const groupId = originalMessages[0].group_id;
    const encryptedContent = encrypt(content);

    // Insert reply
    const [result] = await db.query(
      `INSERT INTO Messages (group_id, user_id, content, message_type, reply_to) 
       VALUES (?, ?, ?, ?, ?)`,
      [groupId, userId, encryptedContent, 'reply', messageId]
    );

    const replyId = result.insertId;

    // Get the reply with user info
    const [replies] = await db.query(
      `SELECT m.*, u.name, u.email 
       FROM Messages m 
       JOIN Users u ON m.user_id = u.user_id 
       WHERE m.message_id = ?`,
      [replyId]
    );

    const reply = replies[0];
    reply.content = decrypt(reply.content);

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Reply sent successfully',
      data: reply,
    });
  } catch (error) {
    next(error);
  }
};

const getMessageThread = async (req, res, next) => {
  try {
    const messageId = req.params.id;

    const [replies] = await db.query(
      `SELECT m.*, u.name, u.email 
       FROM Messages m 
       JOIN Users u ON m.user_id = u.user_id 
       WHERE m.reply_to = ? 
       ORDER BY m.created_at ASC`,
      [messageId]
    );

    // Decrypt replies
    const decryptedReplies = replies.map((msg) => ({
      ...msg,
      content: decrypt(msg.content),
    }));

    res.status(HTTP_STATUS.OK).json({
      replies: decryptedReplies,
    });
  } catch (error) {
    next(error);
  }
};

const reactToMessage = async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.user_id;
    const { reaction_type } = req.body;

    // Check if user already reacted
    const [existing] = await db.query(
      'SELECT reaction_id FROM Reactions WHERE message_id = ? AND user_id = ?',
      [messageId, userId]
    );

    if (existing.length > 0) {
      // Update existing reaction
      await db.query(
        'UPDATE Reactions SET reaction_type = ? WHERE reaction_id = ?',
        [reaction_type, existing[0].reaction_id]
      );
    } else {
      // Create new reaction
      await db.query(
        'INSERT INTO Reactions (message_id, user_id, reaction_type) VALUES (?, ?, ?)',
        [messageId, userId, reaction_type]
      );
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Reaction added successfully',
    });
  } catch (error) {
    next(error);
  }
};

const removeReaction = async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.user_id;

    await db.query(
      'DELETE FROM Reactions WHERE message_id = ? AND user_id = ?',
      [messageId, userId]
    );

    res.status(HTTP_STATUS.OK).json({
      message: 'Reaction removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

const getMessageReactions = async (req, res, next) => {
  try {
    const messageId = req.params.id;

    const [reactions] = await db.query(
      `SELECT r.*, u.name 
       FROM Reactions r 
       JOIN Users u ON r.user_id = u.user_id 
       WHERE r.message_id = ?`,
      [messageId]
    );

    res.status(HTTP_STATUS.OK).json({
      reactions,
    });
  } catch (error) {
    next(error);
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.user_id;

    // Check if user owns the message or is admin
    const [messages] = await db.query(
      'SELECT user_id, group_id FROM Messages WHERE message_id = ?',
      [messageId]
    );

    if (messages.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Message not found',
      });
    }

    const message = messages[0];

    // Check permissions
    const [members] = await db.query(
      'SELECT role FROM GroupMembers WHERE group_id = ? AND user_id = ?',
      [message.group_id, userId]
    );

    const isOwner = message.user_id === userId;
    const isAdmin = members.length > 0 && members[0].role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: 'You do not have permission to delete this message',
      });
    }

    // Delete message (cascade will handle reactions, files, etc.)
    await db.query('DELETE FROM Messages WHERE message_id = ?', [messageId]);

    res.status(HTTP_STATUS.OK).json({
      message: 'Message deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendMessage,
  getMessages,
  replyToMessage,
  getMessageThread,
  reactToMessage,
  removeReaction,
  getMessageReactions,
  deleteMessage,
};