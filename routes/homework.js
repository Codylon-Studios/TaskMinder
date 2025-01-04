const { withDB, connectRedis, redisClient, cacheKey} = require('./constant');
const express = require('express');
const router = express.Router();

connectRedis();

// addHA route
router.post('/addhomework', async (req, res) => {
  const { subject, content, issueDate, targetDate, author } = req.body;
  //update haNote database
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

// deleteHA route
router.post('/deletehomework', async (req, res) => {
  const { id, subject, content, issueDate, targetDate, author } = req.body;
  //delete haNote to database
  try {
    await withDB(async (client) => {
      await client.query(
        'DELETE FROM hausaufgaben10d WHERE ha_id = $1', [id]);
    });
    //retrieve all HANotes from the database
    const result = await withDB(async (client) => {
      return client.query('SELECT * FROM hausaufgaben10d');
    });
    const data = result.rows;
    // Save data to Redis cache
    await redisClient.set(cacheKey, JSON.stringify(data), { EX: 3600*2 }); // Cache expires in 2 hours
    console.log('Data cached successfully in Redis');

    // Send response
    res.status(200).json(data);
  } catch (error) {
    console.error('Error while deleting hausaufgaben data:', error);
    res.status(500).send('1');  // Internal server error
  }

});

// editHA route
router.post('/edithomework', async (req, res) => {
  const { id, subject, content, issueDate, targetDate, author } = req.body;
  //store haNote to database
  try {
    await withDB(async (client) => {
      await client.query(
        'UPDATE hausaufgaben10d SET content = $1, subject = $2, targetDate = $3, issueDate = $4, author = $5 WHERE ha_id = $6',
        [content, subject, targetDate, issueDate, author, id]
    );
    });
    //retrieve all HANotes from the database
    const result = await withDB(async (client) => {
      return client.query('SELECT * FROM hausaufgaben10d');
    });
    const data = result.rows;
    // Save data to Redis cache
    await redisClient.set(cacheKey, JSON.stringify(data), { EX: 3600*2 }); // Cache expires in 2 hours
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
      console.log(cachedData);
      return res.status(200).json(JSON.parse(cachedData));
    }

    //If not in cache, retrieve from database
    const result = await withDB(async (client) => {
      return client.query('SELECT * FROM hausaufgaben10d');
    });
    const data = result.rows;


    // Save data to Redis cache
    await redisClient.set(cacheKey, JSON.stringify(data), { EX: 3600*2 }); // Cache expires in 2 hours
    console.log('Data cached successfully in Redis');
    console.log(data);

    // Send response
    res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching data:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
module.exports = router;

