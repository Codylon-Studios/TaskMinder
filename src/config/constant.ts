import { createClient } from "redis";
import logger from "../logger";
export const cacheKeyHomeworkData = "homework_data";
export const cacheKeySubstitutionsData = "substitutions_data";
export const cacheExpiration = 3600;
const redisUrl = process.env.NODE_ENV === "DEVELOPMENT" 
    ? `redis://localhost:6379`  // Use localhost for development (if running on host machine)
    : `redis://redis:6379`;     // Use the Docker service name for production
export const redisClient = createClient({
  url: redisUrl,
});
redisClient.on("error", (err: unknown) => (err instanceof Error) ? logger.error("Redis error:", err) : logger.error("Unknown Redis error!"));

//REDIS Connect
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

//REDIS Disconnect
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

export default {redisClient, connectRedis, disconnectRedis, cacheKeyHomeworkData, cacheKeySubstitutionsData, cacheExpiration};
