const fs = require("fs").promises;
import { RequestError } from "../@types/requestError";
import { cacheKeyLessonData, redisClient } from "../config/redis";
import prisma from "../config/prisma";
import logger from "../utils/logger";
import { isValidweekDay, BigIntreplacer, updateCacheData } from "../utils/validateFunctions";


const lessonService = {
  async setLessonData(lessons: { lessonNumber: number, weekDay:number, teamId: number, subjectId: number, room: string, startTime: number, endTime: number}[]) {
    for (let lesson of lessons) {
      isValidweekDay(lesson.weekDay);
    }
    await prisma.$executeRaw`TRUNCATE TABLE "lesson" RESTART IDENTITY;`;
    for (let lesson of lessons) {
      try {
          await prisma.lesson.create({
            data: {
              lessonNumber: lesson.lessonNumber,
              weekDay: lesson.weekDay as 0 | 1 | 2 | 3 | 4,
              teamId: lesson.teamId,
              subjectId: lesson.subjectId,
              room: lesson.room,
              startTime: lesson.startTime,
              endTime: lesson.endTime
            }
          })
        }
      catch {
        let err: RequestError = {
          name: "Bad Request",
          status: 400,
          message: "Invalid data format",
          expected: true,
        }
        throw err;
      }
    }
    const lessonData = await prisma.lesson.findMany();

    try {
      await updateCacheData(lessonData, cacheKeyLessonData);
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
  },
  async getLessonData() {
    const cachedLessonData = await redisClient.get("lesson_data");
    
    if (cachedLessonData) {
      try {
        return JSON.parse(cachedLessonData);
      } catch (error) {
        logger.error("Error parsing Redis data:", error);
        throw new Error();
      }
    }

    const lessonData = await prisma.lesson.findMany();

    try {
      await updateCacheData(lessonData, cacheKeyLessonData);
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }

    return JSON.stringify(lessonData, BigIntreplacer);
  }
}

export default lessonService;
