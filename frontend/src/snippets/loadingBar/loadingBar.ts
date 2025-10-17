import { getSite, isValidSite, reloadAll } from "../../global/global.js";
import { init as initBottombar } from "../bottombar/bottombar.js";
import { init as initNavbar } from "../navbar/navbar.js";

function cacheHtml(url: string, html: string): void {
  if (htmlCache.has(url)) {
    htmlCache.delete(url);
  }
  else if (htmlCache.size >= CACHE_SIZE) {
    const firstKey = htmlCache.keys().next().value as string;
    htmlCache.delete(firstKey);
  }
  htmlCache.set(url, html);
}

function getCachedHtml(url: string): string | undefined {
  const html = htmlCache.get(url);
  if (html) {
    htmlCache.delete(url);
    htmlCache.set(url, html);
  }
  return html;
}

async function init(): Promise<void> {
  let s = getSite();
  
  if (! isValidSite(s)) {
    s = "404";
  }

  $("title").text(titleMap[s as keyof typeof titleMap] + " · TaskMinder");

  if ($(`link[data-site="${s}"]`).length === 0) {
    $("head").append(`<link rel="stylesheet" href="/pages/${s}/${s}.css" data-site="${s}">`);
  }
  
  const mod = await import(`../../pages/${s}/${s}.js`);
  if (mod.init) {
    await mod.init();
  }
  await initBottombar();
  await initNavbar();
  await reloadAll();

  setTimeout(() => {
    const hash = globalThis.location.hash;
    if (hash) {
      document.location.href = hash;
    }
  }, 250);
}

function startLoadingBar(): NodeJS.Timeout {
  loadingBarProgress = 10;
  $("#loading-bar").show();
  const interval = setInterval(() => {
    $("#loading-bar").css("width", loadingBarProgress + "%");
    loadingBarProgress = 90 - (90 - loadingBarProgress) * 0.9;
  }, 300);
  return interval;
}

function finishLoadingBar(interval: NodeJS.Timeout): void {
  $("#loading-bar").css("width", "100%");
  clearInterval(interval);
  setTimeout(() => {
    $("#loading-bar").hide().css("width", "0");
  }, 300);
}

export async function replaceSitePJAX(url: string, pushHistory?: boolean): Promise<void> {
  const interval = startLoadingBar();
  const urlPathname = (new URL(url, globalThis.location.origin)).pathname;
  const hash = (new URL(url, globalThis.location.origin)).hash;

  try {
    const cachedHtml = getCachedHtml(urlPathname);
    let app;
    let resUrl;
    let toasts;

    if (cachedHtml) {
      app =  cachedHtml;
      resUrl = (new URL(url, globalThis.location.origin)).pathname;
    }
    else {
      const res = await fetch(url);
      const doc = await res.text();
      app = $(doc).filter("#app").html();
      toasts = $(doc).filter(".toast-container").children();
      resUrl = res.url;
    }
    console.log(resUrl);
    
    cacheHtml((new URL(resUrl, globalThis.location.origin)).pathname, app);

    if (pushHistory ?? true) {
      globalThis.history.pushState({}, "", resUrl + hash);
    }

    $("#app-prepend").empty().append(app);
    if (toasts) {
      toasts.each(function () {
        if (! $("#" + $(this).attr("id")).length && ! $.contains($(".toast-container")[0], this)) {
          $(".toast-container").append($(this));
        }
      });
    }
    await init();
    $("#app").empty().append($("#app-prepend").children());

    finishLoadingBar(interval);
  }
  catch (err) {
    console.warn("Error loading site with PJAX: ", err);
    finishLoadingBar(interval);
  }
}

const titleMap = {
  404: "Nicht gefunden",
  about: "Über",
  events: "Ereignisse",
  homework: "Hausaufgaben",
  join: "Beitreten",
  main: "Übersicht",
  settings: "Einstellungen",
  uploads: "Dateien"
};

const htmlCache: Map<string, string> = new Map();
const CACHE_SIZE = 5;

let loadingBarProgress = 0;

init();
$("body").prepend("<div id='app-prepend' class='d-none'>");
cacheHtml(location.pathname, $("#app").html());

$(document).on("click", "a[data-pjax]", async function (e) {
  e.preventDefault();
  replaceSitePJAX($(this).attr("href") ?? location.href);
});

globalThis.addEventListener("popstate", async () => {
  replaceSitePJAX(location.href, false);
});
