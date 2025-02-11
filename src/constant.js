const redis = require('redis');
const cacheKeyHomeworkData = 'homework_data';
const cacheKeyHomeworkCheckedData = 'homework_checked_data';
const cacheKeySubstitutionsData = 'substitutions_data';
const cacheExpiration = 3600;
const redisClient = redis.createClient({
  url: 'redis://localhost:6379',
});
redisClient.on('error', (err) => console.error('Redis error:', err));

//REDIS Connect
const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log('Connected to Redis');
    }
  } catch (err) {
    console.error('Error connecting to Redis:', err);
    throw err;
  }
};

//REDIS Disconnect
const disconnectRedis = async () => {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      console.log('Disconnected from Redis');
    }
  } catch (err) {
    console.error('Error disconnecting from Redis:', err);
    throw err;
  }
};

module.exports = {redisClient, connectRedis, disconnectRedis, cacheKeyHomeworkData, cacheKeyHomeworkCheckedData, cacheKeySubstitutionsData, cacheExpiration};
