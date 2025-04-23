const redis = require('redis');
const logger = require('../../logger');
const cacheKeyHomeworkData = 'homework_data';
const cacheKeySubstitutionsData = 'substitutions_data';
const cacheExpiration = 3600;
const redisUrl = process.env.NODE_ENV === 'DEVELOPMENT' 
    ? `redis://localhost:6379`  // Use localhost for development (if running on host machine)
    : `redis://redis:6379`;     // Use the Docker service name for production
const redisClient = redis.createClient({
  url: redisUrl,
});
redisClient.on('error', (err) => logger.error('Redis error:', err));

//REDIS Connect
const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      logger.success('Connected to Redis');
    }
  } catch (err) {
    logger.error('Error connecting to Redis:', err);
    throw err;
  }
};

//REDIS Disconnect
const disconnectRedis = async () => {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      logger.success('Disconnected from Redis');
    }
  } catch (err) {
    logger.error('Error disconnecting from Redis:', err);
    throw err;
  }
};

module.exports = {redisClient, connectRedis, disconnectRedis, cacheKeyHomeworkData, cacheKeySubstitutionsData, cacheExpiration};
