import { colorTheme } from "../../global/global.js";

if (localStorage.getItem("displayFooter") == "false") {
  $("footer").hide();
  $("body").css({
    paddingBottom: (window.innerWidth >= 992 ? 0 : 70) + 70 + "px",
  });
} else {
  $("body").css({ paddingBottom: (window.innerWidth >= 992 ? 0 : 70) + "px" });
}

$("#footer-close").on("click", () => {
  localStorage.setItem("displayFooter", "false");
  $("body").css({
    paddingBottom: (window.innerWidth >= 992 ? 0 : 70) + 70 + "px",
  });
  $("footer").hide();
  if (["/settings", "/settings/"].includes(location.pathname)) {
    $("#display-footer input").prop("checked", false);
  }
});

$("body").addClass("d-flex flex-column min-vh-100");

if ((await colorTheme()) == "dark") {
  $("footer").removeClass("bg-dark").addClass("bg-dark-subtle");
}

colorTheme.on("update", async () => {
  if ((await colorTheme()) == "dark") {
    $("footer").removeClass("bg-dark").addClass("bg-dark-subtle");
  } else {
    $("footer").removeClass("bg-dark-subtle").addClass("bg-dark");
  }
});
