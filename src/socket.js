let io;

// Initialize the Socket.IO instance
const initialize = (server) => {
  io = require('socket.io')(server);
  
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
  
  return io;
};

// Get the Socket.IO instance (after initialization)
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

module.exports = {
  initialize,
  getIO
};