import { RequestError } from "../@types/requestError";
import { Session, SessionData } from "express-session";
import { default as prisma } from "../config/prisma";
import { BigIntreplacer, generateRandomBase62String, invalidateCache } from "../utils/validate.functions";
import { sessionPool } from "../config/pg";
import logger from "../config/logger";
import { redisClient } from "../config/redis";
import fs from "fs/promises";
import path from "path";
import { FINAL_UPLOADS_DIR } from "../config/upload";
import {
  changeClassCodeTypeParams,
  changeClassNameTypeBody,
  changeClassNameTypeParams,
  changeDefaultPermissionTypeBody,
  changeDefaultPermissionTypeParams,
  createClassTypeBody,
  deleteClassTypeParams,
  getClassInfoTypeParams,
  getClassMembersTypeParams,
  joinClassTypeBody,
  kickClassMembersTypeBody,
  kickClassMembersTypeParams,
  kickLoggedOutUsersTypeParams,
  leaveClassTypeParams,
  setClassMembersPermissionsTypeBody,
  setClassMembersPermissionsTypeParams,
  upgradeTestClassTypeParams
} from "../schemas/class.schema";
import socketIO, { SOCKET_EVENTS } from "../config/socket";

const classService = {
  /*
  getClassInfo(
    reqParams: getClassInfoTypeParams
    session: Session & Partial<SessionData>
  )
  get all relevant class info for user
  */
  async getClassInfo(
    reqParams: getClassInfoTypeParams,
    session: Session & Partial<SessionData>
  ) {
    // always use classId (id) instead of session.classId
    // since session.classId can change during concurrent requests
    const { id: classId } = reqParams;
    // check id from request against session value
    if (classId !== parseInt(session.classId!)) {
      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "Request params /:id differs from session classId",
        expected: true
      };
      throw err;
    }
    // find class and fetch all relevant fields
    const classInfo = await prisma.class.findUnique({
      where: {
        classId
      },
      select: {
        classId: true,
        classCode: true,
        className: true,
        createdAt: true,
        isTestClass: true,
        defaultPermissionLevel: true,
        storageUsedBytes: true,
        storageQuotaBytes: true,
        dsbMobileActivated: true,
        dsbMobileUser: true,
        dsbMobilePassword: true,
        dsbMobileClass: true
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
    // parse stringified data to avoid BigInt serialize errors
    return JSON.parse(JSON.stringify(classInfo, BigIntreplacer));
  },
  /*
  createClass(
    reqData: createClassTypeBody,
    session: Session & Partial<SessionData>
  )
  create a (test) class, requires account and no class membership
  and return the class code
  */
  async createClass(
    reqData: createClassTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { classDisplayName, isTestClass } = reqData;
    const accountId = session.account!.accountId;
    const MAX_ATTEMPTS = 10;
    // forbid already in class users to create a new class
    if (session.classId) {
      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "User logged in into class",
        expected: true
      };
      throw err;
    }
    // set base data
    const baseData = {
      className: classDisplayName,
      classCode: null,
      createdAt: BigInt(Date.now()),
      isTestClass: isTestClass,
      dsbMobileActivated: false,
      storageQuotaBytes: isTestClass ? 20 * 1024 * 1024 : 1 * 1024 * 1024 * 1024, // 20MB (test class) or 1 GB (normal class)
      storageUsedBytes: 0,
      defaultPermissionLevel: 0 // default setting when creating class is 0 - member status
    };
    // continously try to create class with class code, if class code already used, retry
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const classCode = generateRandomBase62String();
      try {
        return await prisma.$transaction(async tx => {
          const createdClass = await tx.class.create({
            data: { ...baseData, classCode }
          });
          // session bind
          session.classId = createdClass.classId.toString();
          // creator becomes admin
          await tx.joinedClass.create({
            data: {
              accountId: session.account!.accountId,
              classId: createdClass.classId,
              permissionLevel: 3,
              createdAt: BigInt(Date.now())
            }
          });
          logger.info(`User ${accountId} created class: ${createdClass.classId}`);
          return createdClass.classCode;
        });
      } 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      catch (e: any) {
        if (e.code === "P2002" && e.meta?.target?.includes("classCode")) {
          if (attempt === MAX_ATTEMPTS) {
            const err: RequestError = {
              name: "Conflict",
              status: 409,
              message: "Unique class code could not be generated. Please retry.",
              expected: true
            };
            throw err;
          }
          continue;
        }
        // other errors
        logger.error(`Error occured during class creation: ${e}`);
        const err: RequestError = {
          name: "Internal Server Error",
          status: 500,
          message: "Class creation failed",
          expected: true
        };
        throw err;
      }
    }
  },
  /*
  joinClass(
    reqData: joinClassTypeBody,
    session: Session & Partial<SessionData>
  )
  join class based on class code and sync session
  */
  async joinClass(reqData: joinClassTypeBody, session: Session & Partial<SessionData>) {
    const { classCode } = reqData;
    const accountId = session.account?.accountId;
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
    // sync session
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
        }
        else {
          await tx.joinedClass.create({
            data: {
              accountId: accountId,
              classId: targetClass.classId,
              permissionLevel: targetClass.defaultPermissionLevel,
              createdAt: BigInt(Date.now())
            }
          });
        }
      });
      logger.info(`User (logged in): ${accountId} joined class ${targetClass.classId}`);
    }
    session.classId = targetClass.classId.toString();
    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.MEMBERS);
    return targetClass.className;
  },
  /*
  leaveClass(
    reqParams: leaveClassTypeParams,
    session: Session & Partial<SessionData>
  )
  leave class, reject if only admin left or operation would leave class admin-less
  */
  async leaveClass(reqParams: leaveClassTypeParams, session: Session & Partial<SessionData>) {
    const { id: classId } = reqParams;
    // check id from request against session value
    if (classId !== parseInt(session.classId!)) {
      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "Request params /:id differs from session classId",
        expected: true
      };
      throw err;
    }
    // if account exists (user is logged in), remove from DB
    // check for cases (e.g. only admin left)
    if (session.account) {
      await prisma.$transaction(async tx => {
        // find all members of the class
        const allMembers = await tx.joinedClass.findMany({
          where: {
            classId
          }
        });

        // if requested account is not in this class, deny operation and delete session
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

        // admin cases
        const leavingUserIsAdmin = currentUserMemberInfo.permissionLevel === 3;
        if (leavingUserIsAdmin) {
          // only one member left
          if (allMembers.length === 1) {
            const err: RequestError = {
              name: "Conflict",
              status: 409,
              message:
                "You are the only admin and user in this class. Please delete the class instaed.",
              expected: true
            };
            throw err;
          }

          // if only one admin left
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
        // delete cache of upload metadata as author may not be in class anymore
        await invalidateCache("UPLOADMETADATA", classUserEntry.classId.toString());
        logger.info(`User ${session.account} left class: ${classId}`);
      });
    }
    delete session.classId;
    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.MEMBERS);
  },
  /*
  deleteClass(
    reqParams: deleteClassTypeParams,
    session: Session & Partial<SessionData>
  )
  delete class (and all data with it)
  */
  async deleteClass(reqParams: deleteClassTypeParams, session: Session & Partial<SessionData>) {
    const { id: classId } = reqParams;
    // check id from request against session value
    if (classId !== parseInt(session.classId!)) {
      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "Request params /:id differs from session classId",
        expected: true
      };
      throw err;
    }
    // delete everything from this class in transaction to enable rollback
    await prisma.$transaction(async tx => {
      // Delete all file metadata and upload records for this class
      const uploads = await tx.upload.findMany({
        where: { classId },
        include: { Files: true }
      });
      // Delete physical files from disk
      const classDir = path.join(FINAL_UPLOADS_DIR, classId.toString());
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
        where: { classId }
      });
      // Delete upload request records
      await tx.uploadRequest.deleteMany({
        where: { classId }
      });
      // Delete all joinedClass records
      await tx.joinedClass.deleteMany({
        where: { classId }
      });
      // Delete class, rest is deleted with CASCADE in database
      await tx.class.delete({
        where: { classId }
      });
      // invalidate redis caches
      await invalidateCache("UPLOADMETADATA", classId.toString());
      await invalidateCache("UPLOADREQUESTS", classId.toString());
      await invalidateCache("HOMEWORK", classId.toString());
      await invalidateCache("EVENT", classId.toString());
      await invalidateCache("LESSON", classId.toString());
      await invalidateCache("EVENTTYPESTYLE", classId.toString());
      await invalidateCache("SUBJECT", classId.toString());
      await invalidateCache("EVENTTYPE", classId.toString());
      await invalidateCache("TEAMS", classId.toString());
      await redisClient.del(`auth_class:${classId}`);
      const room = `class:${session.classId}`;
      // delete session classId
      delete session.classId;
      // Make all sockets in the room leave it
      const io = socketIO.getIO();
      const sockets = await io.in(room).fetchSockets();
      sockets.forEach(socket => socket.leave(room));
    });
    logger.info(`Class ${classId} was deleted`);
  },
  /*
  setClassMembersPermissions(
    reqParams: setClassMembersPermissionsTypeParams,
    reqBody: setClassMembersPermissionsTypeBody,
    session: Session & Partial<SessionData>
  )
  BULK EDIT: set the permissions of the class members, needs one admin after edit
  */
  async setClassMembersPermissions(
    reqParams: setClassMembersPermissionsTypeParams,
    reqBody: setClassMembersPermissionsTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { classMembers } = reqBody;
    const { id: classId } = reqParams;
    // check id from request against session value
    if (classId !== parseInt(session.classId!)) {
      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "Request params /:id differs from session classId",
        expected: true
      };
      throw err;
    }
    await prisma.$transaction(async tx => {
      for (const member of classMembers) {
        await tx.joinedClass.updateMany({
          where: {
            accountId: member.accountId,
            classId
          },
          data: {
            permissionLevel: member.permissionLevel
          }
        });
      }

      // Check if there is at least one admin left
      const adminExists = await tx.joinedClass.findFirst({
        where: {
          classId,
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
    io.to(`class:${classId}`).emit(SOCKET_EVENTS.MEMBERS);
    logger.info(`class member permissions were updated for class ${classId}`);
  },
  /*
  getClassMembers(
    reqParams: getClassMembersTypeParams,
    session: Session & Partial<SessionData>
  )
  get class members details for class settings
  */
  async getClassMembers(
    reqParams: getClassMembersTypeParams,
    session: Session & Partial<SessionData>
  ) {
    const { id: classId } = reqParams;
    // check id from request against session value
    if (classId !== parseInt(session.classId!)) {
      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "Request params /:id differs from session classId",
        expected: true
      };
      throw err;
    }
    // find all members in class, only extract username, accountId and permissionLevel
    const classMembers = await prisma.joinedClass.findMany({
      where: {
        classId
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
    // return the mapped array with username, accountId and permissionLevel
    return classMembers.map(({ Account, permissionLevel }) => ({
      ...Account,
      permissionLevel
    }));
  },
  /*
  kickClassMember(
    reqData: kickClassMembersTypeBody,
    session: Session & Partial<SessionData>
  )
  BULK EDIT: remove listed class members in class
  */
  async kickClassMember(
    reqParams: kickClassMembersTypeParams,
    reqBody: kickClassMembersTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { classMembers } = reqBody;
    const { id: classId } = reqParams;
    // check id from request against session value
    if (classId !== parseInt(session.classId!)) {
      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "Request params /:id differs from session classId",
        expected: true
      };
      throw err;
    }
    await prisma.$transaction(async tx => {
      for (const classMember of classMembers) {
        try {
          const classUserEntry = await tx.joinedClass.delete({
            where: {
              accountId: classMember.accountId
            }
          });
          // delete cache of upload metadata to avoid null authors
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
          classId: classId,
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
    logger.info(`class members were kicked in class: ${classId}`);
  },
  /*
  changeDefaultPermission(
    reqParams: changeDefaultPermissionTypeParams,
    reqBody: changeDefaultPermissionTypeBody,
    session: Session & Partial<SessionData>
  )
  change the default permission for joined users and role for logged out users
  */
  async changeDefaultPermission(
    reqParams: changeDefaultPermissionTypeParams,
    reqBody: changeDefaultPermissionTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { role } = reqBody;
    const { id: classId } = reqParams;
    // check id from request against session value
    if (classId !== parseInt(session.classId!)) {
      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "Request params /:id differs from session classId",
        expected: true
      };
      throw err;
    }
    await prisma.class.update({
      where: {
        classId: classId
      },
      data: {
        defaultPermissionLevel: role
      }
    });
    const io = socketIO.getIO();
    io.to(`class:${classId}`).emit(SOCKET_EVENTS.CLASS_INFO);
    logger.info(`class ${classId} default permission was changed to: ${role}`);
  },
  /*
  kickLoggedOutUsers(
    reqParams: kickLoggedOutUsersTypeParams,
    session: Session & Partial<Sessio
  )
  BULK EDIT: remove all not logged in users from class
  */
  async kickLoggedOutUsers(
    reqParams: kickLoggedOutUsersTypeParams,
    session: Session & Partial<SessionData>
  ) {
    const { id: classId } = reqParams;
    // check id from request against session value
    if (classId !== parseInt(session.classId!)) {
      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "Request params /:id differs from session classId",
        expected: true
      };
      throw err;
    }
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
  /*
  changeClassName(
    reqParams: changeClassNameTypeParams,
    reqBody: changeClassNameTypeBody,
    session: Session & Partial<SessionData>
  )
  change class name
  */
  async changeClassName(
    reqParams: changeClassNameTypeParams,
    reqBody: changeClassNameTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { classDisplayName } = reqBody;
    const { id: classId } = reqParams;
    // check id from request against session value
    if (classId !== parseInt(session.classId!)) {
      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "Request params /:id differs from session classId",
        expected: true
      };
      throw err;
    }
    await prisma.class.update({
      where: {
        classId
      },
      data: {
        className: classDisplayName
      }
    });
    const io = socketIO.getIO();
    io.to(`class:${classId}`).emit(SOCKET_EVENTS.CLASS_INFO);
    logger.info(`class name was changed in class: ${classId}`);
  },
  /*
  changeClassCode(
    reqParams: changeClassCodeTypeParams,
    session: Session & Partial<SessionData>
  )
  change class code with retry logic
  */
  async changeClassCode(
    reqParams: changeClassCodeTypeParams,
    session: Session & Partial<SessionData>
  ) {
    const { id: classId } = reqParams;
    // check id from request against session value
    if (classId !== parseInt(session.classId!)) {
      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "Request params /:id differs from session classId",
        expected: true
      };
      throw err;
    }
    //generate new class code, look if already used -> if not, return value
    // Try until a unique code is found
    let code: string;
    const MAX_ATTEMPTS = 10;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      code = generateRandomBase62String();
      const exists = await prisma.class.findUnique({
        where: {
          classCode: code
        }
      });
      if (!exists) {
        await prisma.class.update({
          where: {
            classId
          },
          data: {
            classCode: code
          }
        });
        const io = socketIO.getIO();
        io.to(`class:${classId}`).emit(SOCKET_EVENTS.CLASS_INFO);
        logger.info(`class code was changed for class: ${classId}`);
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
  /*
  upgradeTestClass(
    reqParams: upgradeTestClassTypeParams,
    session: Session & Partial<SessionData>
  )
  upgrade test class to normal class
  */
  async upgradeTestClass(
    reqParams: upgradeTestClassTypeParams,
    session: Session & Partial<SessionData>
  ) {
    const { id: classId } = reqParams;
    // check id from request against session value
    if (classId !== parseInt(session.classId!)) {
      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "Request params /:id differs from session classId",
        expected: true
      };
      throw err;
    }
    await prisma.class.update({
      where: {
        classId
      },
      data: {
        isTestClass: false
      }
    });
    const io = socketIO.getIO();
    io.to(`class:${classId}`).emit(SOCKET_EVENTS.CLASS_INFO);
    logger.info(`class: ${classId} was upgraded to normal class`);
  }
};

export default classService;
