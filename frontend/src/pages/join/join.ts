import { csrfToken, reloadAll, reloadAllFn } from "../../global/global.js";
import { $navbarToasts, user } from "../../snippets/navbar/navbar.js";

function checkClassName(className: string) {
  return /^[\wÄÖÜäöü\s\-.]{2,50}$/.test(className);
}

const classcode = "97PnfL38d0FQ93a7AmVS";
// This will have to be created server sided & sent to the frontend
// The backend should save the code in the session cookie
// and do NOT use the frontend's code, as it may have been edited
// which could lead to an existing code in the backend

const qrCode = new QRCode( "show-qrcode-modal-qrcode", {
  text: "https://codylon.de",
  width: 300,
  height: 300
});

const className = $("#create-class-name").val()?.toString() ?? "";
qrCode.makeCode(`https://codylon.de/join?classcode=${classcode}`);
$("#show-qrcode-modal-title b").text(className);

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
  $("#error-invalid-classcode").addClass("d-none");
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
  $("#create-class-classcode").val(classcode);
});

$("#create-class-credentials-back-btn").on("click", () => {
  $("#create-class-is-test-panel").removeClass("d-none");
  $("#create-class-credentials-panel").addClass("d-none");
});

$("#invite-copy-link").on("click", async () => {
  try {
    await navigator.clipboard.writeText(`https://codylon.de/join?classcode=${classcode}`);

    $("#invite-copy-link").addClass("disabled").html("<i class=\"fa-solid fa-check-circle\"></i> Einladungslink kopiert");

    setTimeout(() => {
      $("#invite-copy-link").removeClass("disabled").html("<i class=\"fa-solid fa-link\"></i> Einladungslink kopieren");
    }, 2000);
  }
  catch (err) {
    console.error("Error copying classcode to clipboard:", err);
  }
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
  if (user.loggedIn) {
    $("#show-login-register-btn").addClass("disabled").find("i").removeClass("d-none");
    if (user.classJoined) {
      location.href = "/main";
    }
    else if (urlParams.get("action") != "join") {
      $("#decide-action-panel").removeClass("d-none");
    }
    $(".login-register-element, .login-element, .register-element").addClass("d-none");
    $("#show-create-class-btn").removeClass("disabled").find("~ .form-text").hide();
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

$("#create-class-btn").on("click", () => {
  // SEND REQUEST
  $("#create-class-credentials-panel").addClass("d-none");
  $("#invite-panel").removeClass("d-none");
});

const urlParams = new URLSearchParams(window.location.search);

if (urlParams.get("action") == "join" || urlParams.has("classcode")) {
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
