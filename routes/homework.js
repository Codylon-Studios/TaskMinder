const { withDB, connectRedis, redisClient, cacheKeyHomework } = require('./constant');
const express = require('express');
const router = express.Router();

connectRedis();

const updateRedisCache = async (data, expiration = 3600) => {
  try {
    await redisClient.set(cacheKeyHomework, JSON.stringify(data), { EX: expiration });
    console.log('Data cached successfully in Redis');
  } catch (err) {
    console.error('Error updating Redis cache:', err);
  }
};

// addHA route
router.post('/addhomework', async (req, res) => {
  const { subjectID, content, assignmentDate, submissionDate} = req.body;

  try {
    await withDB(async (client) => {
      await client.query(
        'INSERT INTO hausaufgaben10d (content, subject_id, assignment_date, submission_date) VALUES ($1, $2, $3, $4)',
        [content, subjectID, assignmentDate, submissionDate]
      );
    });

    const result = await withDB((client) => client.query('SELECT * FROM hausaufgaben10d'));
    const data = result.rows;

    await updateRedisCache(data);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error while adding and storing hausaufgaben data:', error);
    res.status(500).send('1');
  }
});

// deleteHA route
router.post('/deletehomework', async (req, res) => {
  const { id } = req.body;

  try {
    await withDB(async (client) => {
      await client.query('DELETE FROM hausaufgaben10d WHERE ha_id = $1', [id]);
    });

    const result = await withDB((client) => client.query('SELECT * FROM hausaufgaben10d'));
    const data = result.rows;

    await updateRedisCache(data, 7200); 
    res.status(200).json(data);
  } catch (error) {
    console.error('Error while deleting hausaufgaben data:', error);
    res.status(500).send('1');
  }
});

// editHA route
router.post('/edithomework', async (req, res) => {
  const { id, subjectID, content, assignmentDate, submissionDate} = req.body;

  try {
    await withDB(async (client) => {
      await client.query(
        'UPDATE hausaufgaben10d SET content = $1, subject = $2, assignment_date = $3, submission_date = $4 WHERE ha_id = $5',
        [content, subjectID, assignmentDate, submissionDate, id]
      );
    });

    const result = await withDB((client) => client.query('SELECT * FROM hausaufgaben10d'));
    const data = result.rows;

    await updateRedisCache(data, 7200);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error while editing and storing hausaufgaben data:', error);
    res.status(500).send('1');
  }
});

// fetchHA route
router.get('/fetchhomework', async (req, res) => {
  try {
    const cachedDataHomeWork = await redisClient.get(cacheKeyHomework);

    if (cachedDataHomeWork) {
      console.log('Serving data from Redis cache');
      return res.status(200).json(JSON.parse(cachedDataHomeWork));
    }

    const result = await withDB((client) => client.query('SELECT * FROM hausaufgaben10d'));
    const data = result.rows;

    await updateRedisCache(data, 7200);
    res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
module.exports = router;
