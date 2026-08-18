// IMPORTANT: migration script for production to delete the cache for taskminder.de (see nginx file)
// DO NOT delete this file for several months (or indefinitely), as dormant browsers may return much later

// helper for deleting indexDB database
function deleteDatabase(name) {
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.deleteDatabase(name);

    request.addEventListener("success", () => resolve());
    request.addEventListener("error", () => {
      reject(request.error ?? new Error(`Failed to delete ${name}`));
    });
    // An open connection blocks the delete. The browser keeps the request
    // queued and completes it once that connection closes, so stop waiting
    // here — otherwise this promise never settles and activate() hangs.
    request.addEventListener("blocked", () => {
      console.warn(`Deletion of ${name} is blocked by an open tab`);
      resolve();
    });
  });
}

// replace old worker using skipWaiting()
globalThis.addEventListener("install", event => {
  event.waitUntil(globalThis.skipWaiting());
});

globalThis.addEventListener("activate", event => {
  event.waitUntil((async () => {
    // take control of existing root-domain tabs
    await globalThis.clients.claim();
    // delete old root-domain caches
    const cacheNames = await globalThis.caches.keys();
    await Promise.all(
      cacheNames.map(name => globalThis.caches.delete(name))
    );

    await globalThis.registration.unregister();

    // reload open pages
    // nginx then redirects legacy app paths to app.taskminder.de
    const windows = await globalThis.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    await Promise.allSettled(
      windows.map(client => client.navigate(client.url))
    );

    await Promise.allSettled(
      ["app", "request-queue"].map(deleteDatabase)
    );
  })());
});