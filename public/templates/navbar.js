//REGISTER -- REGISTER -- REGISTER -- REGISTER
function registerAccount(username, password) {
  let data = {
      username: username,
      password: password
  };
  let hasResponded = false;

  $.ajax({
    url: "/account/register",
    type: 'POST',
    data: data,
    success: () => {
      $("#register-success-toast .username").text(username);
      $("#register-success-toast").toast("show");
      $("#login-register-modal").modal("hide");
      user.trigger("login");
      user.username = username;
    },
    error: (xhr) => {
      if (xhr.status === 500) {
        $navbarToasts.serverError.toast("show");
      }
      else {
        $navbarToasts.unknownError.toast("show");
      }
    },
    complete: () => {
      hasResponded = true;
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
      $("#login-register-modal").modal("hide");
      user.trigger("login");
      user.username = username;
    },
    error: (xhr) => {
      if (xhr.status === 401) {
        $(".login-error-invalid-password").removeClass("d-none");
        $(".login-error-invalid-password").addClass("d-flex");
      }
      else if (xhr.status === 500) {
        $navbarToasts.serverError.toast("show");
      }
      else {
        $navbarToasts.unknownError.toast("show");
      }
    },
    complete: () => {
      hasResponded = true;
    }
  });

  setTimeout(() => {
    if (!hasResponded) {
      $navbarToasts.serverError.toast("show");
    }
  }, 1000);
};

//LOGOUT -- LOGOUT -- LOGOUT
function logoutAccount() {
  let hasResponded = false;

  $.ajax({
    url: "/account/logout",
    type: 'POST',
    success: () => {
      $("#logout-success-toast").toast("show");
      user.trigger("logout");
    },
    error: (xhr) => {
      if (xhr.status === 500) {
        $navbarToasts.serverError.toast("show");
      }
      else {
        $navbarToasts.unknownError.toast("show");
      }
    },
    complete: () => {
      hasResponded = true;
    }
  });

  setTimeout(() => {
    if (!hasResponded) {
      $navbarToasts.serverError.toast("show");
    }
  }, 1000);
}

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
          $navbarToasts.serverError.toast("show");
        }
        else {
          $navbarToasts.unknownError.toast("show");
        }
      },
      complete: () => {
        hasResponded = true;
      }
    });
  
    setTimeout(() => {
      if (!hasResponded) {
        $navbarToasts.serverError.toast("show");
      }
    }, 1000);
  })
}

function resetLoginRegisterModal() {
  $(".login-register-element").removeClass("d-none");
  $(".login-element").addClass("d-none");
  $(".register-element").addClass("d-none");

  $(".login-password").val("");
  $(".register-password").val("");
  $(".register-password").val("");
  
  $(".login-register-next-button").removeClass("d-none");
  $(".login-register-back-button").addClass("d-none");
  $(".login-button").addClass("d-none");
  $(".register-button").addClass("d-none");

  $(".login-register-error-invalid-username").addClass("d-none").removeClass("d-flex");

  $(".login-error-invalid-password").addClass("d-none");
  $(".login-error-invalid-password").removeClass("d-flex");

  $(".register-error-insecure-password").addClass("d-none");
  $(".register-error-insecure-password").removeClass("d-flex");
}

function updateColorTheme() {
  if ($("#color-theme-dark")[0].checked) {
    colorTheme = "dark"
    localStorage.setItem("colorTheme", "dark");
  }
  else if ($("#color-theme-light")[0].checked) {
    colorTheme = "light"
    localStorage.setItem("colorTheme", "light");
  }
  else {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      colorTheme = "dark"
    }
    else {
      colorTheme = "light"
    }
    localStorage.setItem("colorTheme", "auto");
  }

  if (colorTheme == "light") {
    document.getElementsByTagName("html")[0].style.background = "#ffffff";
    document.body.setAttribute("data-bs-theme", "light");
    $(`meta[name="theme-color"]`).attr("content", "#f8f9fa")
  }
  else {
    document.getElementsByTagName("html")[0].style.background = "#212529";
    document.body.setAttribute("data-bs-theme", "dark");
    $(`meta[name="theme-color"]`).attr("content", "#2b3035")
  }
}

