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

$(".bottombar-overlay").hide()

let startX = 0;
let startY = 0;

$(document).on("touchstart", ev => {
  startX = ev.originalEvent?.touches[0].clientX ?? 0;
  startY = ev.originalEvent?.touches[0].clientY ?? 0;

  let $nextLink;
  if (startX < 75) {
    $nextLink = $(".bottombar-current-link").prevAll(":not(.bottombar-link-deactivated)").first()
  }
  else if (startX > window.innerWidth - 75) {
    $nextLink = $(".bottombar-current-link").nextAll(":not(.bottombar-link-deactivated)").first()
  }
  else return

  $(".bottombar-overlay i").attr("class", ($nextLink.find("i").attr("class") ?? "fa-solid fa-xmark text-danger") + " fs-1")
  $(".bottombar-overlay span").text($nextLink.find("span").text() || "Keine Seite mehr")
});

$(document).on("touchmove", ev => {
  if (ev.changedTouches.length !== 1 && ev.touches.length !== 0) {
    return;
  }

  const posX = ev.originalEvent?.changedTouches[0].clientX ?? 0;
  const posY = ev.originalEvent?.changedTouches[0].clientY ?? 0;
  
  const diffX = posX - startX;
  const diffY = posY - startY;
  
  if (Math.abs(diffX) > Math.abs(diffY) && (startX < 75 || startX > window.innerWidth - 75)) {
    $(".bottombar-overlay").css({
      "--progress": Math.abs(diffX) / window.innerWidth,
      left: diffX > 0 ? 0 : posX,
      right: diffX < 0 ? 0 : window.innerWidth - posX
    }).show();
  }
  else {
    $(".bottombar-overlay").css("--progress", "0").hide();
  }
});

$(document).on("touchend", ev => {
  function hideOverlay(endP: number, complete?: () => unknown) {
    const startP = parseFloat($(".bottombar-overlay").css("--progress"))
    $({ p: startP }).animate(
      { p: endP },
      {
        duration: startP * (endP === 0 ? 500 : 200),
        step: p => {
          $(".bottombar-overlay").css("--progress", p);
        },
        complete: complete
      }
    );
  }
  function changeSite(): void {
    if (diffX > 0) {
      if (siteIndex === 0) hideOverlay(0, $(".bottombar-overlay").hide);
      else window.location.href = availableLinks[siteIndex === 5 ? 0: siteIndex - 1];
    }
    else if (siteIndex === 4) hideOverlay(0, $(".bottombar-overlay").hide);
    else window.location.href = availableLinks[siteIndex === 5 ? 4: siteIndex + 1];
  }
  if (ev.changedTouches.length !== 1 && ev.touches.length !== 0) {
    return;
  }

  const endX = ev.originalEvent?.changedTouches[0].clientX ?? 0;
  const endY = ev.originalEvent?.changedTouches[0].clientY ?? 0;
  
  const diffX = endX - startX;
  const diffY = endY - startY;

  let endP;

  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > window.innerWidth * 0.75 && (startX < 75 || startX > window.innerWidth - 75)) {
    endP = 1;
  }
  else {
    endP = 0;
  }
  
  hideOverlay(endP, endP === 1 ? changeSite : () => {})
  $(".bottombar-overlay").animate({
    left: diffX > 0 || endP === 1 ? 0 : window.innerWidth,
    right: diffX < 0 || endP === 1 ? 0 : window.innerWidth
  }, endP === 0 ? 500 : 200, $(".bottombar-overlay").hide);
});
