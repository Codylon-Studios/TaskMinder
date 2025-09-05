import { getSite } from "../../global/global.js";
import { user } from "../navbar/navbar.js";

if (/OS (18|19|26)(_\d+)* like Mac OS X/.test(navigator.userAgent)) {
  $(".bottombar").css("padding-bottom", "1rem");
}

const availableLinks = ["about", "homework", "main", "events", "settings", "join"];
const siteName = getSite();
const siteIndex = availableLinks.indexOf(siteName) ?? -1;

user.on("change", (function _() {
  $(".bottombar-link").filter(i => [1, 3].includes(i))
    .toggleClass("bottombar-link-deactivated", ! user.classJoined)
    .each(function () {
      $(this).attr("href", user.classJoined ? $(this).attr("data-href") ?? "#" : null);
    });
  return _;
})());

$(".bottombar-link").eq(siteIndex).addClass("bottombar-current-link");
if (siteIndex === 5) {
  $(".bottombar-link").eq(2).addClass("bottombar-current-link");
}

let startX = 0;
let startY = 0;

$(document).on("touchstart", ev => {
  startX = ev.originalEvent?.touches[0].clientX ?? 0;
  startY = ev.originalEvent?.touches[0].clientY ?? 0;
});

$(document).on("touchend", ev => {
  function changeSite(): void {
    if (diffX > 0) {
      if (siteIndex === 0) return;
      window.location.href = availableLinks[siteIndex === 5 ? 0: siteIndex - 1];
    }
    else {
      if (siteIndex === 4) return;
      window.location.href = availableLinks[siteIndex === 5 ? 4: siteIndex + 1];
    }
  }
  if (ev.changedTouches.length !== 1 && ev.touches.length !== 0) {
    return;
  }

  const endX = ev.originalEvent?.changedTouches[0].clientX ?? 0;
  const endY = ev.originalEvent?.changedTouches[0].clientY ?? 0;
  
  const diffX = endX - startX;
  const diffY = endY - startY;
  
  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 150 && (startX < 75 || startX > window.innerWidth - 75)) {
    changeSite();
  }
});
