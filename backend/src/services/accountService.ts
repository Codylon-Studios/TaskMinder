import bcrypt from "bcrypt";
import prisma from "../config/prisma";
import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";

const SALTROUNDS = 10;

function checkUsername(username: string) {
  return /^\w{4,20}$/.test(username);
}

export default {
  async getAuth(session: Session & Partial<SessionData>) {
    type AuthResponse = {
      loggedIn?: boolean;
      classJoined?: boolean;
      account?: {
        username: string;
      };
    };

    const res: AuthResponse = {};
    if (!session) {
      res.loggedIn = false;
      res.classJoined = false;
    }
    if (session.account) {
      res.loggedIn = true;
      const username = session.account.username;
      res.account = { username };
    } else {
      res.loggedIn = false;
    }
    if (session.classJoined) {
      res.classJoined = true;
    } else {
      res.classJoined = false;
    }
    return res;
  },
  async registerAccount(
    reqData: { username: string; password: string },
    session: Session & Partial<SessionData>
  ) {
    const { username, password } = reqData;
    if (session.account) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Already logged in",
        additionalInformation: "The requesting session is already logged in!",
        expected: true,
      };
      throw err;
    }
    if (!checkUsername(username)) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "The username does not comply with the rules!",
        expected: true,
      };
      throw err;
    }

    const accountExists = await prisma.account.findUnique({
      where: { username: username },
    });
    if (accountExists) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "The requested username is already registered!",
        additionalInformation: "The requested username is already registered!",
        expected: true,
      };
      throw err;
    }
    const hashedPassword = await bcrypt.hash(password, SALTROUNDS);
    const account = await prisma.account.create({
      data: {
        username: username,
        password: hashedPassword,
      },
    });
    const accountId = account.accountId;
    session.account = { username, accountId };

    if (session.classJoined) {
      const accountId = session.account.accountId;
      await prisma.joinedClass.create({
        data: {
          accountId: accountId,
        },
      });
    }
  },
  async logoutAccount(session: Session & Partial<SessionData>) {
    if (!session.account) {
      const err: RequestError = {
        name: "OK",
        status: 200,
        message: "User not logged in",
        expected: true,
      };
      throw err;
    }

    delete session.account;

    await new Promise<void | Error>((resolve, reject) => {
      session.save((err: unknown) => {
        if (err)
          return err instanceof Error
            ? reject(err)
            : reject(new Error("Error saving session during logout"));
        resolve();
      });
    });
  },
  async loginAccount(
    reqData: { username: string; password: string },
    session: Session & Partial<SessionData>
  ) {
    const { username, password } = reqData;
    if (session.account) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Already logged in",
        additionalInformation: "The requesting session is already logged in!",
        expected: true,
      };
      throw err;
    }
    const account = await prisma.account.findUnique({
      where: {
        username: username,
      },
    });
    if (!account) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "Invalid credentials",
        additionalInformation: "The requested username is not registered!",
        expected: true,
      };
      throw err;
    }
    const isPasswordValid = await bcrypt.compare(password, account.password);
    if (!isPasswordValid) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "Invalid credentials",
        expected: true,
      };
      throw err;
    }
    const accountId = account.accountId;
    session.account = { username, accountId };

    const joinedClassExists = await prisma.joinedClass.findUnique({
      where: {
        accountId: accountId,
      },
    });
    if (joinedClassExists == null && session.classJoined) {
      prisma.joinedClass.create({
        data: {
          accountId: accountId,
        },
      });
    } else if (joinedClassExists != null) {
      session.classJoined = true;
    }
  },
  async deleteAccount(
    password: string,
    session: Session & Partial<SessionData>
  ) {
    if (!session.account) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Not logged in",
        additionalInformation: "The requesting session is not logged in!",
        expected: true,
      };
      throw err;
    }
    const username = session.account.username;
    const account = await prisma.account.findUnique({
      where: {
        username: username,
      },
    });
    if (!account) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Not logged in",
        additionalInformation:
          "The account requested to be deleted does not exist!",
        expected: true,
      };
      throw err;
    }
    const isPasswordValid = await bcrypt.compare(password, account.password);
    if (!isPasswordValid) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "Invalid credentials",
        expected: true,
      };
      throw err;
    }
    await prisma.account.delete({
      where: {
        username: username,
      },
    });
    session.destroy((err: unknown) => {
      if (err)
        throw err instanceof Error
          ? err
          : new Error("Error destroying session during account deletion");
    });
  },
  async checkUsername(username: string) {
    const accountExists = await prisma.account.findUnique({
      where: { username: username },
    });
    return accountExists != null;
  },
  async joinClass(classcode: string, session: Session & Partial<SessionData>) {
    if (session.classJoined) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Already joined class",
        expected: true,
      };
      throw err;
    }
    if (classcode == process.env.CLASSCODE) {
      session.classJoined = true;
      if (session.account) {
        const accountId = session.account.accountId;
        const joinedClassExists = await prisma.joinedClass.findUnique({
          where: {
            accountId: accountId,
          },
        });
        if (joinedClassExists == null) {
          prisma.joinedClass.create({
            data: {
              accountId: accountId,
            },
          });
        }
      }
      return;
    }
    const err: RequestError = {
      name: "Unauthorized",
      status: 401,
      message: "Invalid classcode",
      expected: true,
    };
    throw err;
  },
};
