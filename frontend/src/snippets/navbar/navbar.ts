import {
  ajax,
  isSite,
  bootstrap,
  user,
  checkSecurePassword,
  showButtonLoading
} from "../../global/global.js";
import { AjaxError } from "../../global/types.js";

//REGISTER -- REGISTER -- REGISTER -- REGISTER
async function registerAccount(username: string, password: string): Promise<void> {
  const ajaxPromise = ajax("POST", "/api/account/register", {
    body: {
      username: username,
      password: password
    }
  });

  showButtonLoading($(".register-button:visible"), ajaxPromise);

  await ajaxPromise;

  $("#register-success-toast .username").text(username);
  $("#register-success-toast").toast("show");
  $("#login-register-modal").modal("hide");
  
  user.auth();
}

//LOGIN -- LOGIN -- LOGIN -- LOGIN -- LOGIN
async function loginAccount(username: string, password: string): Promise<void> {
  try {
    const ajaxPromise = ajax("POST", "/api/account/login", {
      body: {
        username,
        password
      },
      expectedErrors: [
        { status: 401, responseText: "Invalid credentials" }
      ]
    });

    showButtonLoading($(".login-button:visible"), ajaxPromise);

    await ajaxPromise;
    
    $("#login-success-toast .username").text(username);
    $("#login-success-toast").toast("show");
    $("#login-register-modal").modal("hide");

    user.auth();
  }
  catch (e) {
    const err = e as AjaxError;
    if (err.status === 401) {
      $(".login-error-invalid-password").removeClass("d-none").addClass("d-flex");
      $(".login-button").prop("disabled", true);
    }
  }
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

$("#nav-logout-button, #offcanvas-account-logout-button").on("click", async ev => {
  const ajaxPromise = ajax("POST", "/api/account/logout");

  showButtonLoading($(ev.target), ajaxPromise);

  await ajaxPromise;

  $("#logout-success-toast").toast("show");
    
  user.auth();
});

$(document).on("click", "#navbar-offcanvas .offcanvas-body a", () => {
  $("#navbar-offcanvas").offcanvas("hide");
});

export async function init(): Promise<void> {
  const b = await bootstrap();
  const available = b.online && !b.maintenance;
  $("#navbar-reload-button").toggle(isSite("uploads", "homework", "main", "events", "settings") && available);
  $("#login-register-button").toggle(!user.loggedIn && !isSite("join") && available);

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

    if (checkSecurePassword($(".login-register-username").val()?.toString() ?? "", $(".register-password").val()?.toString() ?? "")) {
      $(".register-error-insecure-password").addClass("d-none");
      $(".register-error-insecure-password").removeClass("d-flex");
    }

    if ($(".register-password").val() === $(".register-password-repeat").val()) {
      $(".register-error-no-matching-passwords").addClass("d-none").removeClass("d-flex");
      $(".register-button").prop("disabled", ! (
        $(".register-checkbox").prop("checked")
        && $(".register-password").val() !== ""
        && checkSecurePassword($(".login-register-username").val()?.toString() ?? "", $(".register-password").val()?.toString() ?? "")
      ));
    }
  });

  $(".register-password").off("change").on("change", () => {
    if (!checkSecurePassword($(".login-register-username").val()?.toString() ?? "", $(".register-password").val()?.toString() ?? "")) {
      $(".register-error-insecure-password").removeClass("d-none");
      $(".register-error-insecure-password").addClass("d-flex");
      $("#change-password-confirm").prop("disabled", true);
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
      $(".register-button").prop("disabled", ! (
        $(".register-checkbox").prop("checked")
        && checkSecurePassword($(".login-register-username").val()?.toString() ?? "", $(".register-password").val()?.toString() ?? "")
      ));
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
      $(this).prop("checked")
      && $(".register-password").val() === $(".register-password-repeat").val()
      && $(".register-password").val() !== ""
      && checkSecurePassword($(".login-register-username").val()?.toString() ?? "", $(".register-password").val()?.toString() ?? "")
    ));
  });

  $(".login-register-next-button").off("click").on("click", async () => {
    $(".login-register-back-button").removeClass("d-none");

    $(".login-register-element, .login-register-next-button").addClass("d-none");

    const res = await ajax("GET", "/api/account/check-username?username=" + ($(".login-register-username").val()?.toString() ?? ""));

    const isTaken = await res.json();
    if (isTaken) {
      $(".login-element").removeClass("d-none");
    }
    else {
      $(".register-element").removeClass("d-none");
    }
  });

  $(".login-register-back-button").off("click").on("click", resetLoginRegister);
}

$(() => {
  user.on("change", (function _() {
    $(".class-joined-content").toggle(user.classJoined ?? false);
    $(".navbar-home-link").attr("href", user.classJoined ? "/main" : "/landing");
    if (user.classJoined) $(".navbar-home-link").attr("data-pjax", ""); else $(".navbar-home-link").removeAttr("data-pjax");
    $("#login-register-button").toggle(!user.loggedIn && !isSite("join"));
    $("#nav-logout-button").toggle(user.loggedIn ?? false);
    $("#offcanvas-account").toggle(user.loggedIn ?? false);
    $("#offcanvas-account-name").text(user.username ?? "");
    return _;
  })());
});

$("#unavailable-hint").on("click", () => $("#unavailable-popup").toggle());
$(document).on("click", ev => {
  if ($(ev.target).closest("#unavailable-wrapper").length === 0) $("#unavailable-popup").hide();
});

export const $navbarToasts = {
  serverError: $("#error-server-toast"),
  unknownError: $("#unknown-error-toast"),
  notLoggedIn: $("#not-logged-in-toast")
};
