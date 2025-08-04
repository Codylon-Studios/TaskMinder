import { getSite } from "../../global/global.js";
import { user } from "../navbar/navbar.js";

if (/OS (18|19|26)(_\d+)* like Mac OS X/.test(navigator.userAgent)) {
  $(".bottombar").css("padding-bottom", "1rem");
}

const availableLinks = ["about", "homework", "main", "events", "settings", "join"];
const siteName = getSite();
const siteIndex = availableLinks.indexOf(siteName) ?? -1;

user.on("change", (function _() {
  $(".bottombar-link").filter(i => [1, 3].includes(i)).toggleClass("bottombar-link-deactivated", ! user.classJoined);
  return _;
})());

$(".bottombar-link").eq(siteIndex).addClass("bottombar-current-link");
if (siteIndex === 5) {
  $(".bottombar-link").eq(2).addClass("bottombar-current-link");
}
$(".bottombar-link").each(function (id) {
  $(this).on("click", () => {
    if ($(this).is(".bottombar-link-deactivated")) return;
    location.href = availableLinks[id];
  });
});
