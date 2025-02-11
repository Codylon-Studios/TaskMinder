const express = require('express');
const ErrorHandler = require('./src/middleware/errorMiddleware');
const sequelize = require('./src/sequelize');
const { createServer } = require('http');
const auth = require('./src/routes/authroutes');
const ha = require('./src/routes/homeworkroute')
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
// Configure session
app.use(session({
  secret: "notsecret",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, //10 days
  name: 'UserLogin',
}));

// Sync models with the database
sequelize.sync({alter: true})

sequelize.authenticate()
    .then(() => console.log('Connected to PostgreSQL'))
    .catch(err => console.error('Unable to connect to PostgreSQL:', err));

app.use('/account', auth);
app.use('/homework', ha);
app.use(ErrorHandler);
// Serve index.html when root URL is accessed
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/main/main.html');
});
// Serve allhomework.html when URL ../allhomework is accessed
app.get('/allhomework', function (req, res) {
  res.sendFile(__dirname + '/public/allhomework/allhomework.html');
});
