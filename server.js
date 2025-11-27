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
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://dropdeck-chat.vercel.app'
    ],
    methods: ['GET', 'POST']
  }
});

global.io = io;

io.on('connection', (socket) => {
  socket.on('joinGroups', (userId) => {
    socket.join(`user:${userId}`);
  });

  socket.on('joinGroupRoom', (groupId) => {
    socket.join(`group:${groupId}`);
  });
});

server.listen(PORT, () => {
  initCronJobs();
  logger.info(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

process.on('unhandledRejection', () => {
  server.close(() => process.exit(1));
});
