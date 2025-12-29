import { csrfToken, isSite } from "../../global/global.js";
import { UserEventCallback, UserEventName } from "./types.js";

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
      
      user.auth();
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

      user.auth();
    },
    error: xhr => {
      if (xhr.status === 401) {
        $(".login-error-invalid-password").removeClass("d-none").addClass("d-flex");
        $(".login-button").prop("disabled", true);
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

export function resetLoginRegister(): void {
  $(".login-register-element").removeClass("d-none");
  $(".login-element").addClass("d-none");
  $(".register-element").addClass("d-none");

  $(".login-password").val("");
  $(".register-password").val("");
  $(".register-password-repeat").val("");
  $(".register-checkbox").prop("checked", false);

  $(".login-register-next-button").removeClass("d-none");
  $(".login-register-back-button").addClass("d-none");
  $(".login-button").addClass("d-none").prop("disabled", true);
  $(".register-button").addClass("d-none").prop("disabled", true);

  $(".login-register-error-invalid-username").addClass("d-none").removeClass("d-flex");

  $(".login-error-invalid-password").addClass("d-none").removeClass("d-flex");

  $(".register-error-insecure-password").addClass("d-none").removeClass("d-flex");
  $(".register-error-no-matching-passwords").addClass("d-none").removeClass("d-flex");
}

function checkUsername(username: string): boolean {
  return /^\w{4,20}$/.test(username);
}

function checkSecurePassword(password: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}[\]:;"<>,.?/-]).{8,}$/.test(password);
}

$("#nav-logout-button, #offcanvas-account-logout-button").on("click", async () => {
  let hasResponded = false;

  $.ajax({
    url: "/account/logout",
    type: "POST",
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      $("#logout-success-toast").toast("show");
        
      user.auth();
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
  }, 1000);
});

$(document).on("click", "#navbar-offcanvas .offcanvas-body a", () => {
  $("#navbar-offcanvas").offcanvas("hide");
});

export async function init(): Promise<void> {
  $("#navbar-reload-button").toggle(isSite("uploads", "homework", "main", "events", "settings"));
  $("#login-register-button").toggleClass("d-none", isSite("join"));

  //
  //LOGIN -- REGISTER
  //
  $(".login-button").off("click").on("click", () => {
    const username = $(".login-register-username").val()?.toString() ?? "";
    const password = $(".login-password").val()?.toString() ?? "";
    loginAccount(username, password);
  });

  $(".register-button").off("click").on("click", () => {
    const username = $(".login-register-username").val()?.toString() ?? "";
    const password = $(".register-password").val()?.toString() ?? "";
    registerAccount(username, password);
  });

  $("#login-register-modal").off("show.bs.modal").on("show.bs.modal", () => {
    $(".login-register-username").val("");
    $(".login-register-next-button").prop("disabled", true);
    resetLoginRegister();
  });

  // Check username
  $(".login-register-username").off("input").on("input", function () {
    // Sync multiple instances of login possibilites
    $(".login-register-username").val($(this).val() ?? "");

    if (checkUsername($(".login-register-username").val()?.toString() ?? "")) {
      $(".login-register-next-button").prop("disabled", false);
      $(".login-register-error-invalid-username").addClass("d-none").removeClass("d-flex");
    }
  });

  $(".login-register-username").off("change").on("change", function () {
    if (!checkUsername($(".login-register-username").val()?.toString() ?? "")) {
      $(".login-register-next-button").prop("disabled", true);
      $(".login-register-error-invalid-username").removeClass("d-none").addClass("d-flex");
    }
  });

  // Check login password
  $(".login-password").off("input").on("input", function () {
    // Sync multiple instances of login possibilites
    $(".login-password").val($(this).val() ?? "");

    $(".login-error-invalid-password").addClass("d-none").removeClass("d-flex");
    $(".login-button").prop("disabled", false);
  });

  $(".login-password").off("change").on("change", function () {
    $(".login-button").prop("disabled", $(this).val() === "");
  });

  // Check register password

  $(".register-password").off("input").on("input", function () {
    // Sync multiple instances of login possibilites
    $(".register-password").val($(this).val() ?? "");

    if (checkSecurePassword($(".register-password").val()?.toString() ?? "")) {
      $(".register-error-insecure-password").addClass("d-none");
      $(".register-error-insecure-password").removeClass("d-flex");
    }

    if ($(".register-password").val() === $(".register-password-repeat").val()) {
      $(".register-error-no-matching-passwords").addClass("d-none").removeClass("d-flex");
      $(".register-button").prop("disabled", ! ($(".register-checkbox").prop("checked") && $(".register-password").val() !== ""));
    }
  });

  $(".register-password").off("change").on("change", () => {
    if (!checkSecurePassword($(".register-password").val()?.toString() ?? "")) {
      $(".register-error-insecure-password").removeClass("d-none");
      $(".register-error-insecure-password").addClass("d-flex");
    }

    if ($(".register-password").val() !== $(".register-password-repeat").val() && $(".register-password-repeat").val() !== "") {
      $(".register-error-no-matching-passwords").removeClass("d-none").addClass("d-flex");
    }
  });

  // Check repeated password
  $(".register-password-repeat").off("input").on("input", function () {
    // Sync multiple instances of login possibilites
    $(".register-password-repeat").val($(this).val() ?? "");

    if ($(".register-password").val() === $(".register-password-repeat").val() && $(".register-password").val() !== "") {
      $(".register-button").prop("disabled", ! $(".register-checkbox").prop("checked"));
      $(".register-error-no-matching-passwords").addClass("d-none").removeClass("d-flex");
    }
  });

  $(".register-password-repeat").off("change").on("change", () => {
    if ($(".register-password").val() !== $(".register-password-repeat").val()) {
      $(".register-button").prop("disabled", true);
      $(".register-error-no-matching-passwords").removeClass("d-none").addClass("d-flex");
    }
    if ($(".register-password").val() === "") {
      $(".register-button").prop("disabled", true);
    }
  });

  $(".register-checkbox").off("change").on("change", function () {
    $(".register-checkbox").prop("checked", $(this).prop("checked"));
    $(".register-button").prop("disabled", !(
      $(this).prop("checked") && $(".register-password").val() === $(".register-password-repeat").val() && $(".register-password").val() !== ""
    ));
  });

  $(".login-register-next-button").off("click").on("click", async () => {
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

  $(".login-register-back-button").off("click").on("click", resetLoginRegister);
}

$(() => {
  user.on("change", (function _() {
    $(".class-joined-content").toggle(user.classJoined ?? false);
    $(".navbar-home-link").attr("href", user.classJoined ? "/main" : "/join");
    if (!isSite("join")) {
      $("#login-register-button").toggle(!user.loggedIn);
    }
    $("#nav-logout-button").toggle(user.loggedIn ?? false);
    $("#offcanvas-account").toggle(user.loggedIn ?? false);
    $("#offcanvas-account-name").text(user.username ?? "");
    return _;
  })());
});

export const $navbarToasts = {
  serverError: $("#error-server-toast"),
  unknownError: $("#unknown-error-toast"),
  notLoggedIn: $("#not-logged-in-toast")
};

export const user = {
  isAuthed: false as boolean,
  loggedIn: null as boolean | null,
  username: null as string | null,
  classJoined: null as boolean | null,
  permissionLevel: 0 as number,
  changeEvents: 0,

  _eventListeners: {} as Record<UserEventName, UserEventCallback[]>,

  async auth(settings?: {silent?: boolean}) {
    await $.get("/account/auth", response => {
      user.isAuthed = true;

      if (response.loggedIn) {
        user.loggedIn = true;
        user.username = response.account.username;
      }
      else {
        user.loggedIn = false;
        user.username = null;
      }
    
      user.classJoined = response.classJoined;
      user.permissionLevel = response.permissionLevel ?? 0;
    
      if (response.loggedIn) {
        user.loggedIn = true;
      }
      else {
        user.loggedIn = false;
        user.username = null;
      }

      user.changeEvents++;
      user.trigger("change", settings);
    });
  },

  async awaitAuthed() {
    if (this.isAuthed) return;
    return new Promise<void>(res => {
      this.on("change", () => {
        if (this.isAuthed) res();
      });
    });
  },

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
    for (const cb of this._eventListeners[event]) {
      cb(...args);
    }
    return this;
  }
};
