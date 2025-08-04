import { csrfToken, reloadAll, reloadAllFn } from "../../global/global.js";
import { $navbarToasts, authUser, user } from "../../snippets/navbar/navbar.js";

function checkClassName(className: string): boolean {
  return /^[\wÄÖÜäöü\s\-.]{2,50}$/.test(className);
}

let justCreatedClass = false;

const qrCode = new QRCode( "show-qrcode-modal-qrcode", {
  text: "https://codylon.de",
  width: 300,
  height: 300
});

$("#show-join-class-btn").on("click", () => {
  $("#decide-action-panel").addClass("d-none");
  $("#join-class-panel").removeClass("d-none");
});

$("#show-login-register-btn").on("click", () => {
  $("#decide-action-panel").addClass("d-none");
  $("#login-register-panel").removeClass("d-none");
  $(".login-register-element").removeClass("d-none");
});

$("#show-joined-login-register-btn").on("click", () => {
  $("#decide-account-panel").addClass("d-none");
  $("#login-register-panel").removeClass("d-none");
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
  $("#create-class-btn").addClass("disabled");
});

$("#create-class-credentials-back-btn").on("click", () => {
  $("#create-class-is-test-panel").removeClass("d-none");
  $("#create-class-credentials-panel").addClass("d-none");
});

$(() => {
  reloadAllFn.set(async () => {
  });
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
  if (user.loggedIn && ! justCreatedClass) {
    $("#show-login-register-btn").addClass("disabled").find("i").removeClass("d-none");
    if (user.classJoined) {
      location.href = "/main";
    }
    else if (urlParams.get("action") !== "join") {
      $("#decide-action-panel").removeClass("d-none");
    }
    $(".login-register-element, .login-element, .register-element").addClass("d-none");
    $("#show-create-class-btn").removeClass("disabled").find("~ .form-text").hide();
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
        $("#error-invalid-class-code").removeClass("d-none");
      }
      else if (xhr.status === 500) {
        $navbarToasts.serverError.toast("show");
      }
    }
  });
});

$("#join-class-class-code").on("input", () => {
  $("#error-invalid-class-code").addClass("d-none");
});

$("#create-class-name").on("change", function () {
  if (!checkClassName($(this).val()?.toString() ?? "")) {
    $("#create-class-name").addClass("is-invalid");
    $("#create-class-btn").addClass("disabled");
  }
});

$("#create-class-name").on("input", function () {
  if (checkClassName($(this).val()?.toString() ?? "")) {
    $("#create-class-name").removeClass("is-invalid");
    $("#create-class-btn").removeClass("disabled");
  }
});

$("#create-class-btn").on("click", async () => {
  const className = $("#create-class-name").val()?.toString() ?? "";
  $("#show-qrcode-modal-title b").text(className);

  let hasResponded = false;
  // Post the request
  await $.ajax({
    url: `/class/create${$("#create-class-is-test").prop("checked") ? "_test_" : "_"}class`,
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({ classDisplayName: className }),
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      justCreatedClass = true;
      authUser();
      (async () => {
        const classCode = (await $.get("/class/get_class_info")).classCode;
        qrCode.makeCode(`https://codylon.de/join?class_code=${classCode}`);
        $("#create-class-credentials-panel").addClass("d-none");
  
        $("#invite-panel").removeClass("d-none");
        $("#invite-copy-link").on("click", async () => {
          try {
            await navigator.clipboard.writeText(`https://codylon.de/join?class_code=${classCode}`);
  
            $("#invite-copy-link").addClass("disabled").html("<i class=\"fa-solid fa-check-circle\"></i> Einladungslink kopiert");
  
            setTimeout(() => {
              $("#invite-copy-link").removeClass("disabled").html("<i class=\"fa-solid fa-link\"></i> Einladungslink kopieren");
            }, 2000);
          }
          catch (err) {
            console.error("Error copying classcode to clipboard:", err);
          }
        });
      })();
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
}
else if (urlParams.get("action") === "account") {
  $("#decide-action-panel").addClass("d-none");
  $("#decide-account-panel").removeClass("d-none");
}

if (urlParams.has("class_code")) {
  $("#join-class-class-code").val(urlParams.get("class_code") ?? "");
  $("#join-class-btn").trigger("click");
}
else {
  $("#join-class-class-code").val("");
}
