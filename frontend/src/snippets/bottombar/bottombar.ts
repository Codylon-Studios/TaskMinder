import { user } from "../navbar/navbar.js"

if (/OS (18|26)(_\d+)* like Mac OS X/.test(navigator.userAgent)) {
  $(".bottombar").css("padding-bottom", "1rem")
}

const availableLinks = [
  "/about",
  "/homework",
  "/main",
  "/events",
  "/settings",
  "/join"
]
const siteName = location.pathname.replace(/\/$/, "")
const siteIndex = availableLinks.indexOf(siteName) ?? -1

$(".bottombar-link").eq(1).toggleClass("bottombar-link-deactivated", ! user.classJoined)
$(".bottombar-link").eq(3).toggleClass("bottombar-link-deactivated", ! user.classJoined)
user.on("login", () => {
  $(".bottombar-link").eq(1).toggleClass("bottombar-link-deactivated", ! user.classJoined)
  $(".bottombar-link").eq(3).toggleClass("bottombar-link-deactivated", ! user.classJoined)
});

$(".bottombar-link").eq(siteIndex).addClass("bottombar-current-link")
if (siteIndex == 5) {
  $(".bottombar-link").eq(2).addClass("bottombar-current-link")
}
$(".bottombar-link").each(function (id) {
  $(this).on("click", function () {
    if ($(this).is(".bottombar-link-deactivated")) return
    location.href = availableLinks[id];
  });
});
