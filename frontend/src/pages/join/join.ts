import { csrfToken, socket } from "../../global/global.js";
import { replaceSitePJAX as openSitePJAX } from "../../snippets/loadingBar/loadingBar.js";
import { $navbarToasts, resetLoginRegister, user } from "../../snippets/navbar/navbar.js";

function changeContentOnLogin(): void {
  if (user.loggedIn && !justCreatedClass) {
    $("#show-login-register-btn").prop("disabled", true).find("i").removeClass("d-none");
    if (user.classJoined) {
      openSitePJAX("/main");
    }
    else if (urlParams.get("action") !== "join") {
      $("#decide-action-panel").show();
    }
    $(".login-register-element, .login-element, .register-element").addClass("d-none");
    $("#show-create-class-btn").prop("disabled", false).find("~ .form-text").hide();
  }
}

export async function init(): Promise<void> {
  return new Promise(res => {
    justCreatedClass = false;

    const qrCode = new QRCode("show-qrcode-modal-qrcode", {
      text: location.host,
      width: 300,
      height: 300
    });
    $("#show-qrcode-modal-qrcode img").attr("alt", "Der QR-Code, um eurer Klasse beizutreten");

    $(".panel-wrapper").children().hide().filter("#decide-action-panel").show();

    $("[data-next-panel]").on("click", function () {
      $(".panel-wrapper").children().hide().filter($(this).attr("data-next-panel") ?? "").show().trigger("show");
    });

    $("#join-class-panel").on("show", () => {
      $("#join-class-class-code").val("");
      $("#join-class-checkbox").prop("checked", false);
      $("#join-class-btn").prop("disabled", true);
      $("#error-invalid-class-code").hide();
    });

    $("#login-register-panel").on("show", () => {
      $(".login-register-username").val("");
      $(".login-register-next-button").prop("disabled", true);
      resetLoginRegister();
      $(".login-register-element").removeClass("d-none");
    });

    $("#create-class-credentials-panel").on("show", () => {
      $("#create-class-name").removeClass("is-invalid").val("");
      $("#create-class-btn").prop("disabled", true);
    });

    $(() => {
      $.get("/class/get_class_info")
        .done(res => {
          const resClassName = res.className;
          $("#decide-account-class-name").text(resClassName);
        });
    });

    $("#login-register-back-btn").on("click", () => {
      $(".login-register-element, .login-element, .register-element").addClass("d-none");
      if (user.classJoined) {
        $("#decide-account-panel").show();
      }
      else {
        $("#decide-action-panel").show();
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
            openSitePJAX("/main");
          }
          $("#join-class-panel").hide();
          $("#decide-account-panel").show();
          user.auth();
          $(".class-joined-content").removeClass("d-none");
          $(".navbar-home-link").attr("href", "/main");
          const className = res;
          $("#decide-account-class-name").text(className);
          // Force socket to reconnect so it picks up the new session.classId
          socket.disconnect();
          socket.connect();
        },
        error: xhr => {
          if (xhr.status === 404) {
            $("#error-invalid-class-code").show();
            $("#join-class-btn").prop("disabled", true);
          }
          else if (xhr.status === 500) {
            $navbarToasts.serverError.toast("show");
          }
        }
      });
    });

    $("#join-class-class-code").on("input", () => {
      $("#error-invalid-class-code").hide();
    });

    $("#join-class-checkbox, #join-class-class-code").on("input", () => {
      $("#join-class-btn").prop("disabled", 
        $("#join-class-class-code").val() === "" || ! $("#join-class-checkbox").prop("checked") || $("#error-invalid-class-code").is(":visible")
      );
    });

    $("#create-class-name").on("input", function () {
      $("#create-class-name").toggleClass("is-invalid", ($(this).val()?.toString() ?? "") === "");
      $("#create-class-btn").prop("disabled", ($(this).val()?.toString() ?? "") === "");
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
          user.auth();
          const classCode = res;
          qrCode.makeCode(location.host + `/join?class_code=${classCode}`);
          $("#create-class-credentials-panel").hide();
          // Force socket to reconnect so it picks up the new session.classId
          socket.disconnect();
          socket.connect();
          $("#invite-panel").show();
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

    urlParams = new URLSearchParams(globalThis.location.search);

    if (urlParams.get("action") === "join" || urlParams.has("class_code")) {
      $("#decide-action-panel").hide();
      $("#join-class-panel").show().trigger("shiw");
    }
    else if (urlParams.get("action") === "account") {
      $("#decide-action-panel").hide();
      $("#decide-account-panel").show();
    }

    if (urlParams.has("class_code")) {
      $("#join-class-class-code").val(urlParams.get("class_code") ?? "");
    }

    res();
  });
}

export const renderAllFn = changeContentOnLogin;

let justCreatedClass: boolean;
let urlParams: URLSearchParams;
