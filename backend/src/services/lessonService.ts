const fs = require("fs").promises;
import { RequestError } from "../@types/requestError";
import { cacheExpiration, redisClient } from "../config/constant";
import Lesson from "../models/lessonModel";
import logger from "../utils/logger";

const lessonService = {
  async setLessonData(lessons: { lessonNumber: number, weekDay:number, teamId: number, subjectId: number, room: string, startTime: number, endTime: number}[]) {
    await Lesson.destroy({ truncate: true });

    for (let lesson of lessons) {
      try {
        if ([0, 1, 2, 3, 4].includes(lesson.weekDay)) {
          await Lesson.create({
            lessonNumber: lesson.lessonNumber,
            weekDay: lesson.weekDay as 0 | 1 | 2 | 3 | 4,
            teamId: lesson.teamId,
            subjectId: lesson.subjectId,
            room: lesson.room,
            startTime: lesson.startTime,
            endTime: lesson.endTime
          })
        }
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

    const lessonData = await Lesson.findAll({ raw: true });
    await redisClient.set("lesson_data", JSON.stringify(lessonData), { EX: cacheExpiration });

    try {
      await redisClient.set("lesson_data", JSON.stringify(lessonData), { EX: cacheExpiration });
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

    const lessonData = await Lesson.findAll({ raw: true });

    try {
      await redisClient.set("lesson_data", JSON.stringify(lessonData), { EX: cacheExpiration });
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }

    return lessonData;
  }
}

export default lessonService;
