module.exports = (server) => {
    const io = require('socket.io')(server, {
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET", "POST"],
            transports: ['websocket', 'polling'],
            allowedHeaders: ['Access-Control-Allow-Origin'],
            credentials: true
        },
    });

    // Socket.IO connection
    io.on('connection', (socket) => {
        console.log('A user connected');

        // Send current notes list
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
            // Remove note from database
            // Broadcast updated note-list to all clients
            io.emit('current-notes', /*data*/);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });
};
