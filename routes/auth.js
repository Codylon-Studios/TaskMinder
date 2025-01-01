const bcrypt = require('bcrypt');
const express = require('express');
const fs = require('fs');
const { Pool } = require('pg');
const router = express.Router();

const saltRounds = 10;
// Create a PostgreSQL connection pool
const dbConfig = JSON.parse(fs.readFileSync('db_config.json'));
const pool = new Pool(dbConfig);

// Helper to handle DB connection cleanup
const withDB = async (callback) => {
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
};

function checkUsername(username) {
  return /^\w{4,20}$/.test(username);
}

// Authentication check
router.get('/auth', (req, res) => {
  if (req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

// Logout route
router.post('/logout', async (req, res) => {
  if (!req.session.user) return res.status(200).send('2');  // Not logged in

  try {
    req.session.destroy((err) => {
      if (err) return res.status(500).send('1');  // Internal server error
      res.clearCookie('UserLogin');
      res.status(200).send('0');  // Logout successful
    });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).send('1');
  }
});

// Register route
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const classname = "10d";
  try {
    if (! checkUsername(username)) {
      res.status(200).send('0');  // Invalid username (But sending 0 to scam scammers)
      console.warn("Tried to use invalid username: ", username);
      return;
    }
    await withDB(async (client) => {
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      await client.query('INSERT INTO users (username, password, class) VALUES ($1, $2, $3)', [username, hashedPassword, classname]);

      req.session.user = { username };
      res.status(200).send('0');  // Registration successful
    });
  } catch (error) {
    console.error('Error while storing user data:', error);
    res.status(500).send('1');  // Internal server error
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    if (! checkUsername(username)) {
      res.status(200).send('0');  // Invalid username (But sending 0 to scam scammers)
      console.warn("Tried to use invalid username: ", username);
      return;
    }
    await withDB(async (client) => {
      const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
      if (result.rows.length === 0) return res.status(200).send('2');  // Username or password incorrect

      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(200).send('2');  // Incorrect password

      req.session.user = { username };
      res.status(200).send('0');  // Login successful
    });
  } catch (error) {
    console.error('Error authenticating user:', error);
    res.status(500).send('1');  // Internal server error
  }
});

// Delete account route
router.post('/delete', async (req, res) => {
  if (!req.session.user) return res.status(200).send('3');  // Not logged in

  const { username } = req.session.user;
  const { password } = req.body;

  try {
    if (! checkUsername(username)) {
      res.status(200).send('0');  // Invalid username (But sending 0 to scam scammers)
      console.warn("Tried to use invalid username: ", username);
      return;
    }
    await withDB(async (client) => {
      const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
      if (result.rows.length === 0) return res.status(200).send('2');  // Incorrect username or password

      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(200).send('2');  // Incorrect password

      await client.query('DELETE FROM users WHERE username = $1', [username]);
      req.session.destroy((err) => {
        if (err) return res.status(500).send('1');  // Internal server error
        res.clearCookie('UserLogin');
        res.status(200).send('0');  // Deletion successful
      });
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).send('1');  // Internal server error
  }
});

// checkusername route
router.post('/checkusername', async (req, res) => {
  const { username} = req.body;

  try {
    await withDB(async (client) => {
      const userExists = await client.query('SELECT 1 FROM users WHERE username = $1', [username]);
      if (userExists.rows.length > 0) return res.status(200).send(['1']);  // Username already used -- LOGIN

      res.status(200).send('0');
      console.log("register-server");  // Username not being used -- REGISTER
    });
  } catch (error) {
    console.error('Error while storing user data:', error);
  }
});

module.exports = router;
