/// <reference lib="webworker" />
const sw = globalThis as unknown as ServiceWorkerGlobalScope;

const CACHE_ENABLED = true;
const VERSION = "v-dev-1";
const CORE_CACHE = "core-" + VERSION;
const API_CACHE = "api-" + VERSION;

const CORE_GLOBAL = ["/global/global.js", "/global/global.css"];
const CORE_PAGES = ["main", "events", "homework", "uploads", "settings"]
  .flatMap(p => ["/" + p, `/pages/${p}/${p}.js`, `/pages/${p}/${p}.css`]);
const CORE_SNIPPETS = ["pwaBanner", "navbar", "footer", "bottombar", "loadingBar", "colorPicker", "richTextarea", "searchBox"]
  .map(s => `/snippets/${s}/${s}.js`);
const CORE_ASSETS = [
  "/static/manifest.json",
  "/assets/ios-share-icon.svg",
  "/assets/ios-add-icon.svg",
  "/assets/app-icon.png",
  "/static/favicon.ico", 
  "/assets/fonts/Quicksand-VariableFont_wght.ttf"
];
const CORE_VENDOR = [
  "/jquery/jquery.min.js",
  "/bootstrap/bootstrap.bundle.min.js",
  "/qrcode/qrcode.min.js",
  "/socket/socket.io.esm.min.js",
  "/fontawesome/fonts/fa-solid-900.woff2",
  "/fontawesome/fonts/fa-brands-400.woff2",
  "/fontawesome/fonts/fa-regular-400.woff2"
]
  .map(v => "/vendor" + v);
const CORE_APP = new Set([
  ...CORE_GLOBAL,
  ...CORE_PAGES,
  ...CORE_SNIPPETS,
  ...CORE_ASSETS,
  ...CORE_VENDOR
]);

const API_ROUTES = new Set([
  "/csrf-token",
  "/account/auth",
  "/homework/get_homework_data",
  "/lessons/get_lesson_data",
  "/class/get_class_members",
  "/events/get_event_data",
  "/events/get_event_type_data",
  "/homework/get_homework_checked_data",
  "/teams/get_joined_teams_data",
  "/subjects/get_subject_data",
  "/teams/get_teams_data",
  "/uploads/metadata",
  "/substitutions/get_substitutions_data",
  "/events/event_type_styles"
]); 

sw.addEventListener("install", () => {
  sw.skipWaiting();
});

sw.addEventListener("activate", async ev => {
  ev.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => ! [CORE_CACHE, API_CACHE].includes(name))
          .map(name => caches.delete(name))
      );
    })
  );
  sw.clients.claim();
});

sw.addEventListener("fetch", async ev => {
  const request = ev.request;
  ev.respondWith((async () => {
    if (request.mode === "navigate") {
      try {
        const path = (new URL(request.url)).pathname;
        if (path === "/join") return await fetch(request);

        const res = await fetch(new URL("/account/auth", location.origin), { method: "GET", credentials: "include" });
        const cache = await caches.open(API_CACHE);
        cache.put("/auth", res.clone());

        const json = await res.json();
        if ((!json.classJoined) && ["/main", "/events", "/homework", "/uploads"].includes(path)) {
          return Response.redirect("/join");
        }
      }
      catch { /* Ignore auth status if user is offline */ }
    }

    if (request.method === "GET") {
      const path = (new URL(request.url)).pathname;

      if (CORE_APP.has(path)) {
        const cache = await caches.open(CORE_CACHE);
        const cached = await cache.match(request);

        if (cached && CACHE_ENABLED) {
          return cached;
        }

        try {
          const res = await fetch(request);
          ev.waitUntil(cache.put(request, res.clone()));
          return res;
        }
        catch (err) {
          console.log(err);
          return new Response("Offline or fetch failed", { status: 503 });
        }
      }

      if (API_ROUTES.has(path)) {
        try {
          const cache = await caches.open(API_CACHE);
          const response = await fetch(request);

          ev.waitUntil(
            cache.put(request, response.clone())
          );

          return response;
        }
        catch {
          const cache = await caches.open(API_CACHE);
          return (
            (CACHE_ENABLED && await cache.match(request)) ||
            new Response("Didn't cache API: " + request.url, { status: 503 })
          );
        }
      }
    }
    return await fetch(request);
  })());
});

sw.addEventListener("message", async () => {
});
