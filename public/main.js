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

  $("#login-register-error-invalid-username").addClass("d-none");
  $("#login-register-error-invalid-username").removeClass("d-flex");

  $("#login-error-invalid-password").addClass("d-none");
  $("#login-error-invalid-password").removeClass("d-flex");

  $("#register-error-insecure-password").addClass("d-none");
  $("#register-error-insecure-password").removeClass("d-flex");
}

function checkUsername(username) {
  return /^\w{4,20}$/.test(username);
}

function checkSecurePassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}[\]:;"'<>,.?/-]).{8,}$/.test(password);
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


// Check username

$("#login-register-username").on("input", () => {
  if (checkUsername($("#login-register-username").val())) {
    $("#login-register-next-button").removeClass("disabled");
    $("#login-register-error-invalid-username").addClass("d-none");
    $("#login-register-error-invalid-username").removeClass("d-flex");
  }
});

$("#login-register-username").on("change", () => {
  if (! checkUsername($("#login-register-username").val())) {
    $("#login-register-next-button").addClass("disabled");
    $("#login-register-error-invalid-username").removeClass("d-none");
    $("#login-register-error-invalid-username").addClass("d-flex");
  }
});


// Check password

$("#register-password").on("input", () => {
  if (checkSecurePassword($("#register-password").val())) {
    $("#register-error-insecure-password").addClass("d-none");
    $("#register-error-insecure-password").removeClass("d-flex");
  }
});

$("#register-password").on("change", () => {
  if (! checkSecurePassword($("#register-password").val())) {
    $("#register-error-insecure-password").removeClass("d-none");
    $("#register-error-insecure-password").addClass("d-flex");
  }
});


// Check repeated password

$("#register-password-repeat").on("input", () => {
  if ($("#register-password").val() == $("#register-password-repeat").val()) {
    $("#register-button").removeClass("disabled");
    $("#register-error-no-matching-passwords").addClass("d-none");
    $("#register-error-no-matching-passwords").removeClass("d-flex");
  }
});

$("#register-password-repeat").on("change", () => {
  if ($("#register-password").val() != $("#register-password-repeat").val()) {
    $("#register-button").addClass("disabled");
    $("#register-error-no-matching-passwords").removeClass("d-none");
    $("#register-error-no-matching-passwords").addClass("d-flex");
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

  let url = "/account/login";
  let data = {
      username: username,
      password: password
  };
  let hasResponded = false;
  $.post(url, data, function (result, status) {
    hasResponded = true;
    if (result == "0") {
      $("#login-success-toast .username").html(username);
      $("#login-success-toast").toast("show");
    }
    else if (result == "1") {
      $("#error-server-toast").toast("show");
    }
    else if (result == "2") {
      $("#login-error-invalid-password").removeClass("d-none");
      $("#login-error-invalid-password").addClass("d-flex");
    }
  });
  setTimeout(() => {
    if (!hasResponded) {
      $("#error-server-toast").toast("show");
    }
  }, 1000);
});

$("#register-button").on("click", () => {
  let username = $("#login-register-username").val();
  let password = $("#register-password").val()
  console.log("Register", username, password)

  let url = "/account/register";
  let data = {
      username: username,
      password: password
  };
  let hasResponded = false;
  $.post(url, data, function (result, status) {
    hasResponded = true;
    if (result == "0") {
      $("#register-success-toast .username").html(username);
      $("#register-success-toast").toast("show");
    }
    else if (result == "1") {
      $("#error-server-toast").toast("show");
    }
  });
  setTimeout(() => {
    if (!hasResponded) {
      $("#error-server-toast").toast("show");
    }
  }, 1000);
});
