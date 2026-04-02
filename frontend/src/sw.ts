/// <reference lib="webworker" />
const sw = globalThis as unknown as ServiceWorkerGlobalScope;

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const request = indexedDB.open("app", 1);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta");
      }
    };

    request.onsuccess = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (db.objectStoreNames.contains("meta")) {
        res(db);
      }
      else {
        db.close();
        indexedDB.deleteDatabase("app");
        openIndexedDB().then(res => res);
      }
    };

    request.onerror = event => {
      rej((event.target as IDBOpenDBRequest).error);
    };
  });
}

const CORE_GLOBAL = ["/global/global.js", "/global/global.css"];
const CORE_PAGES = ["main", "events", "homework", "uploads", "settings"]
  .flatMap(p => ["/" + p, `/pages/${p}/${p}.js`, `/pages/${p}/${p}.css`]);
const CORE_SNIPPETS = ["navbar", "footer", "bottombar", "loadingBar", "colorPicker", "richTextarea", "searchBox"]
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

const API_ROUTES = [
  "/csrf-token",
  "/bootstrap",
  "/api"
];

sw.addEventListener("install", () => {
  sw.skipWaiting();
});

sw.addEventListener("activate", () => {
  sw.clients.claim();
});

async function removeOutdatedCaches(version: string): Promise<void> {
  const CORE_CACHE = "core-v" + version;
  const API_CACHE = "api-v" + version;
  (await caches.keys())
    .filter(name => ! [CORE_CACHE, API_CACHE].includes(name))
    .forEach(name => caches.delete(name));
}

type Bootstrap = { maintenance: boolean, online: boolean, version: string, cacheEnabled: boolean, maintenanceHtml: string }

async function fetchBootstrap(): Promise<Bootstrap> {
  const db = await openIndexedDB();
  try {
    const res = await (await fetch("/bootstrap")).json() as Bootstrap;
    if (res.maintenance) {
      const tx = db.transaction("meta", "readwrite").objectStore("meta").get("bootstrap");
      res.version = (await new Promise(res => {
        tx.onsuccess = () => res(tx.result);
      }) as Bootstrap).version;
    }
    res.online = true;
    db.transaction("meta", "readwrite").objectStore("meta").put(res, "bootstrap");
    await removeOutdatedCaches(res.version);
    return res;
  }
  catch {
    const tx = db.transaction("meta", "readwrite").objectStore("meta").get("bootstrap");
    const res = await new Promise(res => {
      tx.onsuccess = () => res(tx.result);
    }) as Bootstrap;
    res.online = false;
    db.transaction("meta", "readwrite").objectStore("meta").put(res, "bootstrap");
    return res;
  }
}

async function getBootstrap(): Promise<Bootstrap> {
  const db = await openIndexedDB();
  const tx = db.transaction("meta", "readwrite").objectStore("meta").get("bootstrap");
  return await new Promise(res => {
    tx.onsuccess = () => {
      res(tx.result ?? fetchBootstrap()); 
    }; 
  });
}

async function handleFetch(ev): Promise<Response> {
  const req = ev.request;

  const b = req.mode === "navigate" ? await fetchBootstrap() : await getBootstrap();

  const CORE_CACHE = "core-v" + b.version;
  const API_CACHE = "api-v" + b.version;
  const CACHE_ENABLED = b.cacheEnabled;

  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/bootstrap") {
    return new Response(JSON.stringify(b), { status: 200, headers: { "Content-Type": "application/json;charset=utf-8" } });
  }

  if (req.method === "GET") {
    if (CORE_APP.has(path)) {
      const cache = await caches.open(CORE_CACHE);
      const cached = await cache.match(req);

      if (cached && (CACHE_ENABLED || b.maintenance || !b.online)) {
        return cached;
      }

      try {
        const res = await fetch(req);
        if (res.ok) await cache.put(req, res.clone());
        return res;
      }
      catch {
        return cached || new Response("Offline or fetch failed", { status: 503 });
      }
    }

    if (API_ROUTES.some(r => path.startsWith(r))) {
      const cache = await caches.open(API_CACHE);
      try {
        if (b.maintenance || !b.online) throw new Error("Maintenance or offline");

        const response = await fetch(req);

        if (response.ok) await cache.put(req, response.clone());

        const db = await openIndexedDB();
        db.transaction("meta", "readwrite").objectStore("meta").put(Date.now(), "lastUpdated");

        return response;
      }
      catch {
        const cached = await cache.match(req);
        return cached || new Response("Didn't cache API: " + req.url, { status: 503 });
      }
    }
  }
  return await fetch(req);
}

self.addEventListener("fetch", ev => {
  ev.respondWith(handleFetch(ev));
});

// sw.addEventListener("fetch", async ev => {
//   const request = ev.request;
//   ev.respondWith((async () => {
//     if (request.mode === "navigate") {
//       try {
//         const path = (new URL(request.url)).pathname;
//         if (path === "/join") return await fetch(request);

//         const res = await fetch(new URL("/api/account/auth", location.origin), { method: "GET", credentials: "include" });
//         const cache = await caches.open(API_CACHE);
//         cache.put("/auth", res.clone());

//         const json = await res.json();
//         if ((!json.classJoined) && ["/main", "/events", "/homework", "/uploads"].includes(path)) {
//           return Response.redirect("/join");
//         }
//       }
//       catch { /* Ignore auth status if user is offline */ }
//     }

//     if (request.method === "GET") {
//       const path = (new URL(request.url)).pathname;

//       if (CORE_APP.has(path)) {
//         const cache = await caches.open(CORE_CACHE);
//         const cached = await cache.match(request);

//         if (cached && CACHE_ENABLED) {
//           return cached;
//         }

//         try {
//           const res = await fetch(request);
//           ev.waitUntil(cache.put(request, res.clone()));
//           return res;
//         }
//         catch (err) {
//           console.log(err);
//           return new Response("Offline or fetch failed", { status: 503 });
//         }
//       }

//       if (API_ROUTES.has(path)) {
//         try {
//           const cache = await caches.open(API_CACHE);
//           const response = await fetch(request);

//           ev.waitUntil(
//             cache.put(request, response.clone())
//           );

//           const db = await openIndexedDB();
//           db.transaction("meta", "readwrite").objectStore("meta").put(Date.now(), "lastUpdated");

//           return response;
//         }
//         catch {
//           const cache = await caches.open(API_CACHE);
//           return (
//             (CACHE_ENABLED && await cache.match(request)) ||
//             new Response("Didn't cache API: " + request.url, { status: 503 })
//           );
//         }
//       }
//     }
//     return await fetch(request);
//   })());
// });

sw.addEventListener("message", async () => {
});
