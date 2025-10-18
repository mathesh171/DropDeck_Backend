const { body, param, query } = require('express-validator');

const authValidators = {
  register: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
  ],
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
};

const groupValidators = {
  create: [
    body('group_name').trim().notEmpty().withMessage('Group name is required'),
    body('description').optional().trim(),
    body('expiry_time').isISO8601().withMessage('Valid expiry time required'),
    body('access_type')
      .optional()
      .isIn(['public', 'private', 'approval'])
      .withMessage('Invalid access type'),
  ],
  update: [
    param('id').isInt().withMessage('Valid group ID required'),
  ],
};

const messageValidators = {
  send: [
    body('content').trim().notEmpty().withMessage('Message content required'),
    body('message_type')
      .optional()
      .isIn(['text', 'file', 'poll', 'reply', 'code'])
      .withMessage('Invalid message type'),
    body('reply_to').optional().isInt().withMessage('Valid message ID required'),
  ],
};

const pollValidators = {
  create: [
    body('question').trim().notEmpty().withMessage('Poll question required'),
    body('options')
      .isArray({ min: 2 })
      .withMessage('At least 2 options required'),
    body('options.*').trim().notEmpty().withMessage('Option cannot be empty'),
  ],
};

module.exports = {
  authValidators,
  groupValidators,
  messageValidators,
  pollValidators,
};