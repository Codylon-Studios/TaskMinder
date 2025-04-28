import * as http from "http";
import * as socketIo from "socket.io";

import logger from "../utils/logger";

let io: socketIo.Server;

// Initialize the Socket.IO instance
export const initialize = (server: http.Server): socketIo.Server => {
  io = new socketIo.Server(server);
  
  io.on("connection", (socket) => {
    const d = new Date()
    let dateStr = `[${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${(d.getDate()).toString().padStart(2, "0")} ` +
        `${(d.getHours()).toString().padStart(2, "0")}:${(d.getMinutes()).toString().padStart(2, "0")}]`
    logger.write({color: "cyan", text: "[TaskMinder]"}, {color: "gray", text: dateStr}, "User connected:   ", {bold: true, text: socket.id})
    
    socket.on("disconnect", () => {
      const d = new Date()
      let dateStr = `[${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${(d.getDate()).toString().padStart(2, "0")} ` +
          `${(d.getHours()).toString().padStart(2, "0")}:${(d.getMinutes()).toString().padStart(2, "0")}]`
      logger.write({color: "cyan", text: "[TaskMinder]"}, {color: "gray", text: dateStr}, "User disconnected:", {bold: true, text: socket.id})
    });
  });
  
  return io;
};

// Get the Socket.IO instance (after initialization)
export const getIO = (): socketIo.Server => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

export default {
  initialize,
  getIO
};
