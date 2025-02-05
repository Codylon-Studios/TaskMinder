const { withDB, connectRedis, redisClient, cacheKeyHomeworkData, cacheKeyHomeworkCheckedData, cacheExpiration } = require('./constant');
const express = require('express');
const router = express.Router();

connectRedis();

function changeKeys(data) {
  let changedData = [];
  for (let row in data) {
    changedData.push({});
    for (let key in data[row]) {
      let newKey;
      switch (key) {
        case "homeworkid":
          newKey = "homeworkId";
          break;
        case "subjectid":
          newKey = "subjectId";
          break;
        case "assignmentdate":
          newKey = "assignmentDate";
          break;
        case "submissiondate":
          newKey = "submissionDate";
          break;
        case "checkid":
          newKey = "checkId";
          break;
        default:
          newKey = key;
      }
      changedData[row][newKey] = data[row][key];
    }
  }
  return changedData;
}

async function updateCacheHomeworkData(data) {
  try {
    await redisClient.set(cacheKeyHomeworkData, JSON.stringify(data), { EX: cacheExpiration });
    console.log('Homework data cached successfully in Redis');
  } catch (err) {
    console.error('Error updating Redis cache:', err);
  }
};

async function updateCacheHomeworkCheckedData(data) {
  try {
    await redisClient.set(cacheKeyHomeworkCheckedData, JSON.stringify(data), { EX: cacheExpiration });
    console.log('Homework checked data cached successfully in Redis');
  } catch (err) {
    console.error('Error updating Redis cache:', err);
  }
};

// addHA route
router.post('/add', async (req, res) => {
  const { subjectId, content, assignmentDate, submissionDate} = req.body;

  if (! req.session.user) {
    res.status(200).send('2');
    return;
  }

  if ([ subjectId, content, assignmentDate, submissionDate ].includes("")) {
    console.log("Empty information while adding homework")
    res.status(200).send("1");
    return;
  }

  try {
    await withDB(async (client) => {
      await client.query(
        'INSERT INTO homework10d (content, subjectId, assignmentDate, submissionDate) VALUES ($1, $2, $3, $4)',
        [content, subjectId, assignmentDate, submissionDate]
      );
    });
    

    const result = await withDB((client) => client.query('SELECT * FROM homework10d'));
    const data = result.rows;

    await updateCacheHomeworkData(changeKeys(data));
    res.status(200).send('0');
  } catch (error) {
    console.error('Error while adding and storing hausaufgaben data:', error);
    res.status(500).send('1');
  }
});

router.post('/check', async (req, res)=> {
  const {homeworkId, checkStatus} = req.body;
  let username
  console.log(checkStatus)

  if (! req.session.user) {
    res.status(200).send('2');
    return;
  }
  else {
    username = req.session.user.username;
  }
  
  try {
    await withDB(async (client) => {
      await withDB(async (client) => {
        await client.query('DELETE FROM homework10dCheck WHERE homeworkId = $1 AND username = $2',
          [homeworkId, username]
        );
      });
      await client.query(
        'INSERT INTO homework10dCheck (homeworkId, username, checked) VALUES ($1, $2, $3)',
        [homeworkId, username, checkStatus]
      );
    });
    const result = await withDB((client) => client.query('SELECT * FROM homework10dcheck WHERE username = $1', [username]));
    const data = result.rows;

    await updateCacheHomeworkCheckedData(changeKeys(data));
    res.status(200).send("0");
  } catch (error) {
    console.error('Error while checking hausaufgaben data:', error);
    res.status(500).send('1');
  }
});

// deleteHA route
router.post('/delete', async (req, res) => {
  const { id } = req.body;

  if (! req.session.user) {
    res.status(200).send('2');
    return;
  }

  try {
    await withDB(async (client) => {
      await client.query('DELETE FROM homework10d WHERE homeworkId = $1', [id]);
    });

    const result = await withDB((client) => client.query('SELECT * FROM homework10d'));
    const data = result.rows;

    await updateCacheHomeworkData(changeKeys(data)); 
    res.status(200).send('0');
  } catch (error) {
    console.error('Error while deleting hausaufgaben data:', error);
    res.status(500).send('1');
  }
});

// editHA route
router.post('/edit', async (req, res) => {
  const { id, subjectId, content, assignmentDate, submissionDate} = req.body;

  if (! req.session.user) {
    res.status(200).send('2');
    return;
  }

  if ([ subjectId, content, assignmentDate, submissionDate ].includes("")) {
    console.log("Empty information while editing homework")
    res.status(200).send("1");
    return;
  }

  try {
    await withDB(async (client) => {
      await client.query(
        'UPDATE homework10d SET content = $1, subjectId = $2, assignmentDate = $3, submissionDate = $4 WHERE homeworkId = $5',
        [content, subjectId, assignmentDate, submissionDate, id]
      );
    });

    const result = await withDB((client) => client.query('SELECT * FROM homework10d'));
    const data = result.rows;

    await updateCacheHomeworkData(changeKeys(data));
    res.status(200).send("0");
  } catch (error) {
    console.error('Error while editing and storing hausaufgaben data:', error);
    res.status(500).send('1');
  }
});

// fetchHA route
router.get('/get_homework_data', async (req, res) => {
  try {
    const cachedHomeworkData = await redisClient.get(cacheKeyHomeworkData);

    if (cachedHomeworkData) {
      console.log('Serving data from Redis cache');
      return res.status(200).json(JSON.parse(cachedHomeworkData));
    }

    const result = await withDB((client) => client.query('SELECT * FROM homework10d'));
    const data = result.rows;

    await updateCacheHomeworkData(changeKeys(data));
    res.status(200).json(changeKeys(data));
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// fetchHA route
router.get('/get_homework_checked_data', async (req, res) => {
  let username;
  if (! req.session.user) {
    res.status(200).send('2');
    return;
  }
  else {
    username = req.session.user.username;
  }
  try {
    const cachedHomeworkCheckedData = await redisClient.get(cacheKeyHomeworkCheckedData);

    if (cachedHomeworkCheckedData) {
      console.log('Serving data from Redis cache');
      return res.status(200).json(JSON.parse(cachedHomeworkCheckedData));
    }

    const result = await withDB((client) => client.query('SELECT * FROM homework10dcheck WHERE username = $1', [username]));
    const data = result.rows;

    await updateCacheHomeworkCheckedData(changeKeys(data));
    res.status(200).json(changeKeys(data));
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
module.exports = router;
