const express = require('express');
const { createServer } = require('http');
const auth = require('./routes/auth');
const ha = require('./routes/homework')
const session = require('express-session');
const {redisClient, cacheKey} = require('./routes/constant');
const app = express();
const server = createServer(app);

const io = require('socket.io')(server, {
  cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
      transports: ['websocket', 'polling'],
      allowedHeaders: ['Access-Control-Allow-Origin'],
      credentials: true
  },
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
// Configure session
app.use(session({
  secret: "notsecret",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, //10 days
  name: 'UserLogin',
}));

app.use('/account', auth);
app.use('/homework', ha);

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('publishListToAllClients', async () => {
    try {
      const cachedData = await redisClient.get(cacheKey);
      // Emit the cached data to all connected clients
      io.emit('updtHAList', cachedData);
    } catch (err) {
      console.error('Error fetching data from Redis:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});


// Serve index.html when root URL is accessed
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/main/main.html');
});
// Serve allhomework.html when URL ../allhomework is accessed
app.get('/allhomework', function (req, res) {
  res.sendFile(__dirname + '/public/allhomework/allhomework.html');
});
