import { getSite } from "../../global/global.js";
import { replaceSitePJAX } from "../loadingBar/loadingBar.js";
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

function calculateHeight(): void {
  let height = 38 + Math.max(8, globalThis.innerWidth / 100 * 1.5) * 1.5;
  if (/OS (18|26)(_\d+)* like Mac OS X/.test(navigator.userAgent)) {
    height += 16;
  }
  if (globalThis.innerWidth >= 992) height = 0;
  $("body").css("--bottombar-height", height + "px");
}

export async function init(): Promise<void> {
  siteName = getSite();
  $(".bottombar-link").removeClass("bottombar-current-link").filter(`[href="/${siteName}"]`).addClass("bottombar-current-link");
}

if (/OS (18|19|26)(_\d+)* like Mac OS X/.test(navigator.userAgent)) {
  $(".bottombar").css("padding-bottom", "1rem");
}
calculateHeight();
$(globalThis).on("resize", calculateHeight);

let siteName: string;

function toggleShownLinks(): void {
  $(".bottombar-joined").toggle(user.classJoined ?? false);
  $(".bottombar-not-joined").toggle(! user.classJoined);
}

user.on("change", toggleShownLinks);
toggleShownLinks();

$(".bottombar-overlay").hide();

let startX = 0;
let startY = 0;
let overlayShowsMore = false;

$(document).on("touchstart", ev => {
  if ($(".modal").is(":visible")) return;

  if (overlayShowsMore) {
    overlayShowsMore = false;
    return;
  }

  ({ x: startX, y: startY } = getTouchPosition(ev));

  let $nextLink;
  if (startX < 75) {
    $nextLink = $(".row:visible > .bottombar-current-link").prevAll().first();
  }
  else if (startX > globalThis.innerWidth - 75) {
    $nextLink = $(".row:visible > .bottombar-current-link").nextAll().first();
  }
  else return;

  $(".bottombar-overlay i").attr("class", ($nextLink.find("i").attr("class") ?? "fa-solid fa-xmark text-danger") + " fs-1");
  $(".bottombar-overlay span").text($nextLink.find("span").text() || "Keine Seite mehr");
  $(".bottombar-overlay div").hide();
});

$(document).on("touchmove", ev => {
  if ($(".modal").is(":visible")) return;

  if (ev.changedTouches.length !== 1 && ev.touches.length !== 0) {
    return;
  }

  const { x: posX, y: posY } = getChangedTouchPosition(ev);
  
  const diffX = posX - startX;
  const diffY = posY - startY;
  
  if (Math.abs(diffX) > Math.abs(diffY) && (startX < 75 || startX > globalThis.innerWidth - 75)) {
    $(".bottombar-overlay").css({
      "--progress": Math.abs(diffX) / globalThis.innerWidth,
      left: diffX > 0 ? 0 : posX,
      right: diffX < 0 ? 0 : globalThis.innerWidth - posX
    }).show();
  }
  else {
    $(".bottombar-overlay").css("--progress", "0").hide();
  }
});

$(document).on("touchend", ev => {
  if ($(".modal").is(":visible")) return;
  
  function hideOverlay(endP: number, complete?: () => unknown): void {
    const startP = Number.parseFloat($(".bottombar-overlay").css("--progress"));
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
  async function changeSite(): Promise<void> {
    if (diffX > 0) {
      const prev = $(".row:visible > .bottombar-current-link").prevAll().first();
      if (prev.length === 0) hideOverlay(0, $(".bottombar-overlay").hide);
      else {
        await replaceSitePJAX(prev.attr("href") ?? siteName);
        $(".bottombar-overlay").css("--progress", "0").hide();
      }
    }
    else {
      const next = $(".row:visible > .bottombar-current-link").nextAll().first();
      if (next.length === 0) hideOverlay(0, $(".bottombar-overlay").hide);
      else {
        await replaceSitePJAX(next.attr("href") ?? siteName);
        $(".bottombar-overlay").css("--progress", "0").hide();
      }
    }
  }
  function hasBeenDraggedEnough(): boolean {
    return Math.abs(diffX) > Math.abs(diffY)
    && Math.abs(diffX) > globalThis.innerWidth * 0.75
    && (startX < 75 || startX > globalThis.innerWidth - 75);
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

  const getTargetLeft = (): number => diffX > 0 || endProgress === 1 ? 0 : globalThis.innerWidth;
  const getTargetRight = (): number => diffX < 0 || endProgress === 1 ? 0 : globalThis.innerWidth;
  
  $(".bottombar-overlay").animate({
    left: getTargetLeft(),
    right: getTargetRight()
  }, endProgress === 0 ? 500 : 200, $(".bottombar-overlay").hide);
  hideOverlay(endProgress, endProgress === 1 ? changeSite : undefined);
});

$("#bottombar-more-cancel").on("click", ev => {
  ev.preventDefault();
});
