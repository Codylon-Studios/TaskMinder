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

function exitLoginRegisterPanel() {
  $(".login-register-element, .login-element, .register-element").addClass("d-none")
  if (user.class) {
    if (user.loggedIn) {
      window.location.href = "/main"
    }
    else {
      $("#decide-account-panel").removeClass("d-none")
    }
  }
  else {
    $("#decide-action-panel").removeClass("d-none")
  }
}

$("#login-register-back-btn").on("click", exitLoginRegisterPanel)

$(window).on("userDataLoaded", () => {
  user.on("login", exitLoginRegisterPanel)
})

$("#join-class-btn").on("click", async () => {
  const classcode = document.getElementById("join-class-classcode").value;

  try {
    const response = await fetch("/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classcode })
    });

    const data = await response.json();
    if (data.success) {
      localStorage.setItem("classcode", "true");
      $("#join-class-panel").addClass("d-none")
      $("#decide-account-panel").removeClass("d-none")
    } else {
      document.getElementById("error-invalid-classcode").classList.remove("d-none");
    }
  } catch (error) {
    console.error("Error joining class:", error);
  }
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
