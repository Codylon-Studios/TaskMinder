const nodeEnv = (process.env.NODE_ENV ?? "").trim().toUpperCase();
const isProd = nodeEnv === "PRODUCTION";
const bun = globalThis.Bun;

if (!bun) {
  throw new Error("Bun runtime is required to build frontend/dist/sw.js");
}

let sw = await bun.file("frontend/dist/sw.js").text();
const cacheFlagPattern = /const CACHE_ENABLED = (true|false);/;
if (!cacheFlagPattern.test(sw)) {
  throw new Error("Could not find CACHE_ENABLED constant in frontend/dist/sw.js");
}

const nextSw = sw.replace(
  cacheFlagPattern,
  `const CACHE_ENABLED = ${isProd};`
);

await bun.write("frontend/dist/sw.js", nextSw);