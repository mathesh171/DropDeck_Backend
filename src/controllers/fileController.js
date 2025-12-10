const db = require('../config/database');
const { encrypt, decrypt } = require('../services/encryptionService');
const { HTTP_STATUS, ALLOWED_FILE_TYPES } = require('../config/constants');
const fs = require('fs');

const uploadFile = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.user_id;
    const file = req.file;

    if (!file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'No file uploaded'
      });
    }

    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      fs.unlinkSync(file.path);
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ error: `File type ${file.mimetype} not allowed` });
    }

    const encryptedPath = encrypt(file.path);

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const encryptedName = encrypt(file.originalname);
      const [messageResult] = await connection.query(
        `INSERT INTO Messages (group_id, user_id, content, message_type)
         VALUES (?, ?, ?, ?)`,
        [groupId, userId, encryptedName, 'file']
      );
      const messageId = messageResult.insertId;

      const [fileResult] = await connection.query(
        `INSERT INTO Files (message_id, file_name, file_path, file_size, file_type)
         VALUES (?, ?, ?, ?, ?)`,
        [messageId, file.originalname, encryptedPath, file.size, file.mimetype]
      );

      await connection.commit();

      const message = {
        message_id: messageId,
        group_id: parseInt(groupId, 10),
        user_id: userId,
        content: file.originalname,
        message_type: 'file',
        file_id: fileResult.insertId,
        file_name: file.originalname
      };

      if (global.io) {
        global.io.to(`group:${groupId}`).emit('newMessage', message);
      }

      res.status(HTTP_STATUS.CREATED).json({
        message: 'File uploaded successfully',
        data: message
      });
    } catch (error) {
      await connection.rollback();
      fs.unlinkSync(file.path);
      next(error);
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

const getGroupFiles = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const [files] = await db.query(
      `SELECT f.*, m.created_at, u.name as uploaded_by
       FROM Files f
       JOIN Messages m ON f.message_id = m.message_id
       JOIN Users u ON m.user_id = u.user_id
       WHERE m.group_id = ?
       ORDER BY f.uploaded_at DESC`,
      [groupId]
    );
    res.status(HTTP_STATUS.OK).json({ files });
  } catch (error) {
    next(error);
  }
};

const downloadFile = async (req, res, next) => {
  try {
    const fileId = req.params.file_id;

    const [files] = await db.query(
      'SELECT * FROM Files WHERE file_id = ?',
      [fileId]
    );
    if (files.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'File not found'
      });
    }

    const file = files[0];
    const filePath = decrypt(file.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'File not found on server'
      });
    }

    res.download(filePath, file.file_name);
  } catch (error) {
    next(error);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    const fileId = req.params.file_id;
    const userId = req.user.user_id;

    const [files] = await db.query(
      `SELECT f.*, m.user_id, m.group_id
       FROM Files f
       JOIN Messages m ON f.message_id = m.message_id
       WHERE f.file_id = ?`,
      [fileId]
    );
    if (files.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'File not found'
      });
    }

    const file = files[0];

    const [members] = await db.query(
      'SELECT role FROM GroupMembers WHERE group_id = ? AND user_id = ?',
      [file.group_id, userId]
    );

    const isOwner = file.user_id === userId;
    const isAdmin = members.length > 0 && members[0].role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: 'You do not have permission to delete this file'
      });
    }

    const { secureDelete } = require('../services/secureDeleteService');
    const filePath = decrypt(file.file_path);

    if (fs.existsSync(filePath)) {
      await secureDelete(filePath);
    }

    await db.query('DELETE FROM Files WHERE file_id = ?', [fileId]);

    res.status(HTTP_STATUS.OK).json({ message: 'File deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
  getGroupFiles,
  downloadFile,
  deleteFile
};
