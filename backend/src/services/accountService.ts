import bcrypt from "bcrypt";
import prisma from "../config/prisma";
import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";

const SALTROUNDS = 10;

function checkUsername(username: string): boolean {
  return /^\w{4,20}$/.test(username);
}

export default {
  async getAuth( session: Session & Partial<SessionData>) {
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

  if (session.account) {
    const accountInDb = await prisma.account.findUnique({
      where: { accountId: session.account.accountId },
      select: { permissionSetting: true }
    });

    if (!accountInDb) {
      delete session.account;
    } 
    else {
      res.loggedIn = true;
      res.account = { username: session.account.username };
      res.permissionLevel = accountInDb.permissionSetting ?? 0;
    }
  }

  if (!res.loggedIn && session.classId) {
    const classInDb = await prisma.class.findUnique({
      where: { classId: parseInt(session.classId, 10) },
      select: { permissionDefaultSetting: true }
    });

    if (!classInDb) {
      delete session.classId;
    } 
    else {
      res.permissionLevel = classInDb.permissionDefaultSetting;
    }
  }
  res.classJoined = !!session.classId;

  return res;
  },
  async registerAccount(reqData: { username: string; password: string }, session: Session & Partial<SessionData>) {
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
    if (!checkUsername(username)) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "The username does not comply with the rules!",
        expected: true
      };
      throw err;
    }

    const accountExists = await prisma.account.findUnique({
      where: { username: username }
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
          password: hashedPassword
        }
      });

      if (session.classId) {
        await tx.joinedClass.create({
          data: {
            accountId: newAccount.accountId,
            classId: parseInt(session.classId)
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

  async loginAccount(reqData: { username: string; password: string }, session: Session & Partial<SessionData>) {
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
    const account = await prisma.account.findUnique({
      where: {
        username: username
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
      prisma.joinedClass.create({
        data: {
          accountId: accountId,
          classId: parseInt(session.classId)
        }
      });
    }
    else if (joinedClassExists !== null) {
      session.classId = joinedClassExists.classId.toString();
    }
  },

  async deleteAccount(password: string, session: Session & Partial<SessionData>) {
    // account and session.account certainly exist here 
    // -> checkAccess.checkAccount middleware
    const username = session!.account!.username;
    const account = await prisma.account.findUnique({
      where: {
        username: username
      }
    });
    if (account!.permissionSetting === 3){
      const err: RequestError = {
        name: "Conflict",
        status: 409,
        message: "The account is still an admin in a class, leave the class first",
        expected: true
      };
      throw err;
    }
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
    await prisma.deletedAccount.create({
      data: {
        deletedUsername: account!.username,
        deletedPassword: account!.password,
        deletedAccountId: account!.accountId,
        deletedOn: Date.now()
      }
    });
    await prisma.account.delete({
      where: {
        username: username
      }
    });
    delete session.account;
  },

  async changeUsername(newUsername: string, session: Session & Partial<SessionData>) {
    await prisma.account.update({
      where: {
        accountId: session.account!.accountId
      },
      data: {
        username: newUsername
      }
    });
  },

  async changePassword(
    reqData: {
      oldPassword: string;
      newPassword: string;
    },
    session: Session & Partial<SessionData>
  ) {
    const {oldPassword, newPassword } = reqData;
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
    await prisma.account.update({
      where: {
        accountId: session.account!.accountId
      },
      data: {
        password: hashedPassword
      }
    });
  },

  async checkUsername(username: string) {
    const accountExists = await prisma.account.findUnique({
      where: { username: username }
    });
    return accountExists !== null;
  }
};
