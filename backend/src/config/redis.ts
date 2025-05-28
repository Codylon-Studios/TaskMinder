import { createClient } from "redis";
import logger from "../utils/logger";

export const cacheKeyHomeworkData = "homework_data";
export const cacheKeySubstitutionsData = "substitutions_data";
export const cacheKeyEventData = "event_data";
export const cacheKeyLessonData = "lesson_data";
export const cacheKeyEventTypeData = "event_type_data";
export const cacheKeySubjectData = "subject_data";
export const cacheKeyTeamData = "teams_data";
export const cacheExpiration = 3600;

const redisHost = process.env.NODE_ENV === "DEVELOPMENT" ? "localhost" : "redis";
const redisPort = process.env.REDIS_PORT || "6379";
const redisUrl = `redis://${redisHost}:${redisPort}`;

export const redisClient = createClient({
  url: redisUrl,
});
redisClient.on("error", (err: unknown) => (err instanceof Error) ? logger.error("Redis error:", err) : logger.error("Unknown Redis error!"));


export const connectRedis = async (): Promise<void> => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      logger.success("Connected to Redis");
    }
  }
  catch (err: unknown) {
    if (err instanceof Error) {
      logger.error("Error connecting to Redis:", err);
      throw err;
    }
    logger.error("Unknown error connecting to Redis!");
    throw new Error();
  }
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      logger.success("Disconnected from Redis");
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      logger.error("Error disconnecting from Redis:", err);
      throw err;
    }
    logger.error("Unknown error disconnecting from Redis!");
    throw new Error();
  }
};
