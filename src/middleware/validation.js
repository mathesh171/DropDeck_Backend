const { validationResult } = require('express-validator');
const { HTTP_STATUS } = require('../config/constants');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

module.exports = { validate };