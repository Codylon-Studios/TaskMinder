const fs = require('fs');
const { Pool } = require('pg');
const redis = require('redis');

const saltRounds = 10;
const cacheKeyHomework = 'homework_data';

const redisClient = redis.createClient({
  url: 'redis://localhost:6379',
});
redisClient.on('error', (err) => console.error('Redis error:', err));

const dbConfig = JSON.parse(fs.readFileSync('db_config.json'));
const pool = new Pool(dbConfig);


const withDB = async (callback) => {
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
};

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

module.exports = {withDB, saltRounds, redisClient, connectRedis, disconnectRedis, cacheKeyHomework};