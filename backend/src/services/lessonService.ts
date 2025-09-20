import { RequestError } from "../@types/requestError";
import { CACHE_KEY_PREFIXES, generateCacheKey, redisClient } from "../config/redis";
import { default as prisma } from "../config/prisma";
import logger from "../utils/logger";
import { isValidweekDay, BigIntreplacer, updateCacheData } from "../utils/validateFunctions";
import { Session, SessionData } from "express-session";
import { setLessonDataTypeBody } from "../schemas/lessonSchema";

const lessonService = {
  async setLessonData(
    reqData: setLessonDataTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { lessons } = reqData;
    for (const lesson of lessons) {
      isValidweekDay(lesson.weekDay);
    }

    const classId = parseInt(session.classId!);
    if (isNaN(classId)) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid classId in session",
        expected: true
      };
      throw err;
    }

    await prisma.$transaction(async tx => {
      await tx.lesson.deleteMany({
        where: {
          classId: classId
        }
      });
    
      for (const lesson of lessons) {
        try {
          await tx.lesson.create({
            data: {
              classId: classId,
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
    });
    

    const lessonData = await prisma.lesson.findMany({
      where: {
        classId: parseInt(session.classId!)
      }
    });

    const setLessonDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.LESSON, session.classId!);

    try {
      await updateCacheData(lessonData, setLessonDataCacheKey);
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
  },
  async getLessonData(session: Session & Partial<SessionData>) {
    const getLessonDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.LESSON, session.classId!);
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
        classId: parseInt(session.classId!)
      }
    });

    try {
      await updateCacheData(lessonData, getLessonDataCacheKey);
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }

    const stringified = JSON.stringify(lessonData, BigIntreplacer);
    return JSON.parse(stringified);
  }
};

export default lessonService;
