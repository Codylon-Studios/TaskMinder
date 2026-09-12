import { ajax, showButtonLoading, socket, user } from "../../global/global.js";
import { AjaxError } from "../../global/types.js";
import { resetLoginRegister } from "../../snippets/navbar/navbar.js";

async function changeContentOnUserChange(): Promise<void> {
  if (user.loggedIn && !justCreatedClass) {
    $("#show-login-register-btn").prop("disabled", true).find("i").removeClass("d-none");
    if (user.classJoined) {
      socket.disconnect();
      socket.connect();
      const loadingBarMod = await import("../../snippets/loadingBar/loadingBar.js");
      loadingBarMod.replaceSitePJAX("/main");
    }
    else if (urlParams.get("action") !== "join") {
      $("#decide-action-panel").show();
    }
    $(".login-register-element, .login-element, .register-element").addClass("d-none");
    $("#show-create-class-btn").prop("disabled", false).find("~ .form-text").hide();
  }
  if (!user.loggedIn) {
    $("#show-login-register-btn").prop("disabled", false).find("i").addClass("d-none");
    $("#show-create-class-btn").prop("disabled", true).find("~ .form-text").show();
  }
}

export async function init(): Promise<void> {
  return new Promise(res => {
    justCreatedClass = false;

    const qrCode = new QRCode("show-qrcode-modal-qrcode", {
      text: location.origin,
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

    (async () => {
      if (! user.classJoined) return;
      const res = await fetch(`/api/classes/${user.classId}`);
      if (!res.ok) throw new Error("HTTP error during fetch of classInfo: " + res.status + " " + await res.text());
      $("#decide-account-class-name").text((await res.json()).className);
    })();

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

      try {
        const ajaxPromise = ajax("POST", "/api/classes/join", {
          body: { classCode },
          expectedErrors: [{ status: 404, responseText: "Invalid class code" }]
        });

        showButtonLoading($("#join-class-btn"), ajaxPromise);

        const res = await ajaxPromise;

        if (user.loggedIn) {
          const loadingBarMod = await import("../../snippets/loadingBar/loadingBar.js");
          loadingBarMod.replaceSitePJAX("/main");
        }
        $("#join-class-panel").hide();
        $("#decide-account-panel").show();
        user.auth();
        $(".class-joined-content").removeClass("d-none");
        $(".navbar-home-link").attr("href", "/main");
        const className = await res.json();
        $("#decide-account-class-name").text(className);
        // Force socket to reconnect so it picks up the new session.classId
        socket.disconnect();
        socket.connect();
      }
      catch (e) {
        const err = e as AjaxError;
        if (err.status === 404) {
          $("#error-invalid-class-code").show();
          $("#join-class-btn").prop("disabled", true);
        }
      }
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

      const ajaxPromise = ajax("POST", "/api/classes", {
        body: {
          classDisplayName: className,
          isTestClass: $("#create-class-is-test").prop("checked")
        }
      });

      showButtonLoading($("#create-class-btn"), ajaxPromise);

      const res = await ajaxPromise;

      justCreatedClass = true;
      user.auth();
      const classCode = await res.json();
      qrCode.makeCode(location.origin + `/join?class_code=${classCode}`);
      $("#create-class-credentials-panel").hide();
      // Force socket to reconnect so it picks up the new session.classId
      socket.disconnect();
      socket.connect();
      $("#invite-panel").show();
      $("#invite-copy-link").on("click", async () => {
        try {
          await navigator.clipboard.writeText(location.origin + `/join?class_code=${classCode}`);

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
    });

    urlParams = new URLSearchParams(globalThis.location.search);

    if (urlParams.get("action") === "join" || urlParams.has("class_code")) {
      $("#decide-action-panel").hide();
      $("#join-class-panel").show().trigger("show");
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

user.on("change", changeContentOnUserChange);

export const renderAllFn = changeContentOnUserChange;

let justCreatedClass: boolean;
let urlParams: URLSearchParams;
