require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./socket/socketManager');
const { connectDB } = require('./lib/database');

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);
initSocket(server);

async function start() {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`\n🚀 CollabNotes server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  server.close(() => process.exit(1));
});