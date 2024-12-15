const socket = io();

// EMIT FUNCTIONS TO SERVER
function addNote(/*parameters*/) {
  socket.emit('add-note', /*parameters*/);
}

function editNote(/*parameters*/) {
  socket.emit('edit-note', /*parameters*/);
}

function deleteNote(/*parameters*/) {
  socket.emit('delete-note', /*parameters*/);
}

// Listen for the current list from the server
socket.on('current-notes', (/*parameters*/) => {
  //render the notes list
});
