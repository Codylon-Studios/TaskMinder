const { createServer } = require('http');
const express = require('express');
const helmet = require('helmet');
const cron = require('node-cron');
const session = require('express-session')
const { Pool } = require('pg');
const socketIO = require('./src/socket');
require('dotenv').config();
const ErrorHandler = require('./src/middleware/errorMiddleware');
const RequestLogger = require('./src/middleware/loggerMiddleware');
const logger = require('./logger');
const { cleanupOldHomework } = require('./src/homeworkCleanup');
const sequelize = require('./src/sequelize');
const account = require('./src/routes/accountRoute');
const homework = require('./src/routes/homeworkRoute');
const substitutions = require('./src/routes/substitutionRoute');
const teams = require('./src/routes/teamRoute');
const events = require('./src/routes/eventRoute');

const app = express();
const server = createServer(app);
const io = socketIO.initialize(server);

server.listen(3000, () => {
  logger.success('Server running at http://localhost:3000');
});

// Schedule the cron job to run at midnight (00:00) every day
cron.schedule('0 0 * * *', () => {
  logger.info('Starting scheduled homework cleanup');
  cleanupOldHomework();
});

const sessionPool = new Pool({
  user: sequelize.config.username,
  host: sequelize.config.host,
  database: sequelize.config.database,
  password: sequelize.config.password,
  port: sequelize.config.port,
});

// Content Security Policy
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": [
        "'self'", 
        "https://code.jquery.com", 
        "https://cdn.jsdelivr.net", 
        "https://kit.fontawesome.com"
      ],
      "connect-src": [
        "'self'", 
        "https://ka-f.fontawesome.com",
        "wss://*"
      ],
      "style-src": [
        "'self'",
        'https://ka-f.fontawesome.com/',
        'https://fonts.googleapis.com/',
        "'unsafe-inline'"
      ],
      "font-src": [
        "'self'",
        'https://ka-f.fontawesome.com/',
        'https://fonts.gstatic.com/'
      ],
      "img-src": ["'self'", 'data:'],
      "object-src": ["'none'"],
      "frame-ancestors": ["'self'"]
    },
  },
  crossOriginOpenerPolicy: {
    policy: 'same-origin'
  },
  crossOriginResourcePolicy: {
    policy: 'same-origin'
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  noSniff: true,
  dnsPrefetchControl: {
    allow: false
  },
  frameguard: {
    action: 'deny'
  },
  hidePoweredBy: true,
  originAgentCluster: true,
}));

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json());

const sessionMiddleware = session({
  store: new (require('connect-pg-simple')(session))({
    pool: sessionPool,
    tableName: 'account_sessions',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  }, //30 days
  name: 'UserLogin',
});

app.use(sessionMiddleware);
app.use(RequestLogger);
app.use('/account', account);
app.use('/homework', homework);
app.use('/substitutions', substitutions);
app.use('/teams', teams);
app.use('/events', events);
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

app.get('/homework', function (req, res) {
  res.sendFile(__dirname + '/public/homework/homework.html');
});

app.get('/events', function (req, res) {
  res.sendFile(__dirname + '/public/events/events.html');
});