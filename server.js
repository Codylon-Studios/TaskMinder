const express = require('express');
const helmet = require('helmet');
const ErrorHandler = require('./src/middleware/errorMiddleware');
const RequestLogger = require('./src/middleware/loggerMiddleware');
const sequelize = require('./src/sequelize');
const { createServer } = require('http');
const account = require('./src/routes/accountRoute');
const homework = require('./src/routes/homeworkRoute');
const substitutions = require('./src/routes/substitutionRoute');
const teams = require('./src/routes/teamRoute');
const events = require('./src/routes/eventRoute');
const session = require('express-session');
const logger = require('./logger');
const app = express();
const server = createServer(app);

server.listen(3000, () => {
  logger.success('Server running at http://localhost:3000');
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
        "https://ka-f.fontawesome.com"
      ],
      "style-src": [
        "'self'",
        'https://ka-f.fontawesome.com/',
        'https://fonts.googleapis.com/',
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

  // Ensures a top-level document does not share a browser context group with cross-origin documents
  crossOriginOpenerPolicy: {
    policy: 'same-origin' // Protects against timing and XS-Leaks attacks
  },

  // Prevents resources from being loaded cross-origin
  crossOriginResourcePolicy: {
    policy: 'same-origin'
  },

  // Controls how much referrer information should be included
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // Prevents MIME type sniffing
  noSniff: true,

  // Helps manage DNS prefetching for performance and privacy
  dnsPrefetchControl: {
    allow: false
  },

  // X-Frame-Options
  // Prevents clickjacking attacks
  frameguard: {
    action: 'deny' // Completely prevent framing
  },

  // Remove X-Powered-By header to reduce fingerprinting
  hidePoweredBy: true,

  // Provides origin-based process isolation
  originAgentCluster: true,
}));

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