function checkUsername(username) {
  return /^\w{4,20}$/.test(username);
}

function checkSecurePassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}[\]:;"'<>,.?/-]).{8,}$/.test(password);
}

async function updateTeamSelectionList() {
  await dataLoaded("joinedTeamsData");
  await dataLoaded("teamsData");
  
  $("#team-list").empty()

  teamsData.forEach((team, teamId) => {
    let selected = joinedTeamsData.includes(teamId)
    let template = `
      <div class="form-check">
        <input type="checkbox" class="form-check-input" data-id="${teamId}" id="team-selection-team-${teamId}" ${(selected) ? "checked" : ""}>
        <label class="form-check-label" for="team-selection-team-${teamId}">
          ${team.name}
        </label>
      </div>`;
    $("#team-list").append(template)
  })
}

let $navbarToasts = {
  serverError: $("#error-server-toast"),
  unknownError: $("#unknown-error-toast"),
  notLoggedIn: $("#not-logged-in-toast"),
}

$(async () => {
  updateAllFunctions.push(() => {
    updateTeamSelectionList();
  });

  requiredData.push(
    "joinedTeamsData",
    "teamsData"
  )
  
  updateAll();

  await userDataLoaded()
  if (user.classJoined) {
    $(".class-joined-content").removeClass("d-none")
    $(".navbar-home-link").attr("href", "/main")
  }
  if (["/main/", "/homework/", "/events/"].includes(location.pathname)) {
    $(".class-page-content").removeClass("d-none")
  }
});

// Create the user object with a username variable and event listeners
const user = $({})

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
  if (response.loggedIn) {
    user.username = response.account.username;
  } else {
    user.username = null;
  }

  $(window).trigger("userDataLoaded");

  if (response.loggedIn) {
    user.trigger("login");
  } else {
    user.trigger("logout");
  }

  user.classJoined = response.classJoined;
});

//
//LOGIN -- LOGOUT -- REGISTER
//
$(".login-button").on("click", () => {
  let username = $(".login-register-username").val();
  let password = $(".login-password").val();
  loginAccount(username, password);
});

$(".register-button").on("click", () => {
  let username = $(".login-register-username").val();
  let password = $(".register-password").val();
  registerAccount(username, password);
});

$("#logout-button").on("click", () => {
  logoutAccount();
});

let animations = JSON.parse(localStorage.getItem("animations"));
if (animations == undefined) animations = true
$("#animations input").prop("checked", animations);
$("#animations input").on("click", function () {
  animations = $(this).prop("checked");
  localStorage.setItem("animations", animations)
})

let colorThemeSetting = localStorage.getItem("colorTheme") || "auto";
document.body.setAttribute("data-bs-theme", colorTheme);
$("#color-theme-auto").prop("checked", colorThemeSetting == "auto") 
$("#color-theme-dark").prop("checked", colorThemeSetting == "dark") 
$("#color-theme-light").prop("checked", colorThemeSetting == "light")

$("#color-theme input").each(() => {
  $(this).on("click", () => {
    updateColorTheme();
  });
});

window.matchMedia('(prefers-color-scheme: light)').addEventListener("change", updateColorTheme)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener("change", updateColorTheme)

$(".login-register-username").val("");

$("#login-register-modal").on("show.bs.modal", () => {
  resetLoginRegisterModal();
  $(".login-register-username").val("");
  $(".login-register-next-button").addClass("disabled");
});

// Check username
$(".login-register-username").on("input", function () {
  // Sync multiple instances of login possibilites
  $(".login-register-username").val($(this).val())

  if (checkUsername($(".login-register-username").val())) {
    $(".login-register-next-button").removeClass("disabled");
    $(".login-register-error-invalid-username").addClass("d-none").removeClass("d-flex");
  }
});

