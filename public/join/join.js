const user = $({})

user.on("login", () => {
  user.joinedClass = true
  if (user.joinedClass) {
    $(location).attr("href", "/");
  }
});

$("#show-join-class-btn").on("click", () => {
  $("#decide-action-panel").addClass("d-none")
  $("#join-class-panel").removeClass("d-none")
})

$("#show-login-register-btn").on("click", () => {
  $("#decide-action-panel").addClass("d-none")
  $("#login-register-panel").removeClass("d-none")
  $("#checkusername-content").removeClass("d-none")
})

$("#login-back-button").on("click", () => {
  $("#checkusername-content").removeClass("d-none")
  $("#login-content").addClass("d-none")
})

$("#register-back-button").on("click", () => {
  $("#register-content").addClass("d-none")
  $("#checkusername-content").removeClass("d-none")
})

$("#show-classcode-login-register-btn").on("click", () => {
  $("#decide-account-panel").addClass("d-none")
  $("#login-register-panel").removeClass("d-none")
  $("#checkusername-content").removeClass("d-none")
})

$("#join-class-back-btn").on("click", () => {
  $("#decide-action-panel").removeClass("d-none")
  $("#join-class-panel").addClass("d-none")
  $("#error-invalid-classcode").addClass("d-none")
})

$("#checkusername-back-btn").on("click", () => {
  if (localStorage.getItem("classcode") === "true") {
    $("#decide-account-panel").removeClass("d-none")
    $("#login-register-panel").addClass("d-none")
    $("#login-register-error-invalid-username").addClass("d-none")
  } else {
    $("#decide-action-panel").removeClass("d-none")
    $("#login-register-panel").addClass("d-none")
    $("#login-register-error-invalid-username").addClass("d-none")
  }
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

//REGISTER -- REGISTER -- REGISTER -- REGISTER
function registerAccount(username, password, classcode) {
  let data = {
    username: username,
    password: password,
    classcode: classcode
  };
  let hasResponded = false;

  $.ajax({
    url: "/account/register",
    type: 'POST',
    data: data,
    success: () => {
      $("#register-success-toast .username").text(username);
      $("#register-success-toast").toast("show");
      user.trigger("login");
      user.username = username;
    },
    error: (xhr) => {
      if (xhr.status === 400) {
        $("#register-error-no-data").removeClass("d-none");
        $("#register-error-no-data").addClass("d-flex");
      }
      else if (xhr.status === 401) {
        $("#register-error-invalid-classcode").removeClass("d-none");
        $("#register-error-invalid-classcode").addClass("d-flex");
      }
      else if (xhr.status === 500) {
        $("#error-server-toast").toast("show");
      }
      else {
        $("#unknown-error-toast").toast("show");
      }
    },
    complete: () => {
      hasResponded = true;
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
  let data = {
    username: username,
    password: password
  };
  let hasResponded = false;

  $.ajax({
    url: "/account/login",
    type: 'POST',
    data: data,
    success: () => {
      $("#login-success-toast .username").text(username);
      $("#login-success-toast").toast("show");
      user.trigger("login");
      user.username = username;
    },
    error: (xhr) => {
      if (xhr.status === 401) {
        $("#login-error-invalid-classcode").removeClass("d-none");
        $("#login-error-invalid-classcode").addClass("d-flex");
      }
      else if (xhr.status === 500) {
        $("#error-server-toast").toast("show");
      }
      else {
        $("#unknown-error-toast").toast("show");
      }
    },
    complete: () => {
      hasResponded = true;
    }
  });

  setTimeout(() => {
    if (!hasResponded) {
      $("#error-server-toast").toast("show");
    }
  }, 1000);
};

function checkExistingUsername(username) {
  let data = { username: username };
  let hasResponded = false;

  return new Promise((resolve) => {
    $.ajax({
      url: "/account/checkusername",
      type: 'POST',
      data: data,
      success: (res) => {
        resolve(res);
      },
      error: (xhr) => {
        if (xhr.status === 500) {
          $("#error-server-toast").toast("show");
        }
        else {
          $("#unknown-error-toast").toast("show");
        }
      },
      complete: () => {
        hasResponded = true;
      }
    });

    setTimeout(() => {
      if (!hasResponded) {
        $("#error-server-toast").toast("show");
      }
    }, 1000);
  })
}

function checkUsername(username) {
  return /^\w{4,20}$/.test(username);
}

function checkSecurePassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}[\]:;"'<>,.?/-]).{8,}$/.test(password);
}

//
//LOGIN -- LOGOUT -- REGISTER
//
$("#login-button").on("click", () => {
  let username = $("#login-register-username").val();
  let password = $("#login-password").val();
  loginAccount(username, password);
});

$("#register-button").on("click", () => {
  let username = $("#login-register-username").val();
  let password = $("#register-password").val();
  let classcode = $("#register-classcode").val();
  registerAccount(username, password, classcode);
});

$("#login-register-username").val("");

//CHECK username
$("#login-register-username").on("input", () => {
  if (checkUsername($("#login-register-username").val())) {
    $('#checkusername-next-button').removeClass("disabled");
    $('#login-register-error-invalid-username').addClass("d-none");
    $('#login-register-error-invalid-username').removeClass("d-flex");
  }
});
$("#login-register-username").on("change", () => {
  if (!checkUsername($("#login-register-username").val())) {
    $('#checkusername-next-button').addClass("disabled");
    $('#login-register-error-invalid-username').removeClass("d-none");
    $('#login-register-error-invalid-username').addClass("d-flex");
  }
});
$("#checkusername-next-button").on("click", async () => {
  $("#checkusername-content").addClass("d-none");

  checkExistingUsername($("#login-register-username").val()).then(response => {
    if (response) {
      $("#login-content").removeClass("d-none");
    } else {
      $("#register-content").removeClass("d-none");
    }
  })
});


//LOGIN
//CHECK login password
$("#login-password").on("input", () => {
  $('#login-error-invalid-password').addClass("d-none");
  $('#login-error-invalid-password').removeClass("d-flex");
});


//REGISTER
// Check register password
$("#register-password").on("input", () => {
  if (checkSecurePassword($("#register-password").val())) {
    $("#register-error-insecure-password").addClass("d-none");
    $("#register-error-insecure-password").removeClass("d-flex");
    $("#register-error-no-data").addClass("d-none");
    $("#register-error-no-data").removeClass("d-flex");
  }
});
$("#register-password").on("change", () => {
  if (!checkSecurePassword($("#register-password").val())) {
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
    $("#register-error-no-data").addClass("d-none");
    $("#register-error-no-data").removeClass("d-flex");
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
  $("#register-error-no-data").addClass("d-none");
  $("#register-error-no-data").removeClass("d-flex");
});