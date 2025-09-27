import { RequestError } from "../@types/requestError";
import { Session, SessionData } from "express-session";
import { default as prisma } from "../config/prisma";
import { BigIntreplacer } from "../utils/validateFunctions";
import { sessionPool } from "../config/pg";
import logger from "../utils/logger";
import { redisClient } from "../config/redis";
import { 
  changeClassNameTypeBody,
  changeDefaultPermissionTypeBody, 
  createClassTypeBody, 
  joinClassTypeBody, 
  kickClassMembersTypeBody, 
  setClassMembersPermissionsTypeBody, 
  setUsersLoggedOutRoleTypeBody, 
  updateDSBMobileDataTypeBody 
} from "../schemas/classSchema";

function generateRandomBase62String(length: number = 20): string {
  const chars: string[] = [];

  // Add digits 0–9 twice
  for (let i = 0; i < 10; i++) {
    chars.push(i.toString());
    chars.push(i.toString());
  }

  // Add uppercase A–Z
  for (let i = 65; i <= 90; i++) {
    chars.push(String.fromCharCode(i));
  }

  // Add lowercase a–z
  for (let i = 97; i <= 122; i++) {
    chars.push(String.fromCharCode(i));
  }

  // Build the random string
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * 62);
    if (randomIndex < 0 || randomIndex > 61) {
      throw new Error(`Random index out of bounds: ${randomIndex}`);
    }
    result += chars[randomIndex];
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
      classCreated: Date.now(),
      isTestClass: isTestClass,
      dsbMobileActivated: false,
      defaultPermissionLevel: 0 // default setting when creating class is 0 - read only
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
            permissionLevel: 3 // class creator is admin
          }
        });
        return createdClass.classCode;
      });
    }
    catch {
      const err: RequestError = {
        name: "Server Error",
        status: 500,
        message: "Could not create class in database",
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
              permissionLevel: targetClass.defaultPermissionLevel
            }
          });
        }
      });
    }
    session.classId = targetClass.classId.toString();
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

        await tx.joinedClass.delete({
          where: {
            accountId: session.account!.accountId
          }
        });
      });
    }

    delete session.classId;
  },
  async deleteClass(session: Session & Partial<SessionData>) {
    await prisma.$transaction(async tx => {
      const classIdToDelete = parseInt(session.classId!);

      await tx.joinedClass.deleteMany({
        where: {
          classId: classIdToDelete
        }
      });

      await tx.class.delete({
        where: {
          classId: classIdToDelete
        }
      });
      await redisClient.del(`auth_class:${classIdToDelete}`);
      delete session.classId;
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
  async changeDefaultPermission(
    reqData: changeDefaultPermissionTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { defaultPermission } = reqData;
    await prisma.class.update({
      where: {
        classId: parseInt(session.classId!, 10)
      },
      data: {
        defaultPermissionLevel: defaultPermission
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
          await tx.joinedClass.deleteMany({
            where: {
              accountId: classMember.accountId,
              classId: parseInt(session.classId!, 10)
            }
          });
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
  },
  async getUsersLoggedOutRole(session: Session & Partial<SessionData>) {
    const targetClass = await prisma.class.findUnique({
      where: {
        classId: parseInt(session.classId!, 10)
      }
    });
    return targetClass!.defaultPermissionLevel;
  },
  async setUsersLoggedOutRole(
    reqData: setUsersLoggedOutRoleTypeBody,
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
        return code;
      }
    }

    // If unique code wasn't found after 10 tries, fail gracefully
    const err: RequestError = {
      name: "Server Error",
      status: 500,
      message: "Could not generate unique class code",
      additionalInformation:
        "All randomly generated class codes were already in use, please try again",
      expected: false
    };
    throw err;
  },
  async upgradeTestClass(
    session: Session & Partial<SessionData>
  ){
    await prisma.class.update({
      where: {
        classId: parseInt(session.classId!, 10)
      },
      data: {
        isTestClass: false
      }
    });
  }
};

export default classService;
