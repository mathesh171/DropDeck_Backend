const PDFDocument = require('pdfkit');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const { generateHash } = require('../utils/tokenGenerator');
const { logger } = require('../utils/logger');
const db = require('../config/database');

const generatePDFExport = async (groupId, groupName, messages) => {
  return new Promise((resolve, reject) => {
    const exportDir = process.env.EXPORT_PATH || './exports';
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filename = `${groupName}_${Date.now()}.pdf`;
    const filepath = path.join(exportDir, filename);
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);

    // Header
    doc.fontSize(20).text(`DropDeck Chat Export: ${groupName}`, {
      align: 'center',
    });
    doc.moveDown();
    doc.fontSize(12).text(`Export Date: ${new Date().toLocaleString()}`, {
      align: 'center',
    });
    doc.moveDown(2);

    // Messages
    messages.forEach((msg, index) => {
      doc.fontSize(10).text(`[${new Date(msg.created_at).toLocaleString()}] ${msg.name}:`, {
        continued: false,
      });
      doc.fontSize(9).text(msg.content || '[File/Media]', {
        indent: 20,
      });
      doc.moveDown(0.5);

      if (index < messages.length - 1) {
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
      }
    });

    doc.end();

    stream.on('finish', () => {
      logger.info(`PDF export created: ${filepath}`);
      resolve(filepath);
    });

    stream.on('error', (error) => {
      logger.error('PDF export failed:', error);
      reject(error);
    });
  });
};

const generateZIPExport = async (groupId, groupName) => {
  return new Promise(async (resolve, reject) => {
    try {
      const exportDir = process.env.EXPORT_PATH || './exports';
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const filename = `${groupName}_${Date.now()}.zip`;
      const filepath = path.join(exportDir, filename);
      const output = fs.createWriteStream(filepath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        logger.info(`ZIP export created: ${filepath} (${archive.pointer()} bytes)`);
        resolve(filepath);
      });

      archive.on('error', (err) => {
        logger.error('ZIP export failed:', err);
        reject(err);
      });

      archive.pipe(output);

      // Get messages
      const [messages] = await db.query(
        `SELECT m.*, u.name FROM Messages m 
         JOIN Users u ON m.user_id = u.user_id 
         WHERE m.group_id = ? ORDER BY m.created_at ASC`,
        [groupId]
      );

      // Add chat log as text file
      let chatLog = `DropDeck Chat Export: ${groupName}\n`;
      chatLog += `Export Date: ${new Date().toLocaleString()}\n`;
      chatLog += `${'='.repeat(60)}\n\n`;
      
      messages.forEach((msg) => {
        chatLog += `[${new Date(msg.created_at).toLocaleString()}] ${msg.name}:\n`;
        chatLog += `${msg.content || '[File/Media]'}\n\n`;
      });

      archive.append(chatLog, { name: 'chat_history.txt' });

      // Get files
      const [files] = await db.query(
        `SELECT f.* FROM Files f 
         JOIN Messages m ON f.message_id = m.message_id 
         WHERE m.group_id = ?`,
        [groupId]
      );

      // Add files to archive
      const { decrypt } = require('./encryptionService');
      for (const file of files) {
        const decryptedPath = decrypt(file.file_path);
        if (fs.existsSync(decryptedPath)) {
          archive.file(decryptedPath, { name: `files/${file.file_name}` });
        }
      }

      archive.finalize();
    } catch (error) {
      reject(error);
    }
  });
};

const generateExportHash = (filepath) => {
  const fileBuffer = fs.readFileSync(filepath);
  return generateHash(fileBuffer);
};

module.exports = {
  generatePDFExport,
  generateZIPExport,
  generateExportHash,
};
