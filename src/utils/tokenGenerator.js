const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { JWT_SECRET, JWT_EXPIRE } = require('../config/constants');

const generateAuthToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
  });
};

const generateGroupCode = () => {
  return uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
};

const generateHash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// IST timestamp utilities
const getISTTime = () => {
  return new Date().toLocaleString('en-US', { 
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

const getISTDate = () => {
  const date = new Date();
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
};

const formatISTTimestamp = (date) => {
  return new Date(date).toLocaleString('en-US', { 
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

module.exports = {
  generateAuthToken,
  generateGroupCode,
  generateHash,
  generateRandomToken,
  getISTTime,
  getISTDate,
  formatISTTimestamp,
};
