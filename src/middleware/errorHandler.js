const { logger } = require('../utils/logger');
const { HTTP_STATUS } = require('../config/constants');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, HTTP_STATUS.NOT_FOUND);
  }

  // Mongoose duplicate key
  if (err.code === 'ER_DUP_ENTRY') {
    const message = 'Duplicate field value entered';
    error = new AppError(message, HTTP_STATUS.CONFLICT);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new AppError(message, HTTP_STATUS.BAD_REQUEST);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, HTTP_STATUS.UNAUTHORIZED);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, HTTP_STATUS.UNAUTHORIZED);
  }

  res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { errorHandler, AppError };