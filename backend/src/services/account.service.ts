import bcrypt from "bcrypt";
import { default as prisma } from "../config/prisma";
import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";
import { redisClient } from "../config/redis";
import {
  changePasswordTypeBody,
  changeUsernameTypeBody,
  checkUsernameTypeBody,
  deleteAccountTypeBody,
  loginAccountTypeBody,
  registerAccountTypeBody
} from "../schemas/account.schema";

const SALTROUNDS = 10;

export default {
  async getAuth(session: Session & Partial<SessionData>) {
    type AuthResponse = {
      loggedIn: boolean;
      classJoined: boolean;
      account?: {
        username: string;
      };
      permissionLevel?: number;
    };

    if (!session) {
      return { loggedIn: false, classJoined: false };
    }

    const res: AuthResponse = {
      loggedIn: false,
      classJoined: false
    };

    let accountId: number | undefined;

    if (session.account) {
      const accountInDb = await prisma.account.findFirst({
        where: { accountId: session.account.accountId, deletedAt: null },
        select: { accountId: true, username: true }
      });

      if (accountInDb) {
        res.loggedIn = true;
        res.account = { username: accountInDb.username };
        accountId = accountInDb.accountId;
        session.account = { accountId: accountInDb.accountId, username: accountInDb.username };
      }
      else {
        delete session.account;
      }
    }

    if (res.loggedIn && accountId) {
      const joinedClass = await prisma.joinedClass.findUnique({
        where: { accountId: accountId },
        select: { permissionLevel: true, classId: true }
      });

      if (joinedClass) {
        res.classJoined = true;
        res.permissionLevel = joinedClass.permissionLevel;
        session.classId = joinedClass.classId.toString();
      }
      else {
        delete session.classId;
        res.classJoined = false;
      }
    }

    else if (!res.loggedIn && session.classId) {
      const classId = parseInt(session.classId, 10);
      const classInDb = await prisma.class.findUnique({
        where: { classId: classId },
        select: { defaultPermissionLevel: true }
      });

      if (classInDb) {
        res.classJoined = true;
        res.permissionLevel = classInDb.defaultPermissionLevel;
      }
      else {
        delete session.classId;
        res.classJoined = false;
      }
    }

    return res;
  },
  async registerAccount(reqData: registerAccountTypeBody, session: Session & Partial<SessionData>) {
    const { username, password } = reqData;
    if (session.account) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Already logged in",
        additionalInformation: "The requesting session is already logged in!",
        expected: true
      };
      throw err;
    }

    const accountExists = await prisma.account.findFirst({
      where: { username: username, deletedAt: null }
    });
    if (accountExists) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "The requested username is already registered!",
        additionalInformation: "The requested username is already registered!",
        expected: true
      };
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, SALTROUNDS);
    const account = await prisma.$transaction(async tx => {
      const newAccount = await tx.account.create({
        data: {
          username,
          password: hashedPassword,
          createdAt: Date.now()
        }
      });

      if (session.classId) {
        await tx.joinedClass.create({
          data: {
            accountId: newAccount.accountId,
            classId: parseInt(session.classId),
            permissionLevel: 0, // assume lowest role for class
            createdAt: Date.now()
          }
        });
      }

      return newAccount;
    });

    session.account = {
      username,
      accountId: account.accountId
    };
  },

  async logoutAccount(session: Session & Partial<SessionData>) {
    delete session.account;
  },

  async loginAccount(reqData: loginAccountTypeBody, session: Session & Partial<SessionData>) {
    const { username, password } = reqData;
    if (session.account) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Already logged in",
        additionalInformation: "The requesting session is already logged in!",
        expected: true
      };
      throw err;
    }
    const account = await prisma.account.findFirst({
      where: {
        username: username,
        deletedAt: null
      }
    });
    if (!account) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "Invalid credentials",
        additionalInformation: "The requested username is not registered!",
        expected: true
      };
      throw err;
    }
    const isPasswordValid = await bcrypt.compare(password, account.password);
    if (!isPasswordValid) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "Invalid credentials",
        expected: true
      };
      throw err;
    }
    const accountId = account.accountId;
    session.account = { username, accountId };

    const joinedClassExists = await prisma.joinedClass.findUnique({
      where: {
        accountId: accountId
      }
    });
    if (joinedClassExists === null && session.classId) {
      await prisma.joinedClass.create({
        data: {
          accountId: accountId,
          classId: parseInt(session.classId),
          permissionLevel: 0, // assume lowest level
          createdAt: Date.now()
        }
      });
    }
    else if (joinedClassExists !== null) {
      session.classId = joinedClassExists.classId.toString();
    }
  },

  async deleteAccount(reqData: deleteAccountTypeBody, session: Session & Partial<SessionData>) {
    const { password } = reqData;
    // account and session.account certainly exist here 
    // -> checkAccess.checkAccount middleware
    const joinedClassAccount = await prisma.joinedClass.findUnique({
      where: {
        accountId: session.account!.accountId
      }
    });
    // if user is in a class, evaluate if user is admin
    if (joinedClassAccount) {
      if (joinedClassAccount.permissionLevel === 3) {
        const err: RequestError = {
          name: "Conflict",
          status: 409,
          message: "The account is still an admin in a class, leave the class first",
          expected: true
        };
        throw err;
      }
    }
    // account is certainly not soft-deleted and if found (accessMiddleware)
    // no deletedAt query needed
    const account = await prisma.account.findUnique({
      where: {
        accountId: session.account!.accountId
      }
    });
    const isPasswordValid = await bcrypt.compare(password, account!.password);
    if (!isPasswordValid) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "Invalid credentials",
        expected: true
      };
      throw err;
    }
    await prisma.$transaction(async tx => {
      // mark account as deleted
      await tx.account.update({
        where: {
          accountId: account!.accountId
        },
        data: {
          deletedAt: Date.now()
        }
      });
      // delete related records in JoinedClass, JoinedTeams, and HomeworkCheck
      await tx.joinedClass.deleteMany({
        where: {
          accountId: account!.accountId
        }
      });
      await tx.joinedTeams.deleteMany({
        where: {
          accountId: account!.accountId
        }
      });
      await tx.homeworkCheck.deleteMany({
        where: {
          accountId: account!.accountId
        }
      });
      // set relevant accountId in uploads to null
      await tx.upload.updateMany({
        where: {
          accountId: account!.accountId
        },
        data: {
          accountId: null
        }
      });
    });
    await redisClient.del(`auth_user:${account!.accountId}`);
    delete session.account;
  },

  async changeUsername(reqData: changeUsernameTypeBody, session: Session & Partial<SessionData>) {
    const { password, newUsername } = reqData;
    // soft delete needed, so prisma can find usernames which are not deleted
    // deletedAt needed
    const accountWithNewUsername = await prisma.account.findFirst({
      where: {
        username: newUsername,
        deletedAt: null
      }
    });

    if (accountWithNewUsername) {
      const err: RequestError = {
        name: "Conflict",
        status: 409,
        message: "Username already exists, please choose another username.",
        expected: true
      };
      throw err;
    }
    // account is certainly not soft-deleted and if found (accessMiddleware)
    // no deletedAt query needed
    const account = await prisma.account.findUnique({
      where: {
        accountId: session.account!.accountId
      }
    });

    const isPasswordValid = await bcrypt.compare(password, account!.password);
    if (!isPasswordValid) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "Invalid credentials",
        expected: true
      };
      throw err;
    }
    // account is certainly not soft-deleted and if found (accessMiddleware)
    // no deletedAt query needed
    await prisma.account.update({
      where: {
        accountId: session.account!.accountId
      },
      data: {
        username: newUsername
      }
    });

    session.account = { username: newUsername, accountId: session.account!.accountId };
  },

  async changePassword(
    reqData: changePasswordTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { oldPassword, newPassword } = reqData;
    // account is certainly not soft-deleted and if found (accessMiddleware)
    // no deletedAt query needed
    const changePasswordAccount = await prisma.account.findUnique({
      where: {
        accountId: session.account!.accountId
      }
    });

    const isPasswordValid = await bcrypt.compare(oldPassword, changePasswordAccount!.password);
    if (!isPasswordValid) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "Invalid credentials",
        expected: true
      };
      throw err;
    }
    const hashedPassword = await bcrypt.hash(newPassword, SALTROUNDS);
    // account is certainly not soft-deleted and if found (accessMiddleware)
    // no deletedAt query needed
    await prisma.account.update({
      where: {
        accountId: session.account!.accountId
      },
      data: {
        password: hashedPassword
      }
    });
  },

  async checkUsername(reqData: checkUsernameTypeBody) {
    const { username } = reqData;
    const accountExists = await prisma.account.findFirst({
      where: { username: username, deletedAt: null }
    });
    return accountExists !== null;
  }
};
