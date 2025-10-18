 DropDeck Backend API

A secure, privacy-first ephemeral messaging platform backend built with Express.js and MySQL.

 🚀 Features

- JWT Authentication - Secure token-based authentication
- End-to-End Encryption - AES-256 encryption for messages and files
- Ephemeral Groups - Auto-expiring sessions with secure data deletion
- Real-time Messaging - Text, files, polls, and threaded replies
- Role-Based Access Control - Admin, moderator, and member roles
- Automated Exports - PDF/ZIP exports before data deletion
- Secure File Handling - Encrypted storage with secure deletion
- Notification System - Email and in-app notifications
- Automated Cleanup - Cron jobs for expired group cleanup

 📋 Prerequisites

- Node.js (v16 or higher)
- MySQL (v8 or higher)
- npm or yarn

 🛠️ Installation

 1. Clone the repository


git clone <your-repo-url>
cd dropdeck-backend


 2. Install dependencies


npm install


 3. Configure environment variables

Create a `.env` file in the root directory:

env
 Server
NODE_ENV=development
PORT=5000

 Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=dropdeck
DB_PORT=3306

 JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d

 Encryption (generate a 32-character key)
ENCRYPTION_KEY=your_32_character_encryption_key
ENCRYPTION_ALGORITHM=aes-256-cbc

 Email (SMTP with TLS)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

 File Upload
MAX_FILE_SIZE=104857600
UPLOAD_PATH=./uploads
EXPORT_PATH=./exports

 CORS
CORS_ORIGIN=http://localhost:3000

 Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100


 4. Initialize the database

Run the SQL initialization script:


mysql -u root -p < database/init.sql


Or manually:


mysql -u root -p
source database/init.sql


 5. Create required directories


mkdir -p uploads exports logs


 6. Start the server

Development:

npm run dev


Production:

npm start


The server will start on `http://localhost:5000`

 📁 Project Structure


dropdeck-backend/
├── src/
│   ├── config/           Configuration files
│   ├── controllers/      Route controllers
│   ├── middleware/       Custom middleware
│   ├── models/           Database models (if using ORM)
│   ├── routes/           API routes
│   ├── services/         Business logic services
│   ├── utils/            Utility functions
│   ├── jobs/             Cron jobs
│   └── app.js            Express app configuration
├── database/             Database scripts
├── uploads/              Temporary file storage
├── exports/              Group exports
├── logs/                 Application logs
├── .env                  Environment variables
├── server.js             Entry point
└── package.json          Dependencies


 🔐 API Documentation

 Authentication Endpoints

 Register
http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass@123"
}


 Login
http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass@123"
}


 Get Profile
http
GET /api/auth/profile
Authorization: Bearer <token>


 Group Endpoints

 Create Group
http
POST /api/groups/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "group_name": "Study Group",
  "description": "CS Final Exam Prep",
  "expiry_time": "2025-12-31T23:59:59Z",
  "access_type": "public"
}


 Get User Groups
http
GET /api/groups
Authorization: Bearer <token>


 Get Group Details
http
GET /api/groups/:id
Authorization: Bearer <token>


 Invite to Group
http
POST /api/groups/:id/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "friend@example.com"
}


 Message Endpoints

 Send Message
http
POST /api/messages/groups/:id/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hello everyone!",
  "message_type": "text"
}


 Get Messages
http
GET /api/messages/groups/:id/messages?limit=50&offset=0
Authorization: Bearer <token>


 Reply to Message
http
POST /api/messages/:id/reply
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Great idea!"
}


 React to Message
http
POST /api/messages/:id/react
Authorization: Bearer <token>
Content-Type: application/json

{
  "reaction_type": "👍"
}


 File Endpoints

 Upload File
http
POST /api/files/groups/:id/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>


 Download File
http
GET /api/files/:file_id/download
Authorization: Bearer <token>


 Poll Endpoints

 Create Poll
http
POST /api/polls/groups/:id/polls
Authorization: Bearer <token>
Content-Type: application/json

{
  "question": "What time works best?",
  "options": ["10 AM", "2 PM", "6 PM"]
}


 Vote on Poll
http
POST /api/polls/:poll_id/vote
Authorization: Bearer <token>
Content-Type: application/json

{
  "option_id": 1
}


 Get Poll Results
http
GET /api/polls/:poll_id/results
Authorization: Bearer <token>


 Notification Endpoints

 Get Notifications
http
GET /api/notifications?unread_only=true
Authorization: Bearer <token>


 Mark as Read
