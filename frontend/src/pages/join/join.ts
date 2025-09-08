import { csrfToken, reloadAllFn } from "../../global/global.js";
import { $navbarToasts, authUser, resetLoginRegister, user } from "../../snippets/navbar/navbar.js";

function checkClassName(className: string): boolean {
  return /^[\wÄÖÜäöü\s\-.]{2,50}$/.test(className);
}

let justCreatedClass = false;

const qrCode = new QRCode("show-qrcode-modal-qrcode", {
  text: location.host,
  width: 300,
  height: 300
});

$("#show-join-class-btn").on("click", () => {
  $("#decide-action-panel").addClass("d-none");
  $("#join-class-panel").removeClass("d-none");
  $("#join-class-class-code").val("");
  $("#join-class-checkbox").prop("checked", false);
  $("#join-class-btn").prop("disabled", true);
});

$("#show-login-register-btn").on("click", () => {
  $("#decide-action-panel").addClass("d-none");
  $("#login-register-panel").removeClass("d-none");
  $(".login-register-username").val("");
  $(".login-register-next-button").prop("disabled", true);
  resetLoginRegister();
  $(".login-register-element").removeClass("d-none");
});

$("#show-joined-login-register-btn").on("click", () => {
  $("#decide-account-panel").addClass("d-none");
  $("#login-register-panel").removeClass("d-none");
  $(".login-register-username").val("");
  $(".login-register-next-button").prop("disabled", true);
  resetLoginRegister();
  $(".login-register-element").removeClass("d-none");
});

$("#join-class-back-btn").on("click", () => {
  $("#decide-action-panel").removeClass("d-none");
  $("#join-class-panel").addClass("d-none");
  $("#error-invalid-class-code").addClass("d-none");
});

$("#show-create-class-btn").on("click", () => {
  $("#decide-action-panel").addClass("d-none");
  $("#create-class-is-test-panel").removeClass("d-none");
});

$("#create-class-is-test-back-btn").on("click", () => {
  $("#decide-action-panel").removeClass("d-none");
  $("#create-class-is-test-panel").addClass("d-none");
});

$("#create-class-continue-btn").on("click", () => {
  $("#create-class-is-test-panel").addClass("d-none");
  $("#create-class-credentials-panel").removeClass("d-none");
  $("#create-class-name").removeClass("is-invalid").val("");
  $("#create-class-btn").prop("disabled", true);
});

$("#create-class-credentials-back-btn").on("click", () => {
  $("#create-class-is-test-panel").removeClass("d-none");
  $("#create-class-credentials-panel").addClass("d-none");
});

$(() => {
  reloadAllFn.set(async () => {
  });
  $.get("/class/get_class_info")
    .done(res => {
      const resClassName = res.className;
      $("#decide-account-class-name").text(resClassName);
    });
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
  if (user.loggedIn && !justCreatedClass) {
    $("#show-login-register-btn").prop("disabled", true).find("i").removeClass("d-none");
    if (user.classJoined) {
      location.href = "/main";
    }
    else if (urlParams.get("action") !== "join") {
      $("#decide-action-panel").removeClass("d-none");
    }
    $(".login-register-element, .login-element, .register-element").addClass("d-none");
    $("#show-create-class-btn").prop("disabled", false).find("~ .form-text").hide();
  }
});

$("#join-class-btn").on("click", async () => {
  const classCode = $("#join-class-class-code").val();

  const data = {
    classCode: classCode
  };

  $.ajax({
    url: "/class/join",
    type: "POST",
    data: data,
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: res => {
      if (user.loggedIn) {
        location.href = "/main";
      }
      $("#join-class-panel").addClass("d-none");
      $("#decide-account-panel").removeClass("d-none");
      authUser();
      $(".class-joined-content").removeClass("d-none");
      $(".navbar-home-link").attr("href", "/main");
      const className = res;
      $("#decide-account-class-name").text(className);
    },
    error: xhr => {
      if (xhr.status === 404) {
        $("#error-invalid-class-code").removeClass("d-none");
        $("#join-class-btn").prop("disabled", true);
      }
      else if (xhr.status === 500) {
        $navbarToasts.serverError.toast("show");
      }
    }
  });
});

