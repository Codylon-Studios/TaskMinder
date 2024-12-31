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

function updateColorTheme() {
  if ($("#color-theme-dark")[0].checked) {
    document.body.setAttribute("data-bs-theme", "dark");
  }
  else {
    document.body.setAttribute("data-bs-theme", "light");
  }
}

function resetLoginRegisterModal() {
  $("#login-register-title").removeClass("d-none");
  $("#login-title").addClass("d-none");
  $("#register-title").addClass("d-none");

  $("#login-register-content").removeClass("d-none");
  $("#login-content").addClass("d-none");
  $("#register-content").addClass("d-none");

  $("#login-password").val("");
  $("#register-password").val("");
  $("#register-password-repeat").val("");

  $("#login-register-next-button").removeClass("d-none");
  $("#login-register-back-button").addClass("d-none");
  $("#login-button").addClass("d-none");
  $("#register-button").addClass("d-none");
}

const socket = io();

// Listen for the current list from the server
socket.on('current-notes', (/*parameters*/) => {
  //render the notes list
});

updateTimetableMode();
updateColorTheme();

$("#timetable-mode input").each(() => {
  $(this).on("click", () => {
    updateTimetableMode();
  });
});

$("#color-theme input").each(() => {
  $(this).on("click", () => {
    updateColorTheme();
  });
});

$("#logout-button").on("click", () => {
  console.log("Logout")
});

$("#login-register-username").val("");

$("#login-register-modal").on("show.bs.modal", () => {
  resetLoginRegisterModal();
  $("#login-register-username").val("");
  $("#login-register-next-button").addClass("disabled");
});

$("#login-register-username").on("input", () => {
  if ($("#login-register-username").val() != "") {
    $("#login-register-next-button").removeClass("disabled");
  }
  else {
    $("#login-register-next-button").addClass("disabled");
  }
});

$("#login-register-next-button").on("click", () => {

  $("#login-register-back-button").removeClass("d-none");

  $("#login-register-title").addClass("d-none");
  $("#login-register-content").addClass("d-none");
  $("#login-register-next-button").addClass("d-none");

  if ($("#login-register-username").val() == "existing") {
    $("#login-title").removeClass("d-none");
    $("#login-content").removeClass("d-none");
    $("#login-button").removeClass("d-none");
  }
  else {
    $("#register-title").removeClass("d-none");
    $("#register-content").removeClass("d-none");
    $("#register-button").removeClass("d-none");
  }
});

$("#login-register-back-button").on("click", resetLoginRegisterModal);

$("#login-button").on("click", () => {
  let username = $("#login-register-username").val();
  let password = $("#login-password").val()
  console.log("Login", username, password)
});

$("#register-button").on("click", () => {
  let username = $("#login-register-username").val();
  let password = $("#register-password").val()
  let passwordRepeat = $("#register-password-repeat").val()
  console.log("Register", username, password, passwordRepeat)
});
