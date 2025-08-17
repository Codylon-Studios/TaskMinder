import { csrfToken, isSite } from "../../global/global.js";

//REGISTER -- REGISTER -- REGISTER -- REGISTER
async function registerAccount(username: string, password: string): Promise<void> {
  const data = {
    username: username,
    password: password
  };
  let hasResponded = false;

  $.ajax({
    url: "/account/register",
    type: "POST",
    data: data,
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      $("#register-success-toast .username").text(username);
      $("#register-success-toast").toast("show");
      $("#login-register-modal").modal("hide");
      
      authUser();
    },
    error: xhr => {
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
  }, 5000);
}

//LOGIN -- LOGIN -- LOGIN -- LOGIN -- LOGIN
async function loginAccount(username: string, password: string): Promise<void> {
  const data = {
    username: username,
    password: password
  };
  let hasResponded = false;

  $.ajax({
    url: "/account/login",
    type: "POST",
    data: data,
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      $("#login-success-toast .username").text(username);
      $("#login-success-toast").toast("show");
      $("#login-register-modal").modal("hide");

      authUser();
    },
    error: xhr => {
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
  }, 5000);
}

async function checkExistingUsername(username: string): Promise<boolean> {
  const data = { username: username };
  const token = await csrfToken();
  let hasResponded = false;

  return new Promise(resolve => {
    $.ajax({
      url: "/account/checkusername",
      type: "POST",
      data: data,
      headers: {
        "X-CSRF-Token": token
      },
      success: res => {
        resolve(res);
      },
      error: xhr => {
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
    }, 5000);
  });
}

function resetLoginRegisterModal(): void {
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

function checkUsername(username: string): boolean {
  return /^\w{4,20}$/.test(username);
}

function checkSecurePassword(password: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}[\]:;"<>,.?/-]).{8,}$/.test(password);
}

export const $navbarToasts = {
  serverError: $("#error-server-toast"),
  unknownError: $("#unknown-error-toast"),
  notLoggedIn: $("#not-logged-in-toast")
};

$(async () => {
  if (isSite("main", "homework", "events")) {
    $(".class-page-content").removeClass("d-none");
  }
  user.on("change", (function _() {
    $(".class-joined-content").toggle(user.classJoined ?? false);
    $(".navbar-home-link").attr("href", user.classJoined ? "/main" : "/join");
    if (!isSite("join")) {
      $("#login-register-button").toggle(!user.loggedIn);
    }
    return _;
  })());
});

type UserEventName = "change";
type UserEventCallback = (...args: unknown[]) => void;

export const user = {
  loggedIn: null as boolean | null,
  username: null as string | null,
  classJoined: null as boolean | null,
  permissionLevel: null as number | null,
  changeEvents: 0,

  _eventListeners: {} as Record<UserEventName, UserEventCallback[]>,

  on(event: UserEventName, callback: UserEventCallback) {
    if (!this._eventListeners[event]) {
      this._eventListeners[event] = [];
    }
    this._eventListeners[event].push(callback);
    return this;
  },

  off(event: UserEventName) {
    this._eventListeners[event] = [];
    return this;
  },

  trigger(event: UserEventName, ...args: unknown[]) {
    const callbacks = this._eventListeners[event];
    if (callbacks) {
      callbacks.forEach(cb => cb(...args));
    }
    return this;
  }
};
if (isSite("join")) {
  $("#login-register-button").addClass("d-none");
}

export function authUser(): void {
  $.get("/account/auth", response => {
    if (response.loggedIn) {
      user.loggedIn = true;
      user.username = response.account.username;
    }
    else {
      user.loggedIn = false;
      user.username = null;
    }
  
    user.classJoined = response.classJoined;
    user.permissionLevel = response.permissionLevel;
  
    if (response.loggedIn) {
      user.loggedIn = true;
    }
    else {
      user.loggedIn = false;
      user.username = null;
    }

    user.changeEvents++;
    user.trigger("change");
  });
}

// Check if the user is logged in for the first time
authUser();

$(() => {
  //
  //LOGIN -- REGISTER
  //
  $(".login-button").on("click", () => {
    const username = $(".login-register-username").val()?.toString() ?? "";
    const password = $(".login-password").val()?.toString() ?? "";
    loginAccount(username, password);
  });

  $(".register-button").on("click", () => {
    const username = $(".login-register-username").val()?.toString() ?? "";
    const password = $(".register-password").val()?.toString() ?? "";
    registerAccount(username, password);
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
    $(".login-register-username").val($(this).val() ?? "");

    if (checkUsername($(".login-register-username").val()?.toString() ?? "")) {
      $(".login-register-next-button").removeClass("disabled");
      $(".login-register-error-invalid-username").addClass("d-none").removeClass("d-flex");
    }
  });

  $(".login-register-username").on("change", function () {
    // Sync multiple instances of login possibilites
    $(".login-register-username").val($(this).val() ?? "");

    if (!checkUsername($(".login-register-username").val()?.toString() ?? "")) {
      $(".login-register-next-button").addClass("disabled");
      $(".login-register-error-invalid-username").removeClass("d-none").addClass("d-flex");
    }
  });

  // Check login password
  $(".login-password").on("input", function () {
    // Sync multiple instances of login possibilites
    $(".login-password").val($(this).val() ?? "");

    $(".login-error-invalid-password").addClass("d-none");
    $(".login-error-invalid-password").removeClass("d-flex");
  });

  // Check register password

  $(".register-password").on("input", function () {
    // Sync multiple instances of login possibilites
    $(".register-password").val($(this).val() ?? "");

    if (checkSecurePassword($(".register-password").val()?.toString() ?? "")) {
      $(".register-error-insecure-password").addClass("d-none");
      $(".register-error-insecure-password").removeClass("d-flex");
    }
  });

  $(".register-password").on("change", () => {
    if (!checkSecurePassword($(".register-password").val()?.toString() ?? "")) {
      $(".register-error-insecure-password").removeClass("d-none");
      $(".register-error-insecure-password").addClass("d-flex");
    }
  });

  // Check repeated password
  $(".register-password-repeat").on("input", function () {
    // Sync multiple instances of login possibilites
    $(".register-password-repeat").val($(this).val() ?? "");

    if ($(".register-password").val() === $(".register-password-repeat").val()) {
      $(".register-button").removeClass("disabled");
      $(".register-error-no-matching-passwords").addClass("d-none");
      $(".register-error-no-matching-passwords").removeClass("d-flex");
    }
  });

  $(".register-password-repeat").on("change", () => {
    if ($(".register-password").val() !== $(".register-password-repeat").val()) {
      $(".register-button").addClass("disabled");
      $(".register-error-no-matching-passwords").removeClass("d-none");
      $(".register-error-no-matching-passwords").addClass("d-flex");
    }
  });

  $(".login-register-next-button").on("click", async () => {
    $(".login-register-back-button").removeClass("d-none");

    $(".login-register-element, .login-register-next-button").addClass("d-none");

    checkExistingUsername($(".login-register-username").val()?.toString() ?? "").then(response => {
      const isTaken = response;
      if (isTaken) {
        $(".login-element").removeClass("d-none");
      }
      else {
        $(".register-element").removeClass("d-none");
      }
    });
  });

  $(".login-register-back-button").on("click", resetLoginRegisterModal);
});