$(".login-register-username").on("change", function () {
  // Sync multiple instances of login possibilites
  $(".login-register-username").val($(this).val())

  if (! checkUsername($(".login-register-username").val())) {
    $(".login-register-next-button").addClass("disabled");
    $(".login-register-error-invalid-username").removeClass("d-none").addClass("d-flex");
  }
});


// Check login password
$(".login-password").on("input", function () {
  // Sync multiple instances of login possibilites
  $(".login-password").val($(this).val())

  $(".login-error-invalid-password").addClass("d-none");
  $(".login-error-invalid-password").removeClass("d-flex");
});

// Check register password

$(".register-password").on("input", function () {
  // Sync multiple instances of login possibilites
  $(".register-password").val($(this).val())

  if (checkSecurePassword($(".register-password").val())) {
    $(".register-error-insecure-password").addClass("d-none");
    $(".register-error-insecure-password").removeClass("d-flex");
  }
});

$(".register-password").on("change", () => {
  if (! checkSecurePassword($(".register-password").val())) {
    $(".register-error-insecure-password").removeClass("d-none");
    $(".register-error-insecure-password").addClass("d-flex");
  }
});


// Check repeated password
$(".register-password-repeat").on("input", function () {
  // Sync multiple instances of login possibilites
  $(".register-password-repeat").val($(this).val())

  if ($(".register-password").val() == $(".register-password-repeat").val()) {
    $(".register-button").removeClass("disabled");
    $(".register-error-no-matching-passwords").addClass("d-none");
    $(".register-error-no-matching-passwords").removeClass("d-flex");
  }
});

$(".register-password-repeat").on("change", () => {
  if ($(".register-password").val() != $(".register-password-repeat").val()) {
    $(".register-button").addClass("disabled");
    $(".register-error-no-matching-passwords").removeClass("d-none");
    $(".register-error-no-matching-passwords").addClass("d-flex");
  }
});

$(".login-register-next-button").on("click", async () => {
  $(".login-register-back-button").removeClass("d-none");

  $(".login-register-element, .login-register-next-button").addClass("d-none");

  checkExistingUsername($(".login-register-username").val()).then(response => {
    if (response) {
      $(".login-element").removeClass("d-none");
    } else {
      $(".register-element").removeClass("d-none");
    }
  })
});

$(".login-register-back-button").on("click", resetLoginRegisterModal);


if (location.pathname != "/join/") {
  user.on("login", () => {
    $("#login-register-button").addClass("d-none");
    $("#logout-button").removeClass("d-none");
  });
  
  user.on("logout", () => {
    $("#login-register-button").removeClass("d-none");
    $("#logout-button").addClass("d-none");
  });
}

$("#team-selection-save").on("click", () => {
  let newJoinedTeamsData = []
  $("#team-list input").each(function () {
    if ($(this).prop("checked")) {
      newJoinedTeamsData.push(Number($(this).data("id")))
    }
  })
  joinedTeamsData = newJoinedTeamsData;

  if (user.loggedIn) {
    let data = {
      teams: joinedTeamsData,
    };
    let hasResponded = false;

    $.ajax({
      url: "/teams/set_joined_teams_data",
      type: 'POST',
      data: data,
      error: (xhr) => {
        if (xhr.status === 401) {
          $navbarToasts.serverError.toast("show");
        }
        else if (xhr.status === 500) {
          $navbarToasts.serverError.toast("show");
        }
        else {
          $navbarToasts.unknownError.toast("show");
        }
      },
      complete: () => {
        hasResponded = true;
      }
    });

    setTimeout(() => {
      if (!hasResponded) {
        $navbarToasts.serverError.toast("show");
      }
    }, 1000);
  }
  else {
    localStorage.setItem("joinedTeamsData", JSON.stringify(joinedTeamsData))
  }
  
  $("#team-selection-modal").modal("hide")
  updateAll()
})
