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
          $navbarUi.lr.modal.modal("hide");
          user.trigger("login");
          user.username = username;
      }
      else if (result == "1") {
          //Unknown error on server side
          $navbarToasts.serverError.toast("show");
      }
      else if (result == "2") {
        $navbarUi.r.invalidClasscode.removeClass("d-none");
        $navbarUi.r.invalidClasscode.addClass("d-flex");
      }
  });
  setTimeout(() => {
      if (!hasResponded) {
          $navbarToasts.serverError.toast("show");
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
          $navbarUi.lr.modal.modal("hide");
          user.trigger("login");
          user.username = username;
      }
      else if (result == "1") {
        $navbarToasts.serverError.toast("show");
      }
      else if (result == "2") {
        $navbarUi.l.invalidPassword.removeClass("d-none");
        $navbarUi.l.invalidPassword.addClass("d-flex");
      }
  });
  setTimeout(() => {
      if (!hasResponded) {
        $navbarToasts.serverError.toast("show");
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
    if (result == "0") {
      $("#logout-success-toast").toast("show");
      user.trigger("logout");
    }
    else if (result == "1") {
      $navbarToasts.serverError.toast("show");
    }
    else if (result == "2") {
      $navbarToasts.serverError.toast("show");
    }
  });
  setTimeout(() => {
    if (!hasResponded) {
      $navbarToasts.serverError.toast("show");
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
      $navbarToasts.serverError.toast("show");
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
  $navbarUi.r.classcode.val("");
  $navbarUi.r.password.val("");
  $navbarUi.r.passwordRepeat.val("");
  
  $navbarUi.lr.nextBtn.removeClass("d-none");
  $navbarUi.lr.backBtn.addClass("d-none");
  $("#login-button").addClass("d-none");
  $navbarUi.r.btn.addClass("d-none");

  $navbarUi.lr.invalidUsername.addClass("d-none");
  $navbarUi.lr.invalidUsername.removeClass("d-flex");

  $navbarUi.l.invalidPassword.addClass("d-none");
  $navbarUi.l.invalidPassword.removeClass("d-flex");

  $navbarUi.r.invalidClasscode.addClass("d-none");
  $navbarUi.r.invalidClasscode.removeClass("d-flex");

  $navbarUi.r.insecurePassword.addClass("d-none");
  $navbarUi.r.insecurePassword.removeClass("d-flex");
}

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

let $navbarUi = {
  lr: { // Login & Register related elements
    modal: $("#login-register-modal"),
    invalidUsername: $("#login-register-error-invalid-username"),
    username: $("#login-register-username"),
    nextBtn: $("#login-register-next-button"),
    backBtn: $("#login-register-back-button"),
  },
  l: { // Login related elements
    invalidPassword: $("#login-error-invalid-password"),
  },
  r: { // Register related elements
    noMatchingPassword: $("#register-error-no-matching-passwords"),
    insecurePassword: $("#register-error-insecure-password"),
    invalidClasscode: $("#register-error-invalid-classcode"),
    classcode: $("#register-classcode"),
    password: $("#register-password"),
    passwordRepeat: $("#register-password-repeat"),
    btn: $("#register-button"),
  },
}

let $navbarToasts = {
  serverError: $("#error-server-toast"),
  notLoggedIn: $("#not-logged-in-toast"),
}

// Create the user object with a username variable and event listeners
const user = $({})

window.dispatchEvent(new Event("userVariableDefined"));

// Give user the property username, using the jQuery data() function
Object.defineProperty(user, "username", {
  get() {
      return user.data("username");
  },
  set(value) {
      user.data("username", value);
  }
});
Object.defineProperty(user, "loggedIn", {
  get() {
      return user.data("loggedIn");
  },
  set(value) {
      user.data("loggedIn", value);
  }
});

user.on("login", () => {
  user.loggedIn = true;
});

user.on("logout", () => {
  user.loggedIn = false;
  user.username = null;
});

// Check if the user is logged in for the first time
$.get('/account/auth', (response) => {
  if (response.authenticated) {
    user.trigger("login");
    user.username = response.user.username;
  } else {
    user.trigger("logout");
    user.username = null;
  }
});

//
//LOGIN -- LOGOUT -- REGISTER
//
$("#login-button").on("click", () => {
  let username = $navbarUi.lr.username.val();
  let password = $("#login-password").val();
  loginAccount(username, password);
});

$navbarUi.r.btn.on("click", () => {
  let username = $navbarUi.lr.username.val();
  let password = $navbarUi.r.password.val();
  let classcode = $navbarUi.r.classcode.val();
  registerAccount(username, password, classcode);
});

$("#logout-button").on("click", () => {
  logoutAccount();
});

updateColorTheme();

$("#color-theme input").each(() => {
  $(this).on("click", () => {
    updateColorTheme();
  });
});

$navbarUi.lr.username.val("");

$navbarUi.lr.modal.on("show.bs.modal", () => {
  resetLoginRegisterModal();
  $navbarUi.lr.username.val("");
  $navbarUi.lr.nextBtn.addClass("disabled");
});


// Check username

$navbarUi.lr.username.on("input", () => {
  if (checkUsername($navbarUi.lr.username.val())) {
    $navbarUi.lr.nextBtn.removeClass("disabled");
    $navbarUi.lr.invalidUsername.addClass("d-none");
    $navbarUi.lr.invalidUsername.removeClass("d-flex");
  }
});

$navbarUi.lr.username.on("change", () => {
  if (! checkUsername($navbarUi.lr.username.val())) {
    $navbarUi.lr.nextBtn.addClass("disabled");
    $navbarUi.lr.invalidUsername.removeClass("d-none");
    $navbarUi.lr.invalidUsername.addClass("d-flex");
  }
});


// Check login password

$("#login-password").on("input", () => {
  $navbarUi.l.invalidPassword.addClass("d-none");
  $navbarUi.l.invalidPassword.removeClass("d-flex");
});


// Check register password

$navbarUi.r.password.on("input", () => {
  if (checkSecurePassword($navbarUi.r.password.val())) {
    $navbarUi.r.insecurePassword.addClass("d-none");
    $navbarUi.r.insecurePassword.removeClass("d-flex");
  }
});

$navbarUi.r.password.on("change", () => {
  if (! checkSecurePassword($navbarUi.r.password.val())) {
    $navbarUi.r.insecurePassword.removeClass("d-none");
    $navbarUi.r.insecurePassword.addClass("d-flex");
  }
});


// Check repeated password

$navbarUi.r.passwordRepeat.on("input", () => {
  if ($navbarUi.r.password.val() == $navbarUi.r.passwordRepeat.val()) {
    $navbarUi.r.btn.removeClass("disabled");
    $navbarUi.r.noMatchingPassword.addClass("d-none");
    $navbarUi.r.noMatchingPassword.removeClass("d-flex");
  }
});

$navbarUi.r.passwordRepeat.on("change", () => {
  if ($navbarUi.r.password.val() != $navbarUi.r.passwordRepeat.val()) {
    $navbarUi.r.btn.addClass("disabled");
    $navbarUi.r.noMatchingPassword.removeClass("d-none");
    $navbarUi.r.noMatchingPassword.addClass("d-flex");
  }
});

 // Check classcode

 $navbarUi.r.classcode.on("input", () => {
  $navbarUi.r.invalidClasscode.addClass("d-none");
  $navbarUi.r.invalidClasscode.removeClass("d-flex");
});

$navbarUi.lr.nextBtn.on("click", async () => {
  $navbarUi.lr.backBtn.removeClass("d-none");

  $("#login-register-title").addClass("d-none");
  $("#login-register-content").addClass("d-none");
  $navbarUi.lr.nextBtn.addClass("d-none");

  try {
    const exists = await checkExistingUsername($navbarUi.lr.username.val());

    if (exists) {
      $("#login-title").removeClass("d-none");
      $("#login-content").removeClass("d-none");
      $("#login-button").removeClass("d-none");
    } else {
      $("#register-title").removeClass("d-none");
      $("#register-content").removeClass("d-none");
      $navbarUi.r.btn.removeClass("d-none");
    }
  } catch (error) {
    console.error("Error checking username:", error);
    $navbarToasts.serverError.toast("show");
  }
});

$navbarUi.lr.backBtn.on("click", resetLoginRegisterModal);


user.on("login", () => {
  $("#login-register-button").addClass("d-none");
  $("#logout-button").removeClass("d-none");
});

user.on("logout", () => {
  $("#login-register-button").removeClass("d-none");
  $("#logout-button").addClass("d-none");
});