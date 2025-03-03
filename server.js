const express = require('express');
const ErrorHandler = require('./src/middleware/errorMiddleware');
const RequestLogger = require('./src/middleware/loggerMiddleware');
const sequelize = require('./src/sequelize');
const { createServer } = require('http');
const account = require('./src/routes/accountRoute');
const homework = require('./src/routes/homeworkRoute');
const substitutions = require('./src/routes/substitutionRoute');
const teams = require('./src/routes/teamRoute');
const session = require('express-session');
const logger = require('./logger');
const app = express();
const server = createServer(app);

server.listen(3000, () => {
  logger.success('Server running at http://localhost:3000');
});

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json());
app.use(session({
  secret: "notsecret",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  }, //10 days
  name: 'UserLogin',
}));

app.use(RequestLogger);
app.use('/account', account);
app.use('/homework', homework);
app.use('/substitutions', substitutions);
app.use('/teams', teams);
app.use(ErrorHandler);

// Sync models with the database
sequelize.sync({alter: true})
  .then(() => logger.success('Database synced'));

sequelize.authenticate()
  .then(() => logger.success('Connected to PostgreSQL'))
  .catch(err => logger.error('Unable to connect to PostgreSQL:', err));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/main/main.html');
});
app.get('/allhomework', function (req, res) {
  res.sendFile(__dirname + '/public/allhomework/allhomework.html');
});
