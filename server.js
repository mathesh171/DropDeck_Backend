require('dotenv').config();
const app = require('./src/app');
const { logger } = require('./src/utils/logger');
const { initCronJobs } = require('./src/jobs/cronJobs');

const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'], 
    methods: ['GET', 'POST'],
  },
});

// Store io instance globally or pass it through middleware/controllers
global.io = io;

io.on('connection', (socket) => {
  logger.info('User connected via WebSocket: ' + socket.id);

  socket.on('joinGroups', (userId) => {
    socket.join(`user:${userId}`);
    logger.info(`User ${userId} joined their personal room.`);
  });

  socket.on('disconnect', () => {
    logger.info('User disconnected: ' + socket.id);
  });
});

server.listen(PORT, () => {
  logger.info(`🚀 DropDeck Server running on port ${PORT}`);
  logger.info(`📡 Environment: ${process.env.NODE_ENV}`);

  // Initialize cron jobs for cleanup
  initCronJobs();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});