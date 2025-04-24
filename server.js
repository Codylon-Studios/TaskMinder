const { createServer } = require('http');
const path = require('path');
const express = require('express');
const compression = require('compression')
const helmet = require('helmet');
const cron = require('node-cron');
const { rateLimit } = require('express-rate-limit');
const session = require('express-session')
const { Pool } = require('pg');
const socketIO = require('./src/config/socket');
require('dotenv').config();
const ErrorHandler = require('./src/middleware/errorMiddleware');
const RequestLogger = require('./src/middleware/loggerMiddleware');
const checkAccess = require('./src/middleware/accessMiddleware');
const logger = require('./logger');
const { cleanupOldHomework } = require('./src/homeworkCleanup');
const { createDBBackup } = require ('./src/backupTable');
const sequelize = require('./src/config/sequelize');
const account = require('./src/routes/accountRoute');
const homework = require('./src/routes/homeworkRoute');
const substitutions = require('./src/routes/substitutionRoute');
const schedules = require('./src/routes/scheduleRoute');
const teams = require('./src/routes/teamRoute');
const events = require('./src/routes/eventRoute');
const subjects = require('./src/routes/subjectRoute');

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

// Schedule PostgreSQL backup every hour -- comment out section if not working
cron.schedule("0 * * * *", () => {
  logger.info("Starting hourly PostgreSQL backup");
  createDBBackup();
});

const sessionPool = new Pool({
  user: sequelize.config.username,
  host: sequelize.config.host,
  database: sequelize.config.database,
  password: sequelize.config.password,
  port: sequelize.config.port,
});

const limiter = rateLimit({
  windowMs: 1000, // 1 second
  limit: 20, // Max 20 requests per IP per second
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { status: 429, message: 'Too many requests, please slow down.' }
});

app.use(limiter)

if (process.env.NODE_ENV !== 'DEVELOPMENT') {
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
}

app.use(compression());
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
  proxy: process.env.NODE_ENV !== 'DEVELOPMENT',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'DEVELOPMENT',
  }, //30 days
  name: 'UserLogin',
});
app.use(sessionMiddleware);
app.use(RequestLogger);
app.use("/account", account);
app.use("/homework", homework);
app.use("/substitutions", substitutions);
app.use("/schedule", schedules);
app.use("/teams", teams);
app.use("/events", events);
app.use("/subjects", subjects);
app.use(ErrorHandler);

// Sync models with the database
sequelize.sync({alter: true})
  .then(() => logger.success('Database synced'));

sequelize.authenticate()
  .then(() => logger.success('Connected to PostgreSQL'))
  .catch(err => logger.error('Unable to connect to PostgreSQL:', err));


app.get('/', (req, res) => {
  if (req.session.account && req.session.classJoined) {
    return res.redirect(302, '/main');
  }
  res.redirect(302, '/join');
})


app.get('/join', (req, res) => {
  if (req.session.account && req.session.classJoined) {
    return res.redirect(302, '/main');
  }
  else if (! req.query.action) {
    if (req.session.account) {
      return res.redirect(302, '/join?action=join');
    }
    else if (req.session.classJoined) {
      return res.redirect(302, '/join?action=account');
    }
  }
  res.sendFile(path.join(__dirname, 'public', 'join', 'join.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'settings', 'settings.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about', 'about.html'));
});

//
// Protected routes: Redirect to /join if not logged in
//
app.get('/main', checkAccess.elseRedirect, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'main', 'main.html'));
});

app.get('/homework', checkAccess.elseRedirect, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'homework', 'homework.html'));
});

app.get('/events', checkAccess.elseRedirect, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'events', 'events.html'));
});
