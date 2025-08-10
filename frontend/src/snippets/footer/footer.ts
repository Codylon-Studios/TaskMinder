import { colorTheme, isSite } from "../../global/global.js";

const bottombarShown = window.innerWidth < 992 && $(".bottombar").length > 0;
let bottombarHeight = 38 + Math.max(8, window.innerWidth / 100 * 1.5) * 1.5;
if (/OS (18|26)(_\d+)* like Mac OS X/.test(navigator.userAgent)) {
  bottombarHeight += 16;
}

if (localStorage.getItem("displayFooter") === "false") {
  $("footer").hide();
  $("body").css({
    paddingBottom: (bottombarShown ? bottombarHeight : 0) + 70 + "px"
  });
}
else {
  $("body").css({ paddingBottom: (bottombarShown ? bottombarHeight : 0) + "px" });
}

$("#footer-close").on("click", () => {
  localStorage.setItem("displayFooter", "false");
  $("body").css({
    paddingBottom: (bottombarShown ? bottombarHeight : 0) + 70 + "px"
  });
  $("footer").hide();
  if (isSite("settings")) {
    $("#display-footer input").prop("checked", false);
  }
});

$("body").addClass("flex-column min-vh-100");

if ((await colorTheme()) === "dark") {
  $("footer").removeClass("bg-dark").addClass("bg-dark-subtle");
}

colorTheme.on("update", async () => {
  if ((await colorTheme()) === "dark") {
    $("footer").removeClass("bg-dark").addClass("bg-dark-subtle");
  }
  else {
    $("footer").removeClass("bg-dark-subtle").addClass("bg-dark");
  }
});
