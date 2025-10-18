module.exports = {
  // User roles
  ROLES: {
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    MEMBER: 'member',
  },

  // Group access types
  ACCESS_TYPES: {
    PUBLIC: 'public',
    PRIVATE: 'private',
    APPROVAL: 'approval',
  },

  // Message types
  MESSAGE_TYPES: {
    TEXT: 'text',
    FILE: 'file',
    POLL: 'poll',
    REPLY: 'reply',
    CODE: 'code',
  },

  // Notification types
  NOTIFICATION_TYPES: {
    EMAIL: 'email',
    IN_APP: 'in_app',
  },

  // File constraints
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 104857600, // 100MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'text/plain',
    'audio/mpeg',
    'audio/wav',
    'video/mp4',
  ],

  // Export formats
  EXPORT_FORMATS: {
    PDF: 'pdf',
    ZIP: 'zip',
    TXT: 'txt',
  },

  // Pagination
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,

  // JWT
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  JWT_SECRET: process.env.JWT_SECRET,

  // Timezone
  TIMEZONE: 'Asia/Kolkata',
  TIMEZONE_NAME: 'IST',

  // Status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_ERROR: 500,
  },
};