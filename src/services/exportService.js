const PDFDocument = require('pdfkit');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const { generateHash } = require('../utils/tokenGenerator');
const { logger } = require('../utils/logger');
const db = require('../config/database');

// Use decrypt() from utils/encryption.js
const { decrypt } = require('../utils/encryption');

// ---------------------------------------------------
// PDF EXPORT (Decrypted)
// ---------------------------------------------------
const generatePDFExport = async (groupId, groupName, messages) => {
  return new Promise((resolve, reject) => {
    try {
      const exportDir = process.env.EXPORT_PATH || './exports';
      if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

      const filename = `${groupName}_${Date.now()}.pdf`;
      const filepath = path.join(exportDir, filename);

      const doc = new PDFDocument();
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).text(`DropDeck Chat Export: ${groupName}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Export Date: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // Messages
      messages.forEach((msg) => {
        let decryptedText = msg.content;

        // Decrypt content (encrypted format: iv:encryptedHex)
        if (msg.content && msg.content.includes(':')) {
          try {
            decryptedText = decrypt(msg.content);
          } catch (err) {
            decryptedText = '[UNABLE TO DECRYPT MESSAGE]';
          }
        }

        doc.fontSize(10).text(
          `[${new Date(msg.created_at).toLocaleString()}] ${msg.name}:`
        );

        doc.fontSize(9).text(decryptedText || '[File/Media]', { indent: 20 });
        doc.moveDown(1);
      });

      doc.end();

      stream.on('finish', () => resolve(filepath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
};

// ---------------------------------------------------
// ZIP EXPORT (Decrypted)
// ---------------------------------------------------
const generateZIPExport = async (groupId, groupName) => {
  return new Promise(async (resolve, reject) => {
    try {
      const exportDir = process.env.EXPORT_PATH || './exports';
      if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

      const filename = `${groupName}_${Date.now()}.zip`;
      const filepath = path.join(exportDir, filename);

      const output = fs.createWriteStream(filepath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.pipe(output);
      output.on('close', () => resolve(filepath));
      archive.on('error', reject);

      // Fetch messages
      const [messages] = await db.query(
        `SELECT m.*, u.name 
         FROM Messages m 
         JOIN Users u ON m.user_id = u.user_id 
         WHERE m.group_id = ?
         ORDER BY m.created_at ASC`,
        [groupId]
      );

      // Build chat log
      let chatLog = `DropDeck Chat Export: ${groupName}\n`;
      chatLog += `Export Date: ${new Date().toLocaleString()}\n`;
      chatLog += `${"=".repeat(60)}\n\n`;

      messages.forEach((msg) => {
        let text = msg.content;

        // Decrypt message content
        if (msg.content && msg.content.includes(':')) {
          try {
            text = decrypt(msg.content);
          } catch (err) {
            text = '[UNABLE TO DECRYPT MESSAGE]';
          }
        }

        chatLog += `[${new Date(msg.created_at).toLocaleString()}] ${msg.name}:\n`;
        chatLog += `${text || '[File/Media]'}\n\n`;
      });

      archive.append(chatLog, { name: 'chat_history.txt' });

      // Add files
      const [files] = await db.query(
        `SELECT f.* 
         FROM Files f
         JOIN Messages m ON f.message_id = m.message_id
         WHERE m.group_id = ?`,
        [groupId]
      );

      for (const file of files) {
        if (fs.existsSync(file.file_path)) {
          archive.file(file.file_path, { name: `files/${file.file_name}` });
        }
      }

      archive.finalize();
    } catch (error) {
      reject(error);
    }
  });
};

// ---------------------------------------------------
const generateExportHash = (filepath) => {
  const fileBuffer = fs.readFileSync(filepath);
  return generateHash(fileBuffer);
};

module.exports = {
  generatePDFExport,
  generateZIPExport,
  generateExportHash,
};
