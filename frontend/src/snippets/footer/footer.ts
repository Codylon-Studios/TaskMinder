import { ColorTheme, colorTheme, isSite } from "../../global/global.js";

if (localStorage.getItem("displayFooter") === "false") {
  $("footer").hide();
}

$("#footer-close").on("click", () => {
  localStorage.setItem("displayFooter", "false");
  $("footer").hide();
  if (isSite("settings")) {
    $("#display-footer input").prop("checked", false);
  }
});

$("body").addClass("flex-column min-vh-100");

if ((await colorTheme()) === ColorTheme.DARK) {
  $("footer").removeClass("bg-dark").addClass("bg-dark-subtle");
}

colorTheme.on("update", async () => {
  if ((await colorTheme()) === ColorTheme.DARK) {
    $("footer").removeClass("bg-dark").addClass("bg-dark-subtle");
  }
  else {
    $("footer").removeClass("bg-dark-subtle").addClass("bg-dark");
  }
});
