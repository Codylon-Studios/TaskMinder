import {
  readdir,
  ensureDir,
  stat as _stat,
  readFile,
  exists,
  writeFile,
  copy
} from "fs-extra";
import { join as _join, relative, sep, extname } from "path";
import { load } from "cheerio";

const sourceDir = process.argv[2];
const destDir = process.argv[3];

async function buildDirectory(src, dest) {
  const files = await readdir(src);
  await ensureDir(dest);

  for (const file of files) {
    const srcFile = _join(src, file);
    const destFile = _join(dest, file);

    const stat = await _stat(srcFile);

    if (stat.isDirectory()) {
      await buildDirectory(srcFile, destFile);
    }
    else if (file.endsWith("html")) {
      const relativePath = relative(sourceDir, srcFile);
      const pathSegments = relativePath.split(sep);

      if (pathSegments[0] === "pages") {
        const fileName = file.slice(0, -extname(file).length);
        const html = await readFile(srcFile);
        const $ = load(html);

        const titleMap = {
          about: "Über",
          events: "Ereignisse",
          homework: "Hausaufgaben",
          join: "Beitreten",
          main: "Übersicht",
          settings: "Einstellungen"
        };

        $("head").append(`
          <link rel="icon" href="/static/favicon.ico" type="image/x-icon">
          <link rel="manifest" href="/static/manifest.json">
          <script src="/vendor/jquery/jquery.min.js" type="module" defer></script>
          <script src="/vendor/bootstrap/bootstrap.bundle.min.js" type="module" defer></script>
          <script src="/global/global.js" type="module" defer></script>
          <link class="preload-style" rel="preload" href="/pages/${fileName}/${fileName}.css" as="style">
          <script src="/pages/${fileName}/${fileName}.js" type="module" defer></script>
          <title>${titleMap[fileName]} · TaskMinder</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script>
            document.addEventListener("DOMContentLoaded", () => {
              for (let pS of document.querySelectorAll(".preload-style")) {
                pS.rel='stylesheet'
              }
            })
          </script>
        `);
        // Color theme script
        $("head").append(`
          <script>
            (() => {
              let colorTheme;
              let themeColor = document.createElement("meta")
              themeColor.name = "theme-color"
              if (localStorage.getItem("colorTheme") == "dark") {
                colorTheme = "dark"
              }
              else if (localStorage.getItem("colorTheme") == "light") {
                colorTheme = "light"
              }
              else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
                colorTheme = "dark"
              }
              else {
                colorTheme = "light"
              }
              if (colorTheme == "light") {
                themeColor.content = "#f8f9fa"
              }
              else {
                document.getElementsByTagName("html")[0].style.background = "#212529"
                themeColor.content = "#2b3035"
              }
            })();
          </script>
        `);

        $("body").append(`
          <div class="load-snippet" data-target="pwaBanner"></div>
          <div class="load-snippet" data-target="navbar"></div>
          <div class="load-snippet" data-target="footer"></div>
        `);

        $("body").css({ display: "none" });

        let elements;
        do {
          elements = $(".load-snippet").toArray();
          for (const el of elements) {
            const target = $(el).data("target");
            const folder = _join(srcFile, "..", "..", "..", "snippets", target);
            if (await exists(_join(folder, target + ".html"))) {
              const $new = load(
                await readFile(_join(folder, target + ".html"))
              );
              if ($(el).data("target-id")) {
                $(el).replaceWith($new("#" + $(el).data("target-id")).html());
              }
              else {
                $(el).replaceWith($new.html());
              }
            }
            if (await exists(_join(folder, target + ".scss"))) {
              $("head").append(
                `<link class="preload-style" rel="preload" href="/snippets/${target}/${target}.css" as="style">`
              );
            }
            if (await exists(_join(folder, target + ".ts"))) {
              $("head").append(
                `<script src="/snippets/${target}/${target}.js" type="module" defer></script>`
              );
            }
          }
        } while (elements.length > 0);

        await writeFile(destFile, $.html());
      }
      else {
        await copy(srcFile, destFile);
      }
    }
  }
}

buildDirectory(sourceDir, destDir)
  .then(() => console.log("Successfully built html files"))
  .catch(err => console.error("Couldn't build html files:", err));
