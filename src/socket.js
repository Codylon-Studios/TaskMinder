const logger = require("../logger")

let io;

// Initialize the Socket.IO instance
const initialize = (server) => {
  io = require('socket.io')(server);
  
  io.on('connection', (socket) => {
    const d = new Date()
    let dateStr = `[${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${(d.getDate()).toString().padStart(2, "0")} ` +
        `${(d.getHours()).toString().padStart(2, "0")}:${(d.getMinutes()).toString().padStart(2, "0")}]`
    logger.write({color: "cyan", text: "[TaskMinder]"}, {color: "gray", text: dateStr}, "User connected:   ", {bold: true, text: socket.id})
    
    socket.on('disconnect', () => {
      const d = new Date()
      let dateStr = `[${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${(d.getDate()).toString().padStart(2, "0")} ` +
          `${(d.getHours()).toString().padStart(2, "0")}:${(d.getMinutes()).toString().padStart(2, "0")}]`
      logger.write({color: "cyan", text: "[TaskMinder]"}, {color: "gray", text: dateStr}, "User disconnected:", {bold: true, text: socket.id})
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
