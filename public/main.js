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

function updateTimetableMode() {
  if ($("#timetable-mode-less")[0].checked) {
    $("#timetable-less")[0].classList.remove("d-none");
    $("#timetable-more")[0].classList.add("d-none");
  }
  else {
    $("#timetable-less")[0].classList.add("d-none");
    $("#timetable-more")[0].classList.remove("d-none");
  }
}

// Listen for the current list from the server
socket.on('current-notes', (/*parameters*/) => {
  //render the notes list
});

updateTimetableMode();

$("#timetable-mode input").each(() => {
  $(this).on("click", () => {
    updateTimetableMode();
  });
});
