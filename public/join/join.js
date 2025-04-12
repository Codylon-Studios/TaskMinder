$("#show-join-class-btn").on("click", () => {
  $("#decide-action-panel").addClass("d-none")
  $("#join-class-panel").removeClass("d-none")
})

$("#show-login-register-btn").on("click", () => {
  $("#decide-action-panel").addClass("d-none")
  $("#login-register-panel").removeClass("d-none")
  $(".login-register-element").removeClass("d-none")
})

$("#show-classcode-login-register-btn").on("click", () => {
  $("#decide-account-panel").addClass("d-none")
  $("#login-register-panel").removeClass("d-none")
  $(".login-register-element").removeClass("d-none")
})

$("#join-class-back-btn").on("click", () => {
  $("#decide-action-panel").removeClass("d-none")
  $("#join-class-panel").addClass("d-none")
  $("#error-invalid-classcode").addClass("d-none")
})

function onLogin() {
  $("#show-login-register-btn").addClass("disabled").find("i").removeClass("d-none")

  $.get('/account/auth', (response) => {
    user.classJoined = response.classJoined;

    if (user.classJoined) {
      location.href = "/main"
    }
  });

  if (! firstLogin) {
    $(".login-register-element, .login-element, .register-element").addClass("d-none")
    if (user.classJoined) {
      $("#decide-account-panel").removeClass("d-none")
    }
    else {
      $("#decide-action-panel").removeClass("d-none")
    }
  }
  firstLogin = false
}

$("#login-register-back-btn").on("click", () => {
  $(".login-register-element, .login-element, .register-element").addClass("d-none")
    if (user.classJoined) {
      $("#decide-account-panel").removeClass("d-none")
    }
    else {
      $("#decide-action-panel").removeClass("d-none")
    }
})

let firstLogin = true
$(window).on("userDataLoaded", () => {
  user.on("login", onLogin)
  user.on("logout", () => {firstLogin = false})
})

$("#join-class-btn").on("click", async () => {
  const classcode = document.getElementById("join-class-classcode").value;

  let data = {
      classcode: classcode,
    };

    $.ajax({
    url: "/account/join",
    type: 'POST',
    data: data,
    success: () => {
      $("#join-class-panel").addClass("d-none")
      $("#decide-account-panel").removeClass("d-none")
      user.classJoined = true
      if (user.loggedIn) {
        location.href = "/main"
      }
    },
    error: (xhr) => {
      if (xhr.status === 401) {
        document.getElementById("error-invalid-classcode").classList.remove("d-none");
      }
      else if (xhr.status === 500) {
        $navbarToasts.serverError.toast("show");
      }
    }
  });
});

$("#join-class-classcode").on("input", () => {
  $("#error-invalid-classcode").addClass("d-none")
})

let urlParams = new URLSearchParams(window.location.search)

if (urlParams.has("action")) {
  if (urlParams.get("action") == "join") {
    $("#decide-action-panel").addClass("d-none")
    $("#join-class-panel").removeClass("d-none")
  }
  else if (urlParams.get("action") == "account") {
    $("#decide-action-panel").addClass("d-none")
    $("#decide-account-panel").removeClass("d-none")
  }
}

if (urlParams.has("classcode")) {
  $("#join-class-classcode").val(urlParams.get("classcode"))
  $("#join-class-btn").trigger("click");
}
else {
  $("#join-class-classcode").val("")
}

function checkUsername(username) {
  return /^\w{4,20}$/.test(username);
}

function checkSecurePassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}[\]:;"'<>,.?/-]).{8,}$/.test(password);
}
