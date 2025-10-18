const jwt = require('jsonwebtoken');
const { HTTP_STATUS } = require('../config/constants');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'Access token required',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists
    const [users] = await db.query(
      'SELECT user_id, email, name, role FROM Users WHERE user_id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'User not found',
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'Invalid token',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'Token expired',
      });
    }
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: 'Authentication error',
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: 'Insufficient permissions',
      });
    }
    next();
  };
};

const authorizeGroupMember = async (req, res, next) => {
  try {
    const groupId = req.params.id || req.params.group_id;
    const userId = req.user.user_id;

    const [members] = await db.query(
      'SELECT role FROM GroupMembers WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (members.length === 0) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: 'You are not a member of this group',
      });
    }

    req.groupRole = members[0].role;
    next();
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: 'Authorization error',
    });
  }
};

const authorizeGroupAdmin = async (req, res, next) => {
  try {
    const groupId = req.params.id || req.params.group_id;
    const userId = req.user.user_id;

    const [members] = await db.query(
      'SELECT role FROM GroupMembers WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (members.length === 0 || members[0].role !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: 'Admin access required',
      });
    }

    next();
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      error: 'Authorization error',
    });
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeGroupMember,
  authorizeGroupAdmin,
};