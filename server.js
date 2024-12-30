// Import necessary modules: express, http server, socket.io
const express = require('express');
const { createServer } = require('http');
const auth = require('./routes/auth');
const session = require('express-session');

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
  console.log('server running at http://localhost:3000');
});


// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

//configure session
app.use(session({
  secret: "notsecret",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, //10 days
  name: 'UserLogin',
}));


app.use('/auth', auth);


// When a user connects
io.on('connection', (socket) => {
  console.log('A user connected');
  //Send current notes list
  socket.emit('current-notes', /*data*/);


  // ADD ITEM
  socket.on('add-note', (/*data*/) => {
    // Add new note to database
    // Broadcast new note to all clients
    io.emit('current-notes', /*data*/);
  });

  // EDIT ITEM
  socket.on('edit-note', (/*data*/) => {
    // Update note in database
    // Broadcast updated note-list to all clients
    io.emit('current-notes', /*data*/);
  });

  // DELETE ITEM
  socket.on('delete-note', (itemValue) => {
    //remove note from database
    // Broadcast updated note-list to all clients
    io.emit('current-notes', /*data*/);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Serve index.html when root URL is accessed
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/main.html');
});