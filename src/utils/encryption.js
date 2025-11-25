const crypto = require('crypto');
const encryptionConfig = require('../config/encryption');

const encrypt = (text) => {
  try {
    const iv = crypto.randomBytes(encryptionConfig.ivLength);
    const cipher = crypto.createCipheriv(
      encryptionConfig.algorithm,
      encryptionConfig.key,
      iv
    );
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // returns: iv:encryptedHex
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    throw new Error('Encryption failed');
  }
};

const decrypt = (encryptedText) => {
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = parts.join(':');

    const decipher = crypto.createDecipheriv(
      encryptionConfig.algorithm,
      encryptionConfig.key,
      iv
    );
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed');
  }
};

module.exports = { encrypt, decrypt };
