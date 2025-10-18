const fs = require('fs');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

const secureDelete = async (filepath) => {
  try {
    if (!fs.existsSync(filepath)) {
      return;
    }

    const stats = fs.statSync(filepath);
    const fileSize = stats.size;

    // Overwrite with random data (3 passes)
    const fd = fs.openSync(filepath, 'r+');
    
    for (let pass = 0; pass < 3; pass++) {
      const randomData = crypto.randomBytes(fileSize);
      fs.writeSync(fd, randomData, 0, fileSize, 0);
      fs.fsyncSync(fd);
    }

    // Final pass with zeros
    const zeros = Buffer.alloc(fileSize, 0);
    fs.writeSync(fd, zeros, 0, fileSize, 0);
    fs.fsyncSync(fd);
    
    fs.closeSync(fd);

    // Delete the file
    fs.unlinkSync(filepath);
    
    logger.info(`Securely deleted: ${filepath}`);
  } catch (error) {
    logger.error(`Secure delete failed for ${filepath}:`, error);
    throw error;
  }
};

const secureDeleteDirectory = async (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      return;
    }

    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        await secureDeleteDirectory(filePath);
      } else {
        await secureDelete(filePath);
      }
    }
    
    fs.rmdirSync(dirPath);
    logger.info(`Securely deleted directory: ${dirPath}`);
  } catch (error) {
    logger.error(`Secure delete directory failed for ${dirPath}:`, error);
    throw error;
  }
};

module.exports = {
  secureDelete,
  secureDeleteDirectory,
};