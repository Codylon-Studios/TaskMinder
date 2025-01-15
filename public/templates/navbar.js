//REGISTER -- REGISTER -- REGISTER -- REGISTER
function registerAccount(username, password, classcode) {
  let url = "/account/register";
  let data = {
      username: username,
      password: password,
      classcode: classcode
  };
  let hasResponded = false;
  $.post(url, data, function (result) {
      hasResponded = true;
      if (result == "0") {
          //success
          $("#register-success-toast .username").html(username);
          $("#register-success-toast").toast("show");
          $("#login-register-modal").modal("hide");
      }
      else if (result == "1") {
          //Unknown error on server side
          $("#error-server-toast").toast("show");
      }
      else if (result == "2") {
        $("#register-error-invalid-classcode").removeClass("d-none");
        $("#register-error-invalid-classcode").addClass("d-flex");
      }
  });
  setTimeout(() => {
      if (!hasResponded) {
          $("#error-server-toast").toast("show");
      }
  }, 1000);
}

//LOGIN -- LOGIN -- LOGIN -- LOGIN -- LOGIN
function loginAccount(username, password) {
  let url = "/account/login";
  let data = {
      username: username,
      password: password
  };
  let hasResponded = false;
  $.post(url, data, function (result) {
      hasResponded = true;
      if (result == "0") {
          $("#login-success-toast .username").html(username);
          $("#login-success-toast").toast("show");
          $("#login-register-modal").modal("hide");
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
};

//LOGOUT -- LOGOUT -- LOGOUT
function logoutAccount(){
  let url = "/account/logout";
      let data = {};
      let hasResponded = false;
      $.post(url, data, function (result) {
          hasResponded = true;
          // Handle result
          if (result == "0") {
              console.log("logged out");
              $("#logout-success-toast").toast("show");
          }
          else if (result == "1") {
              console.log("internal server error");
          }
          else if (result == "2") {
              console.log("you are not logged in");
          }
      });
      setTimeout(() => {
          if (!hasResponded) {
              $("#error-server-toast").toast("show");
          }
      }, 5000);
}

function checkExistingUsername(username) {
  let url = "/account/checkusername";
  let data = { username: username };

  return new Promise((resolve, reject) => {
    $.post(url, data, function (result) {
      if (result == "0") {
        // REGISTER
        resolve(false);
      } else if (result == "1") {
        // LOGIN
        resolve(true);
      }
    }).fail(() => {
      reject(new Error("Server error"));
      $("#error-server-toast").toast("show");
    });
  });
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
//
//LOGIN -- LOGOUT -- REGISTER
//
$("#login-button").on("click", () => {
  let username = $("#login-register-username").val();
  let password = $("#login-password").val();
  console.log("Login: ", username, password);
  loginAccount(username, password);
});

$("#register-button").on("click", () => {
  let username = $("#login-register-username").val();
  let password = $("#register-password").val();
  let classcode = $("#register-classcode").val();
  console.log("Register: ", username, password, classcode);
  registerAccount(username, password, classcode);
});

$("#logout-button").on("click", () => {
  console.log("Logout");
  logoutAccount();
});

function updateColorTheme() {
  if ($("#color-theme-dark")[0].checked) {
    document.body.setAttribute("data-bs-theme", "dark");
  }
  else {
    document.body.setAttribute("data-bs-theme", "light");
  }
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
    $.get('/account/auth', (response) => {
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

updateColorTheme();

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

 // Check classcode

 $("#register-classcode").on("input", () => {
  $("#register-error-invalid-classcode").addClass("d-none");
  $("#register-error-invalid-classcode").removeClass("d-flex");
});

$("#login-register-next-button").on("click", async () => {
  $("#login-register-back-button").removeClass("d-none");

  $("#login-register-title").addClass("d-none");
  $("#login-register-content").addClass("d-none");
  $("#login-register-next-button").addClass("d-none");

  try {
    const exists = await checkExistingUsername($("#login-register-username").val());

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
