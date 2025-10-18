const transporter = require('../config/email');
const { logger } = require('../utils/logger');

const sendEmail = async ({ to, subject, text, html, attachments = [] }) => {
  try {
    const mailOptions = {
      from: `"DropDeck" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Email sending failed:', error);
    throw error;
  }
};

const sendWelcomeEmail = async (email, name) => {
  const subject = 'Welcome to DropDeck!';
  const html = `
    <h1>Welcome to DropDeck, ${name}!</h1>
    <p>Your account has been created successfully.</p>
    <p>DropDeck is a privacy-first ephemeral messaging platform for temporary group communications.</p>
    <p>Get started by creating or joining a group!</p>
  `;
  
  return sendEmail({ to: email, subject, html });
};

const sendGroupInviteEmail = async (email, groupName, inviteCode) => {
  const subject = `You've been invited to join ${groupName} on DropDeck`;
  const html = `
    <h1>Group Invitation</h1>
    <p>You've been invited to join the group: <strong>${groupName}</strong></p>
    <p>Use this code to join: <strong>${inviteCode}</strong></p>
    <p>Join now on DropDeck!</p>
  `;
  
  return sendEmail({ to: email, subject, html });
};

const sendExportEmail = async (email, groupName, exportPath) => {
  const subject = `Your ${groupName} group export is ready`;
  const html = `
    <h1>Group Export Ready</h1>
    <p>Your chat history and files from <strong>${groupName}</strong> have been exported.</p>
    <p>The export is attached to this email.</p>
    <p>Note: This data has been permanently deleted from our servers.</p>
  `;
  
  const attachments = [{
    filename: `${groupName}_export.zip`,
    path: exportPath,
  }];
  
  return sendEmail({ to: email, subject, html, attachments });
};

const sendVerificationEmail = async (email, name, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;
  
  const subject = 'Verify Your DropDeck Account';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4A90E2;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          background-color: #f9f9f9;
          padding: 30px;
          border: 1px solid #ddd;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #4A90E2;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to DropDeck!</h1>
        </div>
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>Thank you for registering with DropDeck - your privacy-first ephemeral messaging platform.</p>
          <p>To complete your registration and start using DropDeck, please verify your email address by clicking the button below:</p>
          <center>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </center>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #4A90E2;">${verificationUrl}</p>
          <p><strong>Note:</strong> This verification link will expire in 24 hours.</p>
          <p>If you didn't create an account with DropDeck, please ignore this email.</p>
          <p>Best regards,<br>The DropDeck Team</p>
        </div>
        <div class="footer">
          <p>© 2025 DropDeck. All rights reserved.</p>
          <p>Privacy-first, ephemeral messaging for temporary groups.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hi ${name},

    Welcome to DropDeck!

    Please verify your email address by clicking the link below:
    ${verificationUrl}

    This link will expire in 24 hours.

    If you didn't create an account, please ignore this email.

    Best regards,
    The DropDeck Team
  `;
  
  return sendEmail({ to: email, subject, html, text });
};


module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendGroupInviteEmail,
  sendExportEmail,
  sendVerificationEmail, 
};