$("#join-class-class-code").on("input", function () {
  $("#error-invalid-class-code").addClass("d-none");
  if ($(this).val() !== "" && $("#join-class-checkbox").prop("checked")) {
    $("#join-class-btn").prop("disabled", false);
  }
});

$("#join-class-class-code").on("change", function () {
  $("#join-class-btn").prop("disabled");
  if (!($(this).val() !== "" && $("#join-class-checkbox").prop("checked") && ! $("#error-invalid-class-code").is(":visible"))) {
    $("#join-class-btn").prop("disabled", true);
  }
});

$("#join-class-checkbox").on("input", function () {
  $("#join-class-btn").prop("disabled", !(
    $("#join-class-class-code").val() !== "" && $(this).prop("checked") && ! $("#error-invalid-class-code").is(":visible")
  ));
});

$("#create-class-name").on("change", function () {
  if (!checkClassName($(this).val()?.toString() ?? "")) {
    $("#create-class-name").addClass("is-invalid");
    $("#create-class-btn").prop("disabled", true);
  }
});

$("#create-class-name").on("input", function () {
  if (checkClassName($(this).val()?.toString() ?? "")) {
    $("#create-class-name").removeClass("is-invalid");
    $("#create-class-btn").prop("disabled", false);
  }
});

$("#create-class-btn").on("click", async () => {
  const className = $("#create-class-name").val()?.toString() ?? "";
  $("#show-qrcode-modal-title b").text(className);

  let hasResponded = false;
  // Post the request
  $.ajax({
    url: "/class/create_class",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      classDisplayName: className,
      isTestClass: $("#create-class-is-test").prop("checked")
    }),
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: res => {
      justCreatedClass = true;
      authUser();
      const classCode = res;
      qrCode.makeCode(location.host + `/join?class_code=${classCode}`);
      $("#create-class-credentials-panel").addClass("d-none");

      $("#invite-panel").removeClass("d-none");
      $("#invite-copy-link").on("click", async () => {
        try {
          await navigator.clipboard.writeText(location.host + `/join?class_code=${classCode}`);

          $("#invite-copy-link").prop("disabled", true)
            .html("<i class=\"fa-solid fa-check-circle\" aria-hidden=\"true\"></i> Einladungslink kopiert");

          setTimeout(() => {
            $("#invite-copy-link").prop("disabled", false)
              .html("<i class=\"fa-solid fa-link\" aria-hidden=\"true\"></i> Einladungslink kopieren");
          }, 2000);
        }
        catch (err) {
          console.error("Error copying classcode to clipboard:", err);
        }
      });
    },
    error: xhr => {
      if (xhr.status === 401) {
        // The user has to be logged in but isn't
        // Show an error notification
        $navbarToasts.notLoggedIn.toast("show");
      }
      else if (xhr.status === 500) {
        // An internal server error occurred
        $navbarToasts.serverError.toast("show");
      }
      else {
        $navbarToasts.unknownError.toast("show");
      }
    },
    complete: () => {
      // The server has responded
      hasResponded = true;
    }
  });
  setTimeout(() => {
    // Wait for 1s
    if (!hasResponded) {
      // If the server hasn't answered, show the internal server error notification
      $navbarToasts.serverError.toast("show");
    }
  }, 1000);
});

const urlParams = new URLSearchParams(window.location.search);

if (urlParams.get("action") === "join" || urlParams.has("class_code")) {
  $("#decide-action-panel").addClass("d-none");
  $("#join-class-panel").removeClass("d-none");
  $("#join-class-class-code").val("");
  $("#join-class-checkbox").prop("checked", false);
  $("#join-class-btn").prop("disabled", true);
}
else if (urlParams.get("action") === "account") {
  $("#decide-action-panel").addClass("d-none");
  $("#decide-account-panel").removeClass("d-none");
}

if (urlParams.has("class_code")) {
  $("#join-class-class-code").val(urlParams.get("class_code") ?? "");
}
else {
  $("#join-class-class-code").val("");
}
