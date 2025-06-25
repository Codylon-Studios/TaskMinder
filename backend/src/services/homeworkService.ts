import { connectRedis, redisClient, CACHE_KEY_PREFIXES, generateCacheKey } from "../config/redis";
import socketIO from "../config/socket";
import prisma from "../config/prisma";
import { isValidTeamId, BigIntreplacer, updateCacheData } from "../utils/validateFunctions";
import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";
import logger from "../utils/logger";

connectRedis();

const homeworkService = {
  async addHomework(
    reqData: {
      subjectId: number;
      content: string;
      assignmentDate: number;
      submissionDate: number;
      teamId: number;
    },
    session: Session & Partial<SessionData>
  ) {
    const { subjectId, content, assignmentDate, submissionDate, teamId } = reqData;
    if (!session.account) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged in",
        expected: true
      };
      throw err;
    }
    if (!session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged into class",
        expected: true
      };
      throw err;
    }
    isValidTeamId(teamId);
    try {
      await prisma.homework.create({
        data: {
          classId: parseInt(session.classId),
          content: content,
          subjectId: subjectId,
          assignmentDate: assignmentDate,
          submissionDate: submissionDate,
          teamId: teamId
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
    const data = await prisma.homework.findMany({
      where: {
        classId: parseInt(session.classId)
      },
      orderBy: {
        submissionDate: "asc"
      }
    });
    const addHomeworkDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.HOMEWORK, session.classId);
    await updateCacheData(data, addHomeworkDataCacheKey);
    const io = socketIO.getIO();
    io.emit("updateHomeworkData");
  },

  async checkHomework(reqData: { homeworkId: number; checkStatus: string }, session: Session & Partial<SessionData>) {
    const { homeworkId, checkStatus } = reqData;
    let accountId;
    if (!session.account) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged in",
        expected: true
      };
      throw err;
    }
    if (!session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged into class",
        expected: true
      };
      throw err;
    }
    else {
      accountId = session.account.accountId;
    }
    if (checkStatus === "true") {
      await prisma.homeworkCheck.upsert({
        where: {
          accountId_homeworkId: {
            accountId, 
            homeworkId 
          }
        },
        update: {},
        create: {
          accountId,
          homeworkId
        }
      });
    }
    else {
      await prisma.homeworkCheck.deleteMany({
        where: {
          accountId: accountId,
          homeworkId: homeworkId
        }
      });
    }
    const io = socketIO.getIO();
    io.emit("updateHomeworkData");
  },

  async deleteHomework(homeworkId: number, session: Session & Partial<SessionData>) {
    if (!session.account) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged in",
        expected: true
      };
      throw err;
    }
    if (!session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged into class",
        expected: true
      };
      throw err;
    }
    if (!homeworkId) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid data format",
        expected: true
      };
      throw err;
    }
    await prisma.homework.delete({
      where: {
        homeworkId: homeworkId,
        classId: parseInt(session.classId)
      }
    });
    const data = await prisma.homework.findMany({
      where: {
        classId: parseInt(session.classId)
      },
      orderBy: {
        submissionDate: "asc"
      }
    });
    const deleteHomeworkDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.HOMEWORK, session.classId);
    await updateCacheData(data, deleteHomeworkDataCacheKey);
    const io = socketIO.getIO();
    io.emit("updateHomeworkData");
  },

  async editHomework(
    reqData: {
      homeworkId: number;
      subjectId: number;
      content: string;
      assignmentDate: number;
      submissionDate: number;
      teamId: number;
    },
    session: Session & Partial<SessionData>
  ) {
    const { homeworkId, subjectId, content, assignmentDate, submissionDate, teamId } = reqData;
    if (!session.account) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged in",
        expected: true
      };
      throw err;
    }
    if (!session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged into class",
        expected: true
      };
      throw err;
    }
    isValidTeamId(teamId);
    try {
      await prisma.homework.update({
        where: { homeworkId: homeworkId },
        data: {
          classId: parseInt(session.classId),
          content: content,
          subjectId: subjectId,
          assignmentDate: assignmentDate,
          submissionDate: submissionDate,
          teamId: teamId
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

    const data = await prisma.homework.findMany({
      where: {
        classId: parseInt(session.classId)
      },
      orderBy: {
        submissionDate: "asc"
      }
    });
    const editHomeworkDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.HOMEWORK, session.classId);
    await updateCacheData(data, editHomeworkDataCacheKey);
    const io = socketIO.getIO();
    io.emit("updateHomeworkData");
  },

  async getHomeworkData(session: Session & Partial<SessionData>) {
    if (!session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged into class",
        expected: true
      };
      throw err;
    }
    const getHomeworkDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.HOMEWORK, session.classId);
    const cachedHomeworkData = await redisClient.get(getHomeworkDataCacheKey);

    if (cachedHomeworkData) {
      try {
        return JSON.parse(cachedHomeworkData);
      }
      catch (error) {
        logger.error("Error parsing Redis data:", error);
        throw new Error();
      }
    }

    const data = await prisma.homework.findMany({
      where: {
        classId: parseInt(session.classId)
      },
      orderBy: {
        submissionDate: "asc"
      }
    });

    await updateCacheData(data, getHomeworkDataCacheKey);

    return JSON.stringify(data, BigIntreplacer);
  },

  async getHomeworkCheckedData(session: Session & Partial<SessionData>) {
    let accountId;
    if (!session.account) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged in",
        expected: true
      };
      throw err;
    }
    if (!session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged into class",
        expected: true
      };
      throw err;
    }
    else {
      accountId = session.account.accountId;
    }
    const homework = await prisma.homeworkCheck.findMany({
      where: { accountId: accountId },
      select: {
        homeworkId: true
      }
    });

    const homeworkIds = homework.map(homework => {
      return homework.homeworkId;
    });

    return homeworkIds;
  }
};

export default homeworkService;
