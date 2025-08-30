import { redisClient, CACHE_KEY_PREFIXES, generateCacheKey } from "../config/redis";
import socketIO from "../config/socket";
import { default as prisma } from "../config/prisma";
import { isValidTeamId, BigIntreplacer, updateCacheData } from "../utils/validateFunctions";
import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";
import logger from "../utils/logger";
import { addHomeworkTypeBody, checkHomeworkTypeBody, deleteHomeworkTypeBody, editHomeworkTypeBody } from "../schemas/homeworkSchema";

const homeworkService = {
  async addHomework(
    reqData: addHomeworkTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { subjectId, content, assignmentDate, submissionDate, teamId } = reqData;
    isValidTeamId(teamId);
    try {
      await prisma.homework.create({
        data: {
          classId: parseInt(session.classId!),
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
        classId: parseInt(session.classId!)
      },
      orderBy: {
        submissionDate: "asc"
      }
    });
    const addHomeworkDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.HOMEWORK, session.classId!);
    await updateCacheData(data, addHomeworkDataCacheKey);
    const io = socketIO.getIO();
    io.emit("updateHomeworkData");
  },

  async checkHomework(reqData: checkHomeworkTypeBody, session: Session & Partial<SessionData>) {
    const { homeworkId, checkStatus } = reqData;

    const accountId = session.account!.accountId;

    await prisma.$transaction(async tx => {
      if (checkStatus === "true") {
        await tx.homeworkCheck.upsert({
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
        await tx.homeworkCheck.deleteMany({
          where: {
            accountId,
            homeworkId
          }
        });
      }
    });

    const io = socketIO.getIO();
    io.emit("updateHomeworkData");
  },

  async deleteHomework(reqData: deleteHomeworkTypeBody, session: Session & Partial<SessionData>) {
    const { homeworkId } = reqData;
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
        classId: parseInt(session.classId!)
      }
    });
    const data = await prisma.homework.findMany({
      where: {
        classId: parseInt(session.classId!)
      },
      orderBy: {
        submissionDate: "asc"
      }
    });
    const deleteHomeworkDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.HOMEWORK, session.classId!);
    await updateCacheData(data, deleteHomeworkDataCacheKey);
    const io = socketIO.getIO();
    io.emit("updateHomeworkData");
  },

  async editHomework(
    reqData: editHomeworkTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { homeworkId, subjectId, content, assignmentDate, submissionDate, teamId } = reqData;
    isValidTeamId(teamId);
    try {
      await prisma.homework.update({
        where: { homeworkId: homeworkId },
        data: {
          classId: parseInt(session.classId!),
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
        classId: parseInt(session.classId!)
      },
      orderBy: {
        submissionDate: "asc"
      }
    });
    const editHomeworkDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.HOMEWORK, session.classId!);
    await updateCacheData(data, editHomeworkDataCacheKey);
    const io = socketIO.getIO();
    io.emit("updateHomeworkData");
  },

  async getHomeworkData(session: Session & Partial<SessionData>) {
    const getHomeworkDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.HOMEWORK, session.classId!);
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
        classId: parseInt(session.classId!)
      },
      orderBy: {
        submissionDate: "asc"
      }
    });

    await updateCacheData(data, getHomeworkDataCacheKey);

    const stringified = JSON.stringify(data, BigIntreplacer);
    return JSON.parse(stringified);
  },

  async getHomeworkCheckedData(session: Session & Partial<SessionData>) {
    const accountId = session.account!.accountId;

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
