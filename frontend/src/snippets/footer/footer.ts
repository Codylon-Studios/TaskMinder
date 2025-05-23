import { colorTheme } from "../../global/global.js"

if (localStorage.getItem("displayFooter") == "false") {
  $("footer").hide()
}
else {
  $("body").css({paddingBottom: 0})
}

$("#footer-close").on("click", () => {
  localStorage.setItem("displayFooter", "false")
  $("body").css({paddingBottom: $("body").css("paddingTop")})
  $("footer").hide()
  if (["/settings", "/settings/"].includes(location.pathname)) {
    $("#display-footer input").prop("checked", false)
  }
})

$("body").addClass("d-flex flex-column min-vh-100")

if (await colorTheme() == "dark") {
  $("footer").removeClass("bg-dark").addClass("bg-dark-subtle")
}

colorTheme.on("update", async () => {
  if (await colorTheme() == "dark") {
    $("footer").removeClass("bg-dark").addClass("bg-dark-subtle")
  }
  else {
    $("footer").removeClass("bg-dark-subtle").addClass("bg-dark")
  }
})
