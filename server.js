// Import necessary modules: express, http server, socket.io
const express = require('express');
const { createServer } = require('http');

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

// Serve index.html when root URL is accessed
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/public/main.html');
});