http
POST /api/notifications/mark-read
Authorization: Bearer <token>
Content-Type: application/json

{
  "notification_ids": [1, 2, 3]
}


 🔒 Security Features

1. Password Hashing - bcrypt with salt rounds
2. JWT Tokens - Secure session management
3. AES-256 Encryption - For messages and file paths
4. HTTPS/TLS - Encrypted data in transit
5. Rate Limiting - Protection against brute force
6. Input Validation - Using express-validator
7. SQL Injection Protection - Parameterized queries
8. Secure File Deletion - Multi-pass overwrite algorithm

 🧹 Automated Cleanup

The system automatically:
- Monitors group expiry times
- Generates secure exports (ZIP with chat history)
- Emails exports to all group members
- Securely deletes all data (messages, files, metadata)
- Runs hourly and daily cron jobs

 📊 Admin Features

Admins can:
- View system statistics
- Access audit logs
- Moderate content
- Manually trigger exports
- Manage users and groups

 🐛 Error Handling

All errors return consistent JSON format:

json
{
  "error": "Error message",
  "details": [] // Optional validation errors
}


 📝 Logging

Logs are stored in the `logs/` directory:
- `error.log` - Error level logs
- `combined.log` - All logs

 🧪 Testing


npm test


 📦 Deployment

 Production Checklist

1. Set `NODE_ENV=production`
2. Use strong JWT_SECRET (minimum 32 characters)
3. Generate unique ENCRYPTION_KEY (32 bytes)
4. Configure proper SMTP credentials
5. Set up SSL/TLS certificates
6. Configure firewall rules
7. Set up database backups
8. Monitor logs regularly
9. Update CORS_ORIGIN to your frontend URL

 PM2 Deployment


npm install -g pm2
pm2 start server.js --name dropdeck-api
pm2 save
pm2 startup


 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

 📄 License

This project is licensed under the MIT License.

 👥 Support

For issues and questions:
- Create an issue on GitHub
- Email: support@dropdeck.com

 🔄 Version History

- v1.0.0 - Initial release
  - Authentication system
  - Group management
  - Messaging and file sharing
  - Polls and reactions
  - Automated cleanup
  - Export functionality

---

Built with ❤️ by the DropDeck Team




// ===========================
// USAGE EXAMPLES
// ===========================

