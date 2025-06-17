import { addUpdateAllFunction, csrfToken, reloadAll } from "../../global/global.js";
import { $navbarToasts, user } from "../../snippets/navbar/navbar.js";

$("#show-join-class-btn").on("click", () => {
  $("#decide-action-panel").addClass("d-none");
  $("#join-class-panel").removeClass("d-none");
});

$("#show-login-register-btn").on("click", () => {
  $("#decide-action-panel").addClass("d-none");
  $("#login-register-panel").removeClass("d-none");
  $(".login-register-element").removeClass("d-none");
});

$("#show-classcode-login-register-btn").on("click", () => {
  $("#decide-account-panel").addClass("d-none");
  $("#login-register-panel").removeClass("d-none");
  $(".login-register-element").removeClass("d-none");
});

$("#join-class-back-btn").on("click", () => {
  $("#decide-action-panel").removeClass("d-none");
  $("#join-class-panel").addClass("d-none");
  $("#error-invalid-classcode").addClass("d-none");
});

$(() => {
  addUpdateAllFunction(() => {});
  reloadAll();
});

$("#login-register-back-btn").on("click", () => {
  $(".login-register-element, .login-element, .register-element").addClass("d-none");
  if (user.classJoined) {
    $("#decide-account-panel").removeClass("d-none");
  }
  else {
    $("#decide-action-panel").removeClass("d-none");
  }
});

user.on("change", () => {
  if (user.loggedIn) {
    $("#show-login-register-btn").addClass("disabled").find("i").removeClass("d-none");
    if (user.classJoined) {
      location.href = "/main";
    }
    else if (urlParams.get("action") != "join") {
      $("#decide-action-panel").removeClass("d-none");
    }
    $(".login-register-element, .login-element, .register-element").addClass("d-none");
  }
});

$("#join-class-btn").on("click", async () => {
  const classcode = $("#join-class-classcode").val();

  const data = {
    classcode: classcode
  };

  $.ajax({
    url: "/account/join",
    type: "POST",
    data: data,
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      $("#join-class-panel").addClass("d-none");
      $("#decide-account-panel").removeClass("d-none");
      user.classJoined = true;
      user.trigger("change");
      if (user.loggedIn) {
        location.href = "/main";
      }
      $(".class-joined-content").removeClass("d-none");
      $(".navbar-home-link").attr("href", "/main");
    },
    error: xhr => {
      if (xhr.status === 401) {
        $("#error-invalid-classcode").removeClass("d-none");
      }
      else if (xhr.status === 500) {
        $navbarToasts.serverError.toast("show");
      }
    }
  });
});

$("#join-class-classcode").on("input", () => {
  $("#error-invalid-classcode").addClass("d-none");
});

const urlParams = new URLSearchParams(window.location.search);

if (urlParams.get("action") == "join") {
  $("#decide-action-panel").addClass("d-none");
  $("#join-class-panel").removeClass("d-none");
}
else if (urlParams.get("action") == "account") {
  $("#decide-action-panel").addClass("d-none");
  $("#decide-account-panel").removeClass("d-none");
}

if (urlParams.has("classcode")) {
  $("#join-class-classcode").val(urlParams.get("classcode") ?? "");
  $("#join-class-btn").trigger("click");
}
else {
  $("#join-class-classcode").val("");
}
