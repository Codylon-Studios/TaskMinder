import { RequestError } from "../@types/requestError";
import { CACHE_KEY_PREFIXES, generateCacheKey, redisClient } from "../config/redis";
import prisma from "../config/prisma";
import logger from "../utils/logger";
import { isValidweekDay, BigIntreplacer, updateCacheData } from "../utils/validateFunctions";
import { Session, SessionData } from "express-session";

const lessonService = {
  async setLessonData(
    lessons: {
      lessonNumber: number;
      weekDay: number;
      teamId: number;
      subjectId: number;
      room: string;
      startTime: number;
      endTime: number;
    }[],
    session: Session & Partial<SessionData>
  ) {
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
    const classExists = await prisma.class.findUnique({
      where: {
        classId: parseInt(session.classId)
      }
    });

    if (!classExists){
      delete session.classId;
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "No class mapped to session.classId, deleting classId from session",
        expected: true
      };
      throw err;
    }
    for (const lesson of lessons) {
      isValidweekDay(lesson.weekDay);
    }

    await prisma.lesson.deleteMany({
      where: {
        classId: parseInt(session.classId)
      }
    });

    for (const lesson of lessons) {
      try {
        await prisma.lesson.create({
          data: {
            classId: parseInt(session.classId),
            lessonNumber: lesson.lessonNumber,
            weekDay: lesson.weekDay as 0 | 1 | 2 | 3 | 4,
            teamId: lesson.teamId,
            subjectId: lesson.subjectId,
            room: lesson.room,
            startTime: lesson.startTime,
            endTime: lesson.endTime
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

    const lessonData = await prisma.lesson.findMany({
      where: {
        classId: parseInt(session.classId)
      }
    });

    const setLessonDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.LESSON, session.classId);

    try {
      await updateCacheData(lessonData, setLessonDataCacheKey);
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
  },
  async getLessonData(session: Session & Partial<SessionData>) {
    if (!session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged into class",
        expected: true
      };
      throw err;
    }
    const classExists = await prisma.class.findUnique({
      where: {
        classId: parseInt(session.classId)
      }
    });

    if (!classExists){
      delete session.classId;
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "No class mapped to session.classId, deleting classId from session",
        expected: true
      };
      throw err;
    }
    const getLessonDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.LESSON, session.classId);
    const cachedLessonData = await redisClient.get(getLessonDataCacheKey);

    if (cachedLessonData) {
      try {
        return JSON.parse(cachedLessonData);
      }
      catch (error) {
        logger.error("Error parsing Redis data:", error);
        throw new Error();
      }
    }

    const lessonData = await prisma.lesson.findMany({
      where: {
        classId: parseInt(session.classId)
      }
    });

    try {
      await updateCacheData(lessonData, getLessonDataCacheKey);
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }

    return JSON.stringify(lessonData, BigIntreplacer);
  }
};

export default lessonService;
