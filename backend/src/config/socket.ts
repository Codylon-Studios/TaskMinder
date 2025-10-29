import * as http from "http";
import * as socketIo from "socket.io";

import logger from "../utils/logger";
import prisma from "./prisma";

let io: socketIo.Server;

export const SOCKET_EVENTS = {
  EVENTS: "updateEvents",
  HOMEWORK: "updateHomework",
  UPLOADS: "updateUploads",
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
    const d = new Date();
    const dateStr =
      `[${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")} ` +
      `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}]`;
    logger.write({ color: "cyan", text: "[TaskMinder]" }, { color: "gray", text: dateStr }, "User connected:   ", {bold: true, text: socket.id});

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
        logger.write(
          { color: "cyan", text: "[TaskMinder]" },
          "User joined class room:",
          {
            bold: true,
            text: session.classId
          }
        );
      } 
      else {
        delete session.classId;
        logger.warn("User had invalid classId in session, cleared");
      }
    }

    socket.on("disconnect", () => {
      const d = new Date();
      const dateStr =
        `[${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")} ` +
        `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}]`;
      logger.write({ color: "cyan", text: "[TaskMinder]" }, { color: "gray", text: dateStr }, "User disconnected:", {
        bold: true,
        text: socket.id
      });
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
