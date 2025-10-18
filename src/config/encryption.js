const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  throw new Error('ENCRYPTION_KEY must be set in environment variables and be at least 32 characters');
}

const ALGORITHM = process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc';
const IV_LENGTH = 16;

const encryptionConfig = {
  key: Buffer.from(ENCRYPTION_KEY, 'utf8').slice(0, 32),
  algorithm: ALGORITHM,
  ivLength: IV_LENGTH,
};

module.exports = encryptionConfig;