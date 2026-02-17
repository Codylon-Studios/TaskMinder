import { redisClient, CACHE_KEY_PREFIXES, generateCacheKey } from "../config/redis";
import socketIO, { SOCKET_EVENTS } from "../config/socket";
import { default as prisma } from "../config/prisma";
import { isValidTeamId, BigIntreplacer, updateCacheData, isValidSubjectId, invalidateCache } from "../utils/validate.functions";
import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";
import logger from "../config/logger";
import { 
  addHomeworkTypeBody, 
  checkHomeworkTypeBody, 
  deleteHomeworkTypeBody, 
  editHomeworkTypeBody, 
  pinHomeworkTypeBody 
} from "../schemas/homework.schema";
import { Prisma } from "@prisma/client";

const homeworkService = {
  async addHomework(
    reqData: addHomeworkTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { subjectId, content, assignmentDate, submissionDate, teamId } = reqData;
    await isValidSubjectId(subjectId, session);
    await isValidTeamId(teamId, session);
    try {
      await prisma.homework.create({
        data: {
          classId: parseInt(session.classId!),
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
    catch {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid data format",
        expected: true
      };
      throw err;
    }

    // invalidate cache
    await invalidateCache("HOMEWORK", session.classId!);
    // send socket update
    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.HOMEWORK);
  },

  async checkHomework(reqData: checkHomeworkTypeBody, session: Session & Partial<SessionData>) {
    const { homeworkId, checkStatus } = reqData;

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
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.HOMEWORK_CHECK);
  },

  async deleteHomework(reqData: deleteHomeworkTypeBody, session: Session & Partial<SessionData>) {
    const { homeworkId } = reqData;

    const deleted = await prisma.homework.deleteMany({
      where: {
        homeworkId: homeworkId,
        classId: parseInt(session.classId!, 10)
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
    await invalidateCache("HOMEWORK", session.classId!);
    // send socket update
    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.HOMEWORK);
  },

  async editHomework(
    reqData: editHomeworkTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { homeworkId, subjectId, content, assignmentDate, submissionDate, teamId } = reqData;
    await isValidSubjectId(subjectId, session);
    await isValidTeamId(teamId, session);
    try {
      const updated = await prisma.homework.updateMany({
        where: {
          homeworkId: homeworkId,
          classId: parseInt(session.classId!, 10)
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
    catch (e) {
      if ((e as RequestError)?.expected) throw e;

      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid data format",
        expected: true
      };
      throw err;
    }

    // invalidate cache
    await invalidateCache("HOMEWORK", session.classId!);
    // send socket update
    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.HOMEWORK);
  },

  async getHomeworkData(session: Session & Partial<SessionData>) {
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
        classId: parseInt(session.classId!)
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

  async pinHomework(reqData: pinHomeworkTypeBody, session: Session & Partial<SessionData>) {
    const { homeworkId, pinStatus } = reqData;

    const existingHomework = await prisma.homework.findFirst({
      where: {
        homeworkId: homeworkId,
        classId: parseInt(session.classId!, 10)
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

    await invalidateCache("HOMEWORK", session.classId!);
    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.HOMEWORK);
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
