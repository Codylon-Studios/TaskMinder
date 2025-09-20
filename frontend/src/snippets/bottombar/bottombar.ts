import { getSite } from "../../global/global.js";
import { user } from "../navbar/navbar.js";

function getTouchPosition(ev: JQuery.TouchStartEvent): {x: number, y: number} {
  return {
    x: ev.originalEvent?.touches[0]?.clientX ?? 0,
    y: ev.originalEvent?.touches[0]?.clientY ?? 0
  };
}

function getChangedTouchPosition(ev: JQuery.TouchMoveEvent | JQuery.TouchEndEvent): {x: number, y: number} {
  return {
    x: ev.originalEvent?.changedTouches[0]?.clientX ?? 0,
    y: ev.originalEvent?.changedTouches[0]?.clientY ?? 0
  };
}

if (/OS (18|19|26)(_\d+)* like Mac OS X/.test(navigator.userAgent)) {
  $(".bottombar").css("padding-bottom", "1rem");
}

const availableLinks = ["", "homework", "main", "events", "settings"];
const moreLinks = ["about", "report", "feedback"];
const siteName = getSite();
let siteIndex = availableLinks.indexOf(siteName) ?? -1;
if (siteName === "join") siteIndex = 2;
if (moreLinks.includes(siteName)) siteIndex = 0;

user.on("change", (function _() {
  $(".bottombar-link").filter(i => [1, 3].includes(i))
    .toggleClass("bottombar-link-deactivated", ! user.classJoined)
    .each(function () {
      $(this).attr("href", user.classJoined ? $(this).attr("data-href") ?? "#" : null);
    });
  return _;
})());

if (siteIndex === 0) {
  $("#bottombar-more").addClass("bottombar-current-link");
}
else if (siteIndex !== -1) {
  $(".bottombar-link").eq(siteIndex).addClass("bottombar-current-link");
}

$(".bottombar-overlay").hide();

let startX = 0;
let startY = 0;
let overlayShowsMore = false;

$(document).on("touchstart", ev => {
  if (overlayShowsMore) {
    overlayShowsMore = false;
    return;
  }

  ({ x: startX, y: startY } = getTouchPosition(ev));

  let $nextLink;
  if (startX < 75) {
    $nextLink = $(".bottombar-current-link").prevAll(":not(.bottombar-link-deactivated)").first();
  }
  else if (startX > window.innerWidth - 75) {
    $nextLink = $(".bottombar-current-link").nextAll(":not(.bottombar-link-deactivated)").first();
  }
  else return;

  if (startX < 75 && siteIndex === 1) {
    $(".bottombar-overlay i").attr("class", "fa-solid fa-ellipsis fs-1");
    $(".bottombar-overlay span").text("Mehr");
    $(".bottombar-overlay div").show();
  }
  else {
    $(".bottombar-overlay i").attr("class", ($nextLink.find("i").attr("class") ?? "fa-solid fa-xmark text-danger") + " fs-1");
    $(".bottombar-overlay span").text($nextLink.find("span").text() || "Keine Seite mehr");
    $(".bottombar-overlay div").hide();
  }
});

$(document).on("touchmove", ev => {
  if (ev.changedTouches.length !== 1 && ev.touches.length !== 0) {
    return;
  }

  const { x: posX, y: posY } = getChangedTouchPosition(ev);
  
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
  function hideOverlay(endP: number, complete?: () => unknown): void {
    const startP = parseFloat($(".bottombar-overlay").css("--progress"));
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
  function hasBeenDraggedEnough(): boolean {
    return Math.abs(diffX) > Math.abs(diffY)
    && Math.abs(diffX) > window.innerWidth * 0.75
    && (startX < 75 || startX > window.innerWidth - 75);
  }


  if (ev.changedTouches.length !== 1 && ev.touches.length !== 0) {
    return;
  }

  const { x: endX, y: endY } = getChangedTouchPosition(ev);
  
  const diffX = endX - startX;
  const diffY = endY - startY;

  let endProgress;

  if (hasBeenDraggedEnough()) {
    endProgress = 1;
  }
  else {
    endProgress = 0;
  }

  const getTargetLeft = (): number => diffX > 0 || endProgress === 1 ? 0 : window.innerWidth;
  const getTargetRight = (): number => diffX < 0 || endProgress === 1 ? 0 : window.innerWidth;
  
  $(".bottombar-overlay").animate({
    left: getTargetLeft(),
    right: getTargetRight()
  }, endProgress === 0 ? 500 : 200, $(".bottombar-overlay").hide);
  if (! (startX < 75 && siteIndex === 1 && endProgress === 1)) {
    hideOverlay(endProgress, endProgress === 1 ? changeSite : () => {});
  }
  else {
    overlayShowsMore = true;
  }
});
