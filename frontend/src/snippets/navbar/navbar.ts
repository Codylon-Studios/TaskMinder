import { csrfToken, updateAll, userDataLoaded } from "../../global/global.js"

//REGISTER -- REGISTER -- REGISTER -- REGISTER
async function registerAccount(username: string, password: string) {
  let data = {
      username: username,
      password: password
  };
  let hasResponded = false;

  $.ajax({
    url: "/account/register",
    type: "POST",
    data: data,
    headers: {
      "X-CSRF-Token": await csrfToken(),
    },
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
async function loginAccount(username: string, password: string) {
  let data = {
      username: username,
      password: password
  };
  let hasResponded = false;

  $.ajax({
    url: "/account/login",
    type: "POST",
    data: data,
    headers: {
      "X-CSRF-Token": await csrfToken(),
    },
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
async function logoutAccount() {
  let hasResponded = false;

  $.ajax({
    url: "/account/logout",
    type: "POST",
    headers: {
      "X-CSRF-Token": await csrfToken(),
    },
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

function checkExistingUsername(username: string) {
  let data = { username: username };
  let hasResponded = false;

  return new Promise(async (resolve) => {
    $.ajax({
      url: "/account/checkusername",
      type: "POST",
      data: data,
      headers: {
        "X-CSRF-Token": await csrfToken(),
      },
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

function checkUsername(username: string) {
  return /^\w{4,20}$/.test(username);
}

function checkSecurePassword(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}[\]:;"<>,.?/-]).{8,}$/.test(password);
}

export const $navbarToasts = {
  serverError: $("#error-server-toast"),
  unknownError: $("#unknown-error-toast"),
  notLoggedIn: $("#not-logged-in-toast"),
}

$(async () => {
  updateAll();

  await userDataLoaded()
  if (user.classJoined) {
    $(".class-joined-content").removeClass("d-none")
    $(".navbar-home-link").attr("href", "/main")
  }
  if (["/main/", "/main", "/homework/", "/homework", "/events/", "/events"].includes(location.pathname)) {
    $(".class-page-content").removeClass("d-none")
  }
});

type UserEventName = "login" | "logout"
type UserEventCallback = (...args: any[]) => void;

export const user = {
  loggedIn: null as boolean | null,
  username: null as string | null,
  classJoined: null as boolean | null,
  _eventListeners: {} as Record<UserEventName, UserEventCallback[]>,

  on(event: UserEventName, callback: UserEventCallback) {
    if (! this._eventListeners[event]) {
      this._eventListeners[event] = [];
    }
    this._eventListeners[event].push(callback)
  },

  trigger(event: UserEventName, ...args: any[]) {
    const callbacks = this._eventListeners[event];
    if (callbacks) {
      callbacks.forEach(cb => cb(...args));
    }
  }
}

user.on("login", () => {
  user.loggedIn = true;
});

user.on("logout", () => {
  user.loggedIn = false;
  user.username = null;
});

if (! ["/join/", "/join"].includes(location.pathname)) {
  user.on("login", () => {
    $("#login-register-button").addClass("d-none");
    $("#logout-button").removeClass("d-none");
  });
  
  user.on("logout", () => {
    $("#login-register-button").removeClass("d-none");
    $("#logout-button").addClass("d-none");
  });
}

// Check if the user is logged in for the first time
$.get("/account/auth", (response) => {
  if (response.loggedIn) {
    user.loggedIn = true;
    user.username = response.account.username;
  } else {
    user.loggedIn = false;
    user.username = null;
  }

  user.classJoined = response.classJoined;

  $(window).trigger("userDataLoaded");

  if (response.loggedIn) {
    user.trigger("login");
  } else {
    user.trigger("logout");
  }
});

$(() => {
  //
  //LOGIN -- LOGOUT -- REGISTER
  //
  $(".login-button").on("click", () => {
    let username = $(".login-register-username").val()?.toString() ?? "";
    let password = $(".login-password").val()?.toString() ?? "";
    loginAccount(username, password);
  });

  $(".register-button").on("click", () => {
    let username = $(".login-register-username").val()?.toString() ?? "";
    let password = $(".register-password").val()?.toString() ?? "";
    registerAccount(username, password);
  });

  $("#logout-button").on("click", () => {
    logoutAccount();
  });

  $(".login-register-username").val("");

  $("#login-register-modal").on("show.bs.modal", () => {
    resetLoginRegisterModal();
    $(".login-register-username").val("");
    $(".login-register-next-button").addClass("disabled");
  });

  // Check username
  $(".login-register-username").on("input", function () {
    // Sync multiple instances of login possibilites
    $(".login-register-username").val($(this).val() ?? "")

    if (checkUsername($(".login-register-username").val()?.toString() ?? "")) {
      $(".login-register-next-button").removeClass("disabled");
      $(".login-register-error-invalid-username").addClass("d-none").removeClass("d-flex");
    }
  });

  $(".login-register-username").on("change", function () {
    // Sync multiple instances of login possibilites
    $(".login-register-username").val($(this).val() ?? "")

    if (! checkUsername($(".login-register-username").val()?.toString() ?? "")) {
      $(".login-register-next-button").addClass("disabled");
      $(".login-register-error-invalid-username").removeClass("d-none").addClass("d-flex");
    }
  });


  // Check login password
  $(".login-password").on("input", function () {
    // Sync multiple instances of login possibilites
    $(".login-password").val($(this).val() ?? "")

    $(".login-error-invalid-password").addClass("d-none");
    $(".login-error-invalid-password").removeClass("d-flex");
  });

  // Check register password

  $(".register-password").on("input", function () {
    // Sync multiple instances of login possibilites
    $(".register-password").val($(this).val() ?? "")

    if (checkSecurePassword($(".register-password").val()?.toString() ?? "")) {
      $(".register-error-insecure-password").addClass("d-none");
      $(".register-error-insecure-password").removeClass("d-flex");
    }
  });

  $(".register-password").on("change", () => {
    if (! checkSecurePassword($(".register-password").val()?.toString() ?? "")) {
      $(".register-error-insecure-password").removeClass("d-none");
      $(".register-error-insecure-password").addClass("d-flex");
    }
  });


  // Check repeated password
  $(".register-password-repeat").on("input", function () {
    // Sync multiple instances of login possibilites
    $(".register-password-repeat").val($(this).val() ?? "")

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

    checkExistingUsername($(".login-register-username").val()?.toString() ?? "").then(response => {
      if (response) {
        $(".login-element").removeClass("d-none");
      } else {
        $(".register-element").removeClass("d-none");
      }
    })
  });

  $(".login-register-back-button").on("click", resetLoginRegisterModal);
})
