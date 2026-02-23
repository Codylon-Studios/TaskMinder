import { redisClient, CACHE_KEY_PREFIXES, generateCacheKey } from "../config/redis.js";
import socketIO, { SOCKET_EVENTS } from "../config/socket.js";
import { default as prisma } from "../config/prisma.js";
import { isValidTeamId, BigIntreplacer, updateCacheData, isValidSubjectId, invalidateCache } from "../utils/validate.functions.js";
import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError.js";
import logger from "../config/logger.js";
import { 
  editHomeworkTypeParams,
  deleteHomeworkTypeParams,
  checkHomeworkTypeParams,
  pinHomeworkTypeParams,
  addHomeworkTypeBody, 
  editHomeworkTypeBody, 
  checkHomeworkTypeBody, 
  pinHomeworkTypeBody
} from "../schemas/homework.schema.js";
import { Prisma } from "@prisma/client";

const homeworkService = {
  async addHomework(
    reqBody: addHomeworkTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { subjectId, content, assignmentDate, submissionDate, teamId } = reqBody;
    // always use classId instead of session.classId
    // since session.classId can change during concurrent requests
    const classId = parseInt(session.classId!, 10);
    await isValidSubjectId(subjectId, session);
    await isValidTeamId(teamId, session);
    try {
      await prisma.homework.create({
        data: {
          classId,
          isPinned: false,
          content: content,
          subjectId: subjectId,
          assignmentDate: assignmentDate,
          submissionDate: submissionDate,
          teamId: teamId,
          createdAt: BigInt(Date.now())
        }
      });
    }
    catch (err) {
      if (err instanceof Prisma.PrismaClientValidationError) {
        const reqErr: RequestError = {
          name: "Bad Request",
          status: 400,
          message: "Invalid data format",
          expected: true
        };
        throw reqErr;
      }

      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        const reqErr: RequestError = {
          name: "Bad Request",
          status: 400,
          message: "Invalid relation reference",
          expected: true
        };
        throw reqErr;
      }

      logger.error(`addHomework failed with unexpected database error: ${err}`);
      throw err;
    }

    // invalidate cache
    await invalidateCache("HOMEWORK", classId.toString());
    // send socket update
    const io = socketIO.getIO();
    io.to(`class:${classId}`).emit(SOCKET_EVENTS.HOMEWORK);
  },

  async checkHomework(reqParams: checkHomeworkTypeParams, reqBody: checkHomeworkTypeBody, session: Session & Partial<SessionData>) {
    const { checkStatus } = reqBody;
    const { id: homeworkId } = reqParams;

    const accountId = session.account!.accountId;
    const classId = parseInt(session.classId!, 10);

    const homework = await prisma.homework.findFirst({
      where: { homeworkId, classId },
      select: { homeworkId: true, teamId: true }
    });

    if (!homework) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Homework not found",
        expected: true
      };
      throw err;
    }

    await isValidTeamId(homework.teamId, session);

    await prisma.$transaction(async tx => {
      if (checkStatus) {
        await tx.homeworkCheck.upsert({
          where: {
            accountId_homeworkId: { accountId, homeworkId }
          },
          create: {
            accountId,
            homeworkId,
            createdAt: BigInt(Date.now())
          },
          update: {} // no-op update
        });
      } 
      else {
        await tx.homeworkCheck.deleteMany({
          where: { accountId, homeworkId }
        });
      }
    });

    const io = socketIO.getIO();
    io.to(`class:${classId}`).emit(SOCKET_EVENTS.HOMEWORK_CHECK);
  },

  async deleteHomework(reqParams: deleteHomeworkTypeParams, session: Session & Partial<SessionData>) {
    const { id: homeworkId } = reqParams;
    // always use classId instead of session.classId
    // since session.classId can change during concurrent requests
    const classId = parseInt(session.classId!, 10);

    const deleted = await prisma.homework.deleteMany({
      where: {
        homeworkId: homeworkId,
        classId
      }
    });

    if (deleted.count === 0) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Homework not found",
        expected: true
      };
      throw err;
    }

    // invalidate cache
    await invalidateCache("HOMEWORK", classId.toString());
    // send socket update
    const io = socketIO.getIO();
    io.to(`class:${classId}`).emit(SOCKET_EVENTS.HOMEWORK);
  },

  async editHomework(
    reqParams: editHomeworkTypeParams,
    reqBody: editHomeworkTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { subjectId, content, assignmentDate, submissionDate, teamId } = reqBody;
    const { id: homeworkId } = reqParams;
    // always use classId instead of session.classId
    // since session.classId can change during concurrent requests
    const classId = parseInt(session.classId!, 10);
    await isValidSubjectId(subjectId, session);
    await isValidTeamId(teamId, session);
    try {
      const updated = await prisma.homework.updateMany({
        where: {
          homeworkId: homeworkId,
          classId
        },
        data: {
          content: content,
          subjectId: subjectId,
          assignmentDate: assignmentDate,
          submissionDate: submissionDate,
          teamId: teamId
        }
      });

      // if affected rows is 0 -> throw error
      if (updated.count === 0) {
        const err: RequestError = {
          name: "Not Found",
          status: 404,
          message: "Homework not found for update",
          expected: true
        };
        throw err;
      }
    }
    catch (err) {
      if ((err as RequestError)?.expected) throw err;

      if (err instanceof Prisma.PrismaClientValidationError) {
        const reqErr: RequestError = {
          name: "Bad Request",
          status: 400,
          message: "Invalid data format",
          expected: true
        };
        throw reqErr;
      }

      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        const reqErr: RequestError = {
          name: "Bad Request",
          status: 400,
          message: "Invalid relation reference",
          expected: true
        };
        throw reqErr;
      }

      logger.error(`editHomework failed with unexpected database error: ${err}`);
      throw err;
    }

    // invalidate cache
    await invalidateCache("HOMEWORK", classId.toString());
    // send socket update
    const io = socketIO.getIO();
    io.to(`class:${classId}`).emit(SOCKET_EVENTS.HOMEWORK);
  },

  async getHomeworkData(session: Session & Partial<SessionData>) {
    // always use classId instead of session.classId
    // since session.classId can change during concurrent requests
    const classId = parseInt(session.classId!, 10);
    const getHomeworkDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.HOMEWORK, session.classId!);
    const cachedHomeworkData = await redisClient.get(getHomeworkDataCacheKey);

    if (cachedHomeworkData) {
      try {
        return JSON.parse(cachedHomeworkData);
      }
      catch (error) {
        logger.error(`Error parsing Redis data: ${error}`);
        // fall through to prevent crashes and rely on DB
      }
    }

    const data = await prisma.homework.findMany({
      where: {
        classId
      },
      orderBy: [
        { isPinned: "desc" },
        { submissionDate: "asc" },
        { assignmentDate: "asc" },
        { subjectId: "asc" },
        { content: "asc" }
      ]
    });

    await updateCacheData(data, getHomeworkDataCacheKey);

    const stringified = JSON.stringify(data, BigIntreplacer);
    return JSON.parse(stringified);
  },

  async pinHomework(reqParams: pinHomeworkTypeParams, reqBody: pinHomeworkTypeBody, session: Session & Partial<SessionData>) {
    // always use classId instead of session.classId
    // since session.classId can change during concurrent requests
    const classId = parseInt(session.classId!, 10);
    const { pinStatus } = reqBody;
    const { id: homeworkId } = reqParams;

    const existingHomework = await prisma.homework.findFirst({
      where: {
        homeworkId: homeworkId,
        classId
      },
      select: {
        teamId: true
      }
    });

    if (!existingHomework) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Homework not found",
        expected: true
      };
      throw err;
    }

    await isValidTeamId(existingHomework.teamId, session);

    try {
      await prisma.homework.update({
        where: {
          homeworkId: homeworkId
        },
        data: {
          isPinned: pinStatus
        }
      });
    }
    catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        const reqErr: RequestError = {
          name: "Not Found",
          status: 404,
          message: "Homework not found",
          expected: true
        };
        throw reqErr;
      }
      throw err;
    }

    await invalidateCache("HOMEWORK", classId.toString());
    const io = socketIO.getIO();
    io.to(`class:${classId}`).emit(SOCKET_EVENTS.HOMEWORK);
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
