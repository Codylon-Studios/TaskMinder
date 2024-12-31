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

$(document).ready(() => {
  $('#user-dropdown').on('show.bs.dropdown', () => {
    //check authentication
    $.get('auth/auth', (response) => {
      if (response.authenticated) {
        // User is logged in
        $('#login-register-button').addClass('d-none');
        $('#logout-button').removeClass('d-none');
      } else {
        // User is not logged in
        $('#login-register-button').removeClass('d-none');
        $('#logout-button').addClass('d-none');
      }
    });
  });
});

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

$("#login-register-next-button").on("click", async () => {
  $("#login-register-back-button").removeClass("d-none");

  $("#login-register-title").addClass("d-none");
  $("#login-register-content").addClass("d-none");
  $("#login-register-next-button").addClass("d-none");

  try {
    const exists = await userNameExists($("#login-register-username").val());

    if (exists) {
      console.log("login");
      $("#login-title").removeClass("d-none");
      $("#login-content").removeClass("d-none");
      $("#login-button").removeClass("d-none");
    } else {
      console.log("register");
      $("#register-title").removeClass("d-none");
      $("#register-content").removeClass("d-none");
      $("#register-button").removeClass("d-none");
    }
  } catch (error) {
    console.error("Error checking username:", error);
    $("#error-server-toast").toast("show");
  }
});


$("#login-register-back-button").on("click", resetLoginRegisterModal);



//
//LOGIN -- LOGOUT -- REGISTER
//
$("#login-button").on("click", () => {
  let username = $("#login-register-username").val();
  let password = $("#login-password").val()
  console.log("Login: ", username, password)
  LoginAccount(username, password);
  $("#login-register-modal").modal("hide");
});

$("#register-button").on("click", () => {
  let username = $("#login-register-username").val();
  let password = $("#register-password").val()
  console.log("Register: ", username, password)
  registerAccount(username, password);
  $("#login-register-modal").modal("hide");
});

$("#logout-button").on("click", () => {
  console.log("Logout");
  logoutAccount();
});
