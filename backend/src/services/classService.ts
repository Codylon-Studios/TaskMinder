import { RequestError } from "../@types/requestError";
import { Session, SessionData } from "express-session";
import prisma from "../config/prisma";

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
    const randomIndex = Math.floor(Math.random() * (62));
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
    if (!classInfo){
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Can not find class",
        expected: true
      };
      throw err;
    }
    return classInfo;
  },

  async createClass(
    reqData: {
      classDisplayName: string;
      classCode: string;
      dsbMobileActivated: boolean;
      dsbMobileUser?: string | null;
      dsbMobilePassword?: string | null;
      dsbMobileClass?: string | null;
    },
    session: Session & Partial<SessionData>
  ) {
    const {
      classDisplayName,
      classCode,
      dsbMobileActivated,
      dsbMobileUser,
      dsbMobilePassword,
      dsbMobileClass
    } = reqData;
  
    if (session.classId) {
      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "User logged in into class",
        expected: true
      };
      throw err;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseData: any = {
      className: classDisplayName,
      classCode: classCode,
      classCreated: Date.now(),
      isTestClass: false,
      dsbMobileActivated: dsbMobileActivated,
      permissionDefaultSetting: 0 // default setting when creating class is 0 - read only
    };
  
    if (dsbMobileActivated) {
      if (!dsbMobileUser || !dsbMobilePassword || !dsbMobileClass) {
        const err: RequestError = {
          name: "Bad Request",
          status: 400,
          message: "DSB credentials are required when dsbMobileActivated is true.",
          expected: true
        };
        throw err;
      }
  
      baseData.dsbMobileUser = dsbMobileUser;
      baseData.dsbMobilePassword = dsbMobilePassword;
      baseData.dsbMobileClass = dsbMobileClass;
    }

    await prisma.$transaction(async tx => {
  
      const createdClass = await tx.class.create({
        data: baseData
      });

      session.classId = createdClass.classId.toString();

      // add user to classJoined table 
      // change permission of user which created the account to admin
      await tx.joinedClass.create({
        data: {
          accountId: session.account!.accountId,
          classId: createdClass.classId
        }
      });

      await tx.account.update({
        where: {
          accountId: session.account!.accountId
        },
        data: {
          permissionSetting: 3 // class creator has highest role level -> admin
        }
      });

    });
  },
  
  async createTestClass(
    reqData: {
      classDisplayName: string;
      classCode: string;
      dsbMobileActivated: boolean;
      dsbMobileUser?: string | null;
      dsbMobilePassword?: string | null;
      dsbMobileClass?: string | null;
    },
    session: Session & Partial<SessionData>
  ) {
    const {
      classDisplayName,
      classCode,
      dsbMobileActivated,
      dsbMobileUser,
      dsbMobilePassword,
      dsbMobileClass
    } = reqData;
  
    if (session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User logged into class",
        expected: true
      };
      throw err;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseData: any = {
      className: classDisplayName,
      classCode: classCode,
      classCreated: Date.now(),
      isTestClass: true,
      dsbMobileActivated: dsbMobileActivated
    };
  
    if (dsbMobileActivated) {
      if (!dsbMobileUser || !dsbMobilePassword || !dsbMobileClass) {
        const err: RequestError = {
          name: "Bad Request",
          status: 400,
          message: "DSB credentials are required when dsbMobileActivated is true.",
          expected: true
        };
        throw err;
      }
  
      baseData.dsbMobileUser = dsbMobileUser;
      baseData.dsbMobilePassword = dsbMobilePassword;
      baseData.dsbMobileClass = dsbMobileClass;
    }
  

    await prisma.$transaction(async tx => {
  
      const createdClass = await tx.class.create({
        data: baseData
      });

      session.classId = createdClass.classId.toString();

      // add user to classJoined table 
      // change permission of user which created the account to admin
      await tx.joinedClass.create({
        data: {
          accountId: session.account!.accountId,
          classId: createdClass.classId
        }
      });

      await tx.account.update({
        where: {
          accountId: session.account!.accountId
        },
        data: {
          permissionSetting: 3 // class creator has highest role level -> admin
        }
      });
    });
  },
  async generateNewClassCode(session: Session & Partial<SessionData>){
    if (session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User logged into class",
        expected: true
      };
      throw err;
    }
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
        return code;
      }
    }

    // If unique code wasn't found after 10 tries, fail gracefully
    const err: RequestError = {
      name: "Server Error",
      status: 500,
      message: "Could not generate unique class code",
      additionalInformation: "All randomly generated class codes were already in use",
      expected: false
    };
    throw err;
  },
  async leaveClass(session: Session & Partial<SessionData>) {
    if (session.account) {
      await prisma.$transaction(async tx => {
        const allMembers = await tx.joinedClass.findMany({
          where: {
            classId: parseInt(session.classId!)
          },
          include: {
            Account: {
              select: {
                accountId: true,
                permissionSetting: true
              }
            }
          }
        });

        const currentUserMemberInfo = allMembers.find(
          member => member.accountId === session.account!.accountId
        );

        if (!currentUserMemberInfo || !currentUserMemberInfo.Account) {
          delete session.classId;
          delete session.account;
          const err: RequestError = {
            name: "Unauthorized",
            status: 401,
            message: "Session account not found in the class. Logging out of class",
            expected: true
          };
          throw err;
        }

        const leavingUserIsAdmin = currentUserMemberInfo.Account.permissionSetting === 3;

        if (leavingUserIsAdmin) {
          if (allMembers.length === 1) {
            const err: RequestError = {
              name: "Bad Request",
              status: 400,
              message: "You are the last user. Please delete the class instead",
              expected: true
            };
            throw err;
          }

          const adminsInClass = allMembers.filter(
            member => member.Account?.permissionSetting === 3
          );

          if (adminsInClass.length === 1) {
            const err: RequestError = {
              name: "Bad Request",
              status: 400,
              message: "You are the only admin. Please promote another member before leaving.",
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

        await tx.account.update({
          where: {
            accountId: session.account!.accountId
          },
          data: {
            permissionSetting: null
          }
        });
      });
    }

    delete session.classId;
  },
  async deleteClass(session: Session & Partial<SessionData>) {
    await prisma.$transaction(async tx => {
      const classIdToDelete = parseInt(session.classId!);

      await tx.account.updateMany({
        where: {
          JoinedClass: {
            classId: classIdToDelete
          }
        },
        data: {
          permissionSetting: null
        }
      });

      await tx.class.delete({
        where: {
          classId: classIdToDelete
        }
      });

      delete session.classId;
    });
  },
  async updateDSBMobileData(
    reqData: {
      dsbMobileActivated: boolean;
      dsbMobileUser?: string | null;
      dsbMobilePassword?: string | null;
      dsbMobileClass?: string | null;
    },
    session: Session & Partial<SessionData>
  ){
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
    reqData: {
      defaultPermission: number;
    },
    session: Session & Partial<SessionData>
  ) {
    const {
      defaultPermission
    } = reqData;
    await prisma.class.update({
      where: {
        classId: parseInt(session.classId!, 10)
      },
      data: {
        permissionDefaultSetting: defaultPermission
      }
    });
  },
  async setClassMembersPermissions(
    members: {
      accountId: number;
      permissionLevel: number;
    }[]
  ) {
    await prisma.$transaction(async tx => {
      for (const member of members) {
        await tx.account.update({
          where: { accountId: member.accountId },
          data: {
            permissionSetting: member.permissionLevel
          }
        });
      }
    });

  },
  async getClassMembers(session: Session & Partial<SessionData>) {
    const classMembers = await prisma.joinedClass.findMany({
      where: {
        classId: parseInt(session.classId!)
      },
      select: {
        Account: {
          select: {
            username: true,
            permissionSetting: true
          }
        }
      }
    });
    return classMembers.map(item => item.Account);
  },
  async kickClassMember(
    reqData: {
      accountId: number;
    }
  ) {
    const {
      accountId
    } = reqData;
    await prisma.account.update({
      where: {
        accountId: accountId
      },
      data: {
        permissionSetting: null
      }
    });
    await prisma.joinedClass.delete({
      where: {
        accountId: accountId
      }
    });
  }
};

export default classService;
