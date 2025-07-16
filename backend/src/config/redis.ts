import { createClient } from "redis";
import logger from "../utils/logger";

export const CACHE_KEY_PREFIXES = {
  HOMEWORK: "homework_data",
  EVENT: "event_data",
  SUBSTITUTIONS: "substitutions_data",
  LESSON: "lesson_data",
  EVENTTYPE: "event_type_data",
  EVENTTYPESTYLE: "event_type_styles",
  SUBJECT: "subject_data",
  TEAMS: "teams_data"
};

export const generateCacheKey = (baseKey: string, classId: string) => {
  if (!baseKey || !classId) {
    logger.error("Base Key or/and ClassId missing to generate redis cache key");
    throw new Error();
  }
  return `${baseKey}:${classId}`;
};

export const cacheExpiration = 3600;
export const STALE_THRESHOLD_MS = 10 * 60 * 1000;

const redisHost = process.env.NODE_ENV === "DEVELOPMENT" ? "localhost" : "redis";
const redisPort = process.env.REDIS_PORT || "6379";
const redisUrl = `redis://${redisHost}:${redisPort}`;

export const redisClient = createClient({
  url: redisUrl
});
redisClient.on("error", (err: unknown) =>
  err instanceof Error ? logger.error("Redis error:", err) : logger.error("Unknown Redis error!")
);

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
  }
  catch (err: unknown) {
    if (err instanceof Error) {
      logger.error("Error disconnecting from Redis:", err);
      throw err;
    }
    logger.error("Unknown error disconnecting from Redis!");
    throw new Error();
  }
};
