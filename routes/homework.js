const { withDB, connectRedis, redisClient, disconnectRedis } = require('./constant');
const express = require('express');
const router = express.Router();

connectRedis();
const cacheKey = 'homework_data';

// addHA route
router.post('/addhomework', async (req, res) => {
  const { subject, content, issueDate, targetDate, author } = req.body;
  //store haNote to database
  try {
    await withDB(async (client) => {
      await client.query('INSERT INTO hausaufgaben10d (content, subject, targetDate, issueDate, author) VALUES ($1, $2, $3, $4, $5)', [content, subject, targetDate, issueDate, author]);
    });
    //retrieve all HANotes from the database
    const result = await withDB(async (client) => {
      return client.query('SELECT * FROM hausaufgaben10d');
    });
    const data = result.rows;
    // Save data to Redis cache
    await redisClient.set(cacheKey, JSON.stringify(data), { EX: 3600 }); // Cache expires in 1 hour
    console.log('Data cached successfully in Redis');

    // Send response
    res.status(200).json(data);
  } catch (error) {
    console.error('Error while storing hausaufgaben data:', error);
    res.status(500).send('1');  // Internal server error
  }

});

//fetchHA route
router.get('/fetchhomework', async (req, res) => {

  try {
    // Check if data exists in Redis cache
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log('Serving data from Redis cache');
      return res.status(200).json(JSON.parse(cachedData));
    }

    //If not in cache, retrieve from database
    const result = await withDB(async (client) => {
      return client.query('SELECT * FROM hausaufgaben10d');
    });
    const data = result.rows;


    // Save data to Redis cache
    await redisClient.set(cacheKey, JSON.stringify(data), { EX: 3600 }); // Cache expires in 1 hour
    console.log('Data cached successfully in Redis');

    // Send response
    res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching data:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;

