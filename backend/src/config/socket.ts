import * as http from "http";
import * as socketIo from "socket.io";

import logger from "../config/logger";
import prisma from "./prisma";

let io: socketIo.Server;

export const SOCKET_EVENTS = {
  EVENTS: "updateEvents",
  HOMEWORK: "updateHomework",
  UPLOADS: "updateUploads",
  UPLOAD_REQUESTS: "updateUploadRequests",
  MEMBERS: "updateMembers",
  SUBJECTS: "updateSubjects",
  TEAMS: "updateTeams",
  JOINED_TEAMS: "updateJoinedTeams",
  EVENT_TYPES: "updateEventTypes",
  TIMETABLES: "updateTimetables",
  CLASS_CODES: "updateClassCodes",
  CLASS_NAMES: "updateClassNames",
  UPGRADE_TEST_CLASS: "updateUpgradeTestClass",
  DEFAULT_PERMISSION: "updateDefaultPermission"
};

// Initialize the Socket.IO instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const initialize = (server: http.Server, sessionMiddleware: any): socketIo.Server => {
  io = new socketIo.Server(server);

  // Wrap session middleware for Socket.IO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrap = (middleware: any) => (socket: any, next: any) =>
    middleware(socket.request, {}, next);

  // Apply session middleware to Socket.IO
  io.use(wrap(sessionMiddleware));

  io.on("connection", async socket => {
    logger.info(`user connected: ${socket.id}`, { isSocket: true });

    // Access session and join class room if classId exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = (socket.request as any).session;
    if (session.classId) {
      const classExists = await prisma.class.findUnique({
        where: { classId: parseInt(session.classId, 10) },
        select: { classId: true }
      });

      if (classExists) {
        socket.join(`class:${session.classId}`);
        logger.info(`user ${socket.id} joined class room: ${session.classId}`, { isSocket: true });
      } 
      else {
        delete session.classId;
        logger.warn("User had invalid classId in session, cleared");
      }
    }

    socket.on("disconnect", () => {
      logger.info(`user disconnected: ${socket.id}`, { isSocket: true });
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
