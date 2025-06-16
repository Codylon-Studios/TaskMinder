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

if (! user.classJoined) {
  $(".bottombar-link").eq(1).addClass("bottombar-link-deactivated")
  $(".bottombar-link").eq(3).addClass("bottombar-link-deactivated")
}

$(".bottombar-link").eq(siteIndex).addClass("bottombar-current-link")
if (siteIndex == 5) {
  $(".bottombar-link").eq(2).addClass("bottombar-current-link")
}
$(".bottombar-link").each(function (id) {
  if ($(this).is(".bottombar-link-deactivated")) return
  $(this).on("click", () => {
    location.href = availableLinks[id];
  });
});
