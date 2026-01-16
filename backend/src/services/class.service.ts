import { RequestError } from "../@types/requestError";
import { Session, SessionData } from "express-session";
import { default as prisma } from "../config/prisma";
import { BigIntreplacer, invalidateCache } from "../utils/validate.functions";
import { sessionPool } from "../config/pg";
import logger from "../config/logger";
import { redisClient } from "../config/redis";
import fs from "fs/promises";
import path from "path";
import { randomInt } from "crypto";
import { FINAL_UPLOADS_DIR } from "../config/upload";
import {
  changeClassNameTypeBody,
  changeDefaultPermissionTypeBody,
  createClassTypeBody,
  joinClassTypeBody,
  kickClassMembersTypeBody,
  setClassMembersPermissionsTypeBody,
  updateDSBMobileDataTypeBody
} from "../schemas/class.schema";
import socketIO, { SOCKET_EVENTS } from "../config/socket";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function generateRandomBase62String(length = 20): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += BASE62[randomInt(0, BASE62.length)];
  }
  return result;
}

const classService = {
  async getClassInfo(session: Session & Partial<SessionData>) {
    // checkAcces.checkClass middleware
    const classInfo = await prisma.class.findUnique({
      where: {
        classId: parseInt(session.classId!)
      }
    });
    if (!classInfo) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Can not find class",
        expected: true
      };
      throw err;
    }
    return JSON.parse(JSON.stringify(classInfo, BigIntreplacer));
  },

  async createClass(
    reqData: createClassTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { classDisplayName, isTestClass } = reqData;
    const classCode = generateRandomBase62String();

    if (session.classId) {
      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "User logged in into class",
        expected: true
      };
      throw err;
    }

    const baseData = {
      className: classDisplayName,
      classCode: classCode,
      createdAt: Date.now(),
      isTestClass: isTestClass,
      dsbMobileActivated: false,
      storageQuotaBytes: isTestClass ? 20 * 1024 * 1024 : 1 * 1024 * 1024 * 1024, // 20MB (test class) or 1 GB (normal class)
      storageUsedBytes: 0,
      defaultPermissionLevel: 0 // default setting when creating class is 0 - member status
    };
    try {
      return await prisma.$transaction(async tx => {
        const createdClass = await tx.class.create({
          data: baseData
        });
        session.classId = createdClass.classId.toString();

        // add user to classJoined table
        // change permission of user which created the account to admin
        await tx.joinedClass.create({
          data: {
            accountId: session.account!.accountId,
            classId: createdClass.classId,
            permissionLevel: 3, // class creator is admin
            createdAt: Date.now()
          }
        });
        return createdClass.classCode;
      });
    }
    catch {
      const err: RequestError = {
        name: "Internal Server Error",
        status: 500,
        message: "Could not create class in database, please try again",
        expected: true
      };
      throw err;
    }
  },
  async joinClass(reqData: joinClassTypeBody, session: Session & Partial<SessionData>) {
    const { classCode } = reqData;
    if (session.classId) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Already in a class",
        expected: true
      };
      throw err;
    }
    const targetClass = await prisma.class.findUnique({
      where: {
        classCode: classCode
      }
    });
    if (!targetClass) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Invalid class code",
        expected: true
      };
      throw err;
    }

    const accountId = session.account?.accountId;

    if (accountId !== undefined) {
      await prisma.$transaction(async tx => {
        const existingJoin = await tx.joinedClass.findUnique({
          where: { accountId }
        });

        if (existingJoin) {
          // DB says user is in a class, but it's not the one they're trying to join
          if (existingJoin.classId !== targetClass.classId) {
            const err: RequestError = {
              name: "Conflict",
              status: 409,
              message:
                "Account is already linked to a different class in the database.",
              expected: true
            };
            throw err;
          }

          // DB and target class match, but session was out of sync
          await tx.joinedClass.update({
            where: { accountId },
            data: {
              permissionLevel: targetClass.defaultPermissionLevel
            }
          });
        }
        else {
          await tx.joinedClass.create({
            data: {
              accountId: accountId,
              classId: targetClass.classId,
              permissionLevel: targetClass.defaultPermissionLevel,
              createdAt: Date.now()
            }
          });
        }
      });
    }
    session.classId = targetClass.classId.toString();
    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.MEMBERS);
    return targetClass.className;

  },
  async leaveClass(session: Session & Partial<SessionData>) {
    if (session.account) {
      await prisma.$transaction(async tx => {
        const allMembers = await tx.joinedClass.findMany({
          where: {
            classId: parseInt(session.classId!)
          }
        });

        const currentUserMemberInfo = allMembers.find(
          member => member.accountId === session.account!.accountId
        );

        if (!currentUserMemberInfo) {
          delete session.classId;
          delete session.account;
          const err: RequestError = {
            name: "Unauthorized",
            status: 401,
            message:
              "Session account not found in the class. Logging out of class",
            expected: true
          };
          throw err;
        }

        const leavingUserIsAdmin = currentUserMemberInfo.permissionLevel === 3;

        if (leavingUserIsAdmin) {
          if (allMembers.length === 1) {
            const err: RequestError = {
              name: "Conflict",
              status: 409,
              message:
                "You are the only admin. Please promote another member before leaving or delete the class.",
              expected: true
            };
            throw err;
          }

          const adminsInClass = allMembers.filter(
            member => member.permissionLevel === 3
          );

          if (adminsInClass.length === 1) {
            const err: RequestError = {
              name: "Conflict",
              status: 409,
              message:
                "You are the only admin. Please promote another member before leaving or delete the class.",
              expected: true
            };
            throw err;
          }
        }

        const classUserEntry = await tx.joinedClass.delete({
          where: {
            accountId: session.account!.accountId
          }
        });
        // delete cache of upload metadata
        await invalidateCache("UPLOADMETADATA", classUserEntry.classId.toString());
      });
    }

    delete session.classId;
    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.MEMBERS);
  },
  async deleteClass(session: Session & Partial<SessionData>) {
    await prisma.$transaction(async tx => {
      const classIdToDelete = parseInt(session.classId!);

      // Delete all file metadata and upload records for this class
      const uploads = await tx.upload.findMany({
        where: { classId: classIdToDelete },
        include: { Files: true }
      });
      // Delete physical files from disk
      const classDir = path.join(FINAL_UPLOADS_DIR, classIdToDelete.toString());
      try {
        await fs.rm(classDir, { recursive: true, force: true });
        logger.info(`Deleted class directory: ${classDir}`);
      }
      catch (error) {
        logger.error(`Error deleting class directory ${classDir}: ${error}`);
        // Continue with database cleanup even if file deletion fails
      }
      // Delete file metadata records
      await tx.fileMetadata.deleteMany({
        where: {
          uploadId: {
            in: uploads.map(u => u.uploadId)
          }
        }
      });
      // Delete upload records
      await tx.upload.deleteMany({
        where: { classId: classIdToDelete }
      });
      // Delete upload request records
      await tx.uploadRequest.deleteMany({
        where: { classId: classIdToDelete} 
      });
      // Delete all joinedClass records
      await tx.joinedClass.deleteMany({
        where: {
          classId: classIdToDelete
        }
      });
      // Delete class, rest is deleted with CASCADE in database
      await tx.class.delete({
        where: {
          classId: classIdToDelete
        }
      });
      // invalidate redis caches
      await invalidateCache("UPLOADMETADATA", classIdToDelete.toString());
      await invalidateCache("UPLOADREQUESTS", classIdToDelete.toString());
      await invalidateCache("HOMEWORK", classIdToDelete.toString());
      await invalidateCache("EVENT", classIdToDelete.toString());
      await invalidateCache("LESSON", classIdToDelete.toString());
      await invalidateCache("EVENTTYPESTYLE", classIdToDelete.toString());
      await invalidateCache("SUBJECT", classIdToDelete.toString());
      await invalidateCache("EVENTTYPE", classIdToDelete.toString());
      await invalidateCache("TEAMS", classIdToDelete.toString());
      await redisClient.del(`auth_class:${classIdToDelete}`);
      const room = `class:${session.classId}`;
      // delete session classId
      delete session.classId;
      // Make all sockets in the room leave it
      const io = socketIO.getIO();
      const sockets = await io.in(room).fetchSockets();
      sockets.forEach(socket => socket.leave(room));
    });
  },
  async updateDSBMobileData(
    reqData: updateDSBMobileDataTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const {
      dsbMobileActivated,
      dsbMobileUser,
      dsbMobilePassword,
      dsbMobileClass
    } = reqData;

    await prisma.class.update({
      where: {
        classId: parseInt(session.classId!)
      },
      data: {
        dsbMobileActivated: dsbMobileActivated,
        dsbMobileUser: dsbMobileUser,
        dsbMobilePassword: dsbMobilePassword,
        dsbMobileClass: dsbMobileClass
      }
    });
  },
  async setClassMembersPermissions(
    reqData: setClassMembersPermissionsTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { classMembers } = reqData;
    await prisma.$transaction(async tx => {
      for (const member of classMembers) {
        await tx.joinedClass.updateMany({
          where: {
            accountId: member.accountId,
            classId: parseInt(session.classId!, 10)
          },
          data: {
            permissionLevel: member.permissionLevel
          }
        });
      }

      // Check if there is at least one admin left
      const adminExists = await tx.joinedClass.findFirst({
        where: {
          classId: parseInt(session.classId!, 10),
          permissionLevel: 3
        }
      });

      if (!adminExists) {
        const err: RequestError = {
          name: "Bad Request",
          status: 400,
          message: "At least one logged in admin must be remaining after this action.",
          expected: true
        };
        throw err;
      }
    });
    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.MEMBERS);
  },
  async getClassMembers(session: Session & Partial<SessionData>) {
    const classMembers = await prisma.joinedClass.findMany({
      where: {
        classId: parseInt(session.classId!)
      },
      select: {
        permissionLevel: true,
        Account: {
          select: {
            username: true,
            accountId: true
          }
        }
      }
    });

    return classMembers.map(({ Account, permissionLevel }) => ({
      ...Account,
      permissionLevel
    }));
  },
  async kickClassMember(
    reqData: kickClassMembersTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { classMembers } = reqData;
    await prisma.$transaction(async tx => {
      for (const classMember of classMembers) {
        try {
          const classUserEntry = await tx.joinedClass.delete({
            where: {
              accountId: classMember.accountId
            }
          });
          // delete cache of upload metadata
          await invalidateCache("UPLOADMETADATA", classUserEntry.classId.toString());
          await tx.joinedTeams.deleteMany({
            where: {
              accountId: classMember.accountId
            }
          });
          await tx.homeworkCheck.deleteMany({
            where: {
              accountId: classMember.accountId
            }
          });
          await tx.upload.updateMany({
            where: {
              accountId: classMember.accountId
            },
            data: {
              accountId: null
            }
          });
        }
        catch {
          const err: RequestError = {
            name: "Bad Request",
            status: 400,
            message: "Invalid data format",
            expected: true
          };
          throw err;
        }
      }
      // Check if there is at least one admin left
      const adminExists = await tx.joinedClass.findFirst({
        where: {
          classId: parseInt(session.classId!, 10),
          permissionLevel: 3
        }
      });

      if (!adminExists) {
        const err: RequestError = {
          name: "Bad Request",
          status: 400,
          message: "At least one logged in admin must be remaining after this action.",
          expected: true
        };
        throw err;
      }
    });
    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.MEMBERS);
  },
  async getUsersLoggedOutRole(session: Session & Partial<SessionData>) {
    const targetClass = await prisma.class.findUnique({
      where: {
        classId: parseInt(session.classId!, 10)
      }
    });
    return targetClass!.defaultPermissionLevel;
  },
  async changeDefaultPermission(
    reqData: changeDefaultPermissionTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { role } = reqData;
    await prisma.class.update({
      where: {
        classId: parseInt(session.classId!, 10)
      },
      data: {
        defaultPermissionLevel: role
      }
    });
    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.DEFAULT_PERMISSION);
  },
  async kickLoggedOutUsers(
    session: Session & Partial<SessionData>
  ) {
    const classId = session.classId;
    try {
      const deleteQuery = {
        text: `
        DELETE FROM "account_sessions"
        WHERE
        (sess->>'classId')::integer = $1
        AND (sess->'account') IS NULL;
        `,
        values: [classId]
      };

      const result = await sessionPool.query(deleteQuery);
      logger.info(`Successfully deleted ${result.rowCount} unregistered user sessions for class ${classId}.`);
    }
    catch {
      const err: RequestError = {
        name: "Internal Server Error",
        status: 500,
        message: "Error while cleaning unregistred users of class",
        expected: true
      };
      throw err;
    }
  },
  async changeClassName(
    reqData: changeClassNameTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { classDisplayName } = reqData;
    await prisma.class.update({
      where: {
        classId: parseInt(session.classId!, 10)
      },
      data: {
        className: classDisplayName
      }
    });
    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.CLASS_NAMES);
  },
  async changeClassCode(
    session: Session & Partial<SessionData>
  ) {
    //generate new class code, look if already used -> if not, return value
    // Try until a unique code is found
    let code: string;
    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      code = generateRandomBase62String();
      const exists = await prisma.class.findUnique({
        where: {
          classCode: code
        }
      });
      if (!exists) {
        await prisma.class.update({
          where: {
            classId: parseInt(session.classId!, 10)
          },
          data: {
            classCode: code
          }
        });
        const io = socketIO.getIO();
        io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.CLASS_CODES);
        return code;
      }
    }

    // If unique code wasn't found after 10 tries, fail gracefully
    const err: RequestError = {
      name: "Server Error",
      status: 500,
      message: "Could not generate unique class code",
      expected: false
    };
    throw err;
  },
  async upgradeTestClass(
    session: Session & Partial<SessionData>
  ) {
    await prisma.class.update({
      where: {
        classId: parseInt(session.classId!, 10)
      },
      data: {
        isTestClass: false
      }
    });
    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.UPGRADE_TEST_CLASS);
  }
};

export default classService;
