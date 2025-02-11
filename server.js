const express = require('express');
const ErrorHandler = require('./src/middleware/errorMiddleware');
const sequelize = require('./src/sequelize');
const { createServer } = require('http');
const auth = require('./src/routes/authroute');
const homework = require('./src/routes/homeworkroute');
const substitutions = require('./src/routes/substitutionroute');
const session = require('express-session');
const app = express();
const server = createServer(app);

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
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

app.use('/account', auth);
app.use('/homework', homework);
app.use('/substitutions', substitutions);
app.use(ErrorHandler);

// Sync models with the database
sequelize.sync({alter: true})
  .then(() => console.log('Database synced'));

sequelize.authenticate()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Unable to connect to PostgreSQL:', err));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/main/main.html');
});
app.get('/allhomework', function (req, res) {
  res.sendFile(__dirname + '/public/allhomework/allhomework.html');
});
