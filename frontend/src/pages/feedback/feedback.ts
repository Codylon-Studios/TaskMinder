import { csrfToken, reloadAllFn } from "../../global/global.js";
import { $navbarToasts } from "../../snippets/navbar/navbar.js";

$(async () => {
  reloadAllFn.set(async () => {
  });
});

function allDataFilled(): boolean {
  return ($("#title").val() ?? "") !== "" && $("#description").val() !== "";
}

$("#title, #description, #email").val("");
$("#submit").prop("disabled", true);

$("#title, #description").on("change", function () {
  if (! allDataFilled()) {
    $("#submit").prop("disabled", true);
  }
});

$("#title, #description").on("input", function () {
  if (allDataFilled()) {
    $("#submit").prop("disabled", false);
  }
});

$("#submit").on("click", async function () {
  const data = {
    title: $("#category").val(),
    description: $("#description").val(),
    email: $("#email").val()
  };
  let hasResponded = false;

  $.ajax({
    url: "/feedback",
    type: "POST",
    data: JSON.stringify(data),
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      $("#feedback-success-toast").toast("show");
      $("#title, #description, #email").val("");
      $("#submit").prop("disabled", true);
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