/*

// ===========================
// USER MODEL EXAMPLES
// ===========================

// Create a user
const userId = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  password_hash: hashedPassword,
  role: 'member'
});

// Find user by email
const user = await User.findByEmail('john@example.com');

// Find user by ID
const user = await User.findById(1);

// Update user
await User.update(userId, { name: 'John Updated' });

// Update last login
await User.updateLastLogin(userId);

// Get user statistics
const stats = await User.getUserStats(userId);
// Returns: { groups_count, messages_count, files_count }

// Check if email exists
const exists = await User.emailExists('john@example.com');

// Delete user
await User.delete(userId);

// ===========================
// GROUP MODEL EXAMPLES
// ===========================

// Create a group
const groupId = await Group.create({
  group_name: 'Study Group',
  description: 'Final exam prep',
  created_by: userId,
  expiry_time: '2025-12-31T23:59:59Z',
  access_type: 'public'
});

// Find group by ID
const group = await Group.findById(groupId);

// Get all groups for a user
const groups = await Group.findByUserId(userId);

// Update group
await Group.update(groupId, { 
  description: 'Updated description' 
});

// Extend group expiry
await Group.extendExpiry(groupId, '2026-01-31T23:59:59Z');

// Get expired groups
const expiredGroups = await Group.getExpiredGroups();

// Get group statistics
const stats = await Group.getGroupStats(groupId);
// Returns: { member_count, message_count, file_count, poll_count }

// Delete group
await Group.delete(groupId);

// ===========================
// GROUP MEMBER MODEL EXAMPLES
// ===========================

// Add member to group
await GroupMember.add(groupId, userId, 'member');

// Check if user is member
const isMember = await GroupMember.isMember(groupId, userId);

// Get member role
const role = await GroupMember.getRole(groupId, userId);

// Update member role
await GroupMember.updateRole(groupId, userId, 'admin');

// Remove member
await GroupMember.remove(groupId, userId);

// Get all members
const members = await GroupMember.getMembers(groupId);

// Get admins only
const admins = await GroupMember.getAdmins(groupId);

// Check if user is admin
const isAdmin = await GroupMember.isAdmin(groupId, userId);

// Get member count
const count = await GroupMember.getMemberCount(groupId);

// ===========================
// MESSAGE MODEL EXAMPLES
// ===========================

// Create a message
const messageId = await Message.create({
  group_id: groupId,
  user_id: userId,
  content: encryptedContent,
  message_type: 'text',
  reply_to: null
});

// Find message by ID
const message = await Message.findById(messageId);

// Get messages for a group
const messages = await Message.getByGroupId(groupId, 50, 0);

// Get replies to a message
const replies = await Message.getReplies(messageId);

// Update message
await Message.update(messageId, updatedContent);

// Delete message
await Message.delete(messageId);

// Get message count
const count = await Message.getMessageCount(groupId);

// Search messages
const results = await Message.search(groupId, 'search term', 50);

// ===========================
// FILE MODEL EXAMPLES
// ===========================

// Create file record
const fileId = await File.create({
  message_id: messageId,
  file_name: 'document.pdf',
  file_path: encryptedPath,
  file_size: 1024000,
  file_type: 'application/pdf'
});

// Find file by ID
const file = await File.findById(fileId);

// Get files for a group
const files = await File.getByGroupId(groupId);

// Get files by message ID
const messageFiles = await File.getByMessageId(messageId);

// Delete file
await File.delete(fileId);

// Get total file size for group
const totalSize = await File.getTotalSize(groupId);

// ===========================
// POLL MODEL EXAMPLES
// ===========================

// Create a poll
const pollId = await Poll.create({
  group_id: groupId,
  question: 'What time works best?',
  created_by: userId
});

// Add poll options
await PollOption.create(pollId, '10 AM');
await PollOption.create(pollId, '2 PM');
await PollOption.create(pollId, '6 PM');

// Find poll by ID
const poll = await Poll.findById(pollId);

// Get polls for a group
const polls = await Poll.getByGroupId(groupId);

// Get poll with options and vote counts
const pollWithOptions = await Poll.getWithOptions(pollId);

// Vote on a poll
await PollVote.vote(pollId, optionId, userId);

// Get user's vote
const userVote = await PollVote.getUserVote(pollId, userId);

// Get all votes for a poll
const votes = await PollVote.getByPollId(pollId);

// Remove vote
await PollVote.remove(pollId, userId);

// Get vote count for an option
const voteCount = await PollVote.getOptionVoteCount(optionId);

// Delete poll
await Poll.delete(pollId);

// ===========================
// REACTION MODEL EXAMPLES
// ===========================

// Add or update reaction
await Reaction.addOrUpdate(messageId, userId, '👍');

// Remove reaction
await Reaction.remove(messageId, userId);

// Get reactions for a message
const reactions = await Reaction.getByMessageId(messageId);

// Get reaction summary (grouped by type)
const summary = await Reaction.getSummary(messageId);
// Returns: [{ reaction_type: '👍', count: 5 }, ...]

// Check if user reacted
const hasReacted = await Reaction.hasUserReacted(messageId, userId);

// Get user's reaction
const userReaction = await Reaction.getUserReaction(messageId, userId);

// ===========================
// NOTIFICATION MODEL EXAMPLES
// ===========================

// Create notification
const notificationId = await Notification.create({
  user_id: userId,
  group_id: groupId,
  message: 'You have been mentioned in a message',
  type: 'in_app'
});

// Get user notifications
const notifications = await Notification.getByUserId(userId, 50, 0);

// Get unread notifications only
const unreadNotifs = await Notification.getByUserId(userId, 50, 0, true);

// Mark notifications as read
await Notification.markAsRead([1, 2, 3], userId);

// Mark all as read
await Notification.markAllAsRead(userId);

// Delete notification
await Notification.delete(notificationId, userId);

// Get unread count
const unreadCount = await Notification.getUnreadCount(userId);

// Get notifications by group
const groupNotifs = await Notification.getByGroupId(groupId, userId);

// Delete old notifications (cleanup - run in cron)
await Notification.deleteOld(30); // Delete notifications older than 30 days

// ===========================
// EXPORT MODEL EXAMPLES
// ===========================

// Create export record
const exportId = await Export.create({
  group_id: groupId,
  file_path: '/exports/group_export.zip',
  hash_value: 'sha256_hash_here'
});

// Find export by ID
const exportRecord = await Export.findById(exportId);

// Get exports for a group
const exports = await Export.getByGroupId(groupId);

// Verify export hash
const isValid = await Export.verifyHash(exportId, providedHash);

// Get all exports (admin)
const allExports = await Export.getAll(100, 0);

// Delete export
await Export.delete(exportId);

// Delete old exports (cleanup - run in cron)
await Export.deleteOld(30); // Delete exports older than 30 days

// ===========================
// EXAMPLE: Complete User Registration Flow
// ===========================

async function registerUser(name, email, password) {
  // Check if email exists
  const exists = await User.emailExists(email);
  if (exists) {
    throw new Error('Email already registered');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  // Create user
  const userId = await User.create({
    name,
    email,
    password_hash,
    role: 'member'
  });

  // Get user data
  const user = await User.findById(userId);

  return user;
}

// ===========================
// EXAMPLE: Complete Group Creation Flow
// ===========================

async function createGroupWithMember(groupData, creatorId) {
  // Create group
  const groupId = await Group.create({
    group_name: groupData.group_name,
    description: groupData.description,
    created_by: creatorId,
    expiry_time: groupData.expiry_time,
    access_type: groupData.access_type || 'public'
  });

  // Add creator as admin
  await GroupMember.add(groupId, creatorId, 'admin');

  // Get group with details
  const group = await Group.findById(groupId);

  return group;
}

// ===========================
// EXAMPLE: Send Message with File
// ===========================

async function sendMessageWithFile(groupId, userId, content, fileData) {
  // Create message
  const messageId = await Message.create({
    group_id: groupId,
    user_id: userId,
    content: encryptedContent,
    message_type: 'file',
    reply_to: null
  });

  // Create file record
  const fileId = await File.create({
    message_id: messageId,
    file_name: fileData.originalname,
    file_path: encryptedPath,
    file_size: fileData.size,
    file_type: fileData.mimetype
  });

  // Notify group members
  const members = await GroupMember.getMembers(groupId);
  for (const member of members) {
    if (member.user_id !== userId) {
      await Notification.create({
        user_id: member.user_id,
        group_id: groupId,
        message: `New file shared in group`,
        type: 'in_app'
      });
    }
  }

  return { messageId, fileId };
}

// ===========================
// EXAMPLE: Create Poll with Options
// ===========================

async function createPollWithOptions(groupId, userId, question, options) {
  // Create poll
  const pollId = await Poll.create({
    group_id: groupId,
    question: question,
    created_by: userId
  });

  // Add options
  for (const option of options) {
    await PollOption.create(pollId, option);
  }

  // Get poll with options
  const poll = await Poll.getWithOptions(pollId);

  // Notify group members
  const members = await GroupMember.getMembers(groupId);
  for (const member of members) {
    if (member.user_id !== userId) {
      await Notification.create({
        user_id: member.user_id,
        group_id: groupId,
        message: `New poll: ${question}`,
        type: 'in_app'
      });
    }
  }

  return poll;
}

// ===========================
// EXAMPLE: Get Group Dashboard Data
// ===========================

async function getGroupDashboard(groupId, userId) {
  // Get group details
  const group = await Group.findById(groupId);
  
  // Get user's role
  const userRole = await GroupMember.getRole(groupId, userId);
  
  // Get statistics
  const stats = await Group.getGroupStats(groupId);
  
  // Get recent messages
  const messages = await Message.getByGroupId(groupId, 20, 0);
  
  // Get members
  const members = await GroupMember.getMembers(groupId);
  
  // Get active polls
  const polls = await Poll.getByGroupId(groupId);
  
  // Get recent files
  const files = await File.getByGroupId(groupId);

  return {
    group,
    userRole,
    stats,
    messages,
    members,
    polls,
    files: files.slice(0, 10) // Latest 10 files
  };
}

// ===========================
// EXAMPLE: Cleanup Expired Groups
// ===========================

async function cleanupExpiredGroups() {
  const expiredGroups = await Group.getExpiredGroups();
  
  for (const group of expiredGroups) {
    // Generate export
    const exportPath = await generateZIPExport(group.group_id, group.group_name);
    const hashValue = generateHash(exportPath);
    
    // Save export record
    await Export.create({
      group_id: group.group_id,
      file_path: exportPath,
      hash_value: hashValue
    });
    
    // Get all members
    const members = await GroupMember.getMembers(group.group_id);
    
    // Send export to all members
    for (const member of members) {
      await sendExportEmail(member.email, group.group_name, exportPath);
    }
    
    // Delete group (cascade will handle related data)
    await Group.delete(group.group_id);
    
    console.log(`Cleaned up group: ${group.group_name}`);
  }
  
  return expiredGroups.length;
}

*/