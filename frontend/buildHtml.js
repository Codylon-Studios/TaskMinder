const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");

const sourceDir = process.argv[2];
const destDir = process.argv[3];

async function buildDirectory(src, dest) {
  const files = await fs.readdir(src);
  await fs.ensureDir(dest);

  for (const file of files) {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);

    const stat = await fs.stat(srcFile);

    if (stat.isDirectory()) {
      await buildDirectory(srcFile, destFile);
    }
    else if (file.endsWith("html")) {
      const relativePath = path.relative(sourceDir, srcFile);
      const pathSegments = relativePath.split(path.sep);

      if (pathSegments[0] === "pages") {
        const fileName = file.slice(0, - path.extname(file).length)
        const html = await fs.readFile(srcFile)
        const $ = cheerio.load(html)

        $("head").append(`
          <link rel="icon" href="/static/favicon.ico" type="image/x-icon">
          <link rel="manifest" href="/static/manifest.json">
          <script src="/vendor/jquery/jquery.min.js" type="module" defer></script>
          <script src="/vendor/bootstrap/bootstrap.bundle.min.js" type="module" defer></script>
          <script src="/global/global.js" type="module" defer></script>
          <link class="preload-style" rel="preload" href="/pages/${fileName}/${fileName}.css" as="style">
          <script src="/pages/${fileName}/${fileName}.js" type="module" defer></script>
          <script>
            document.addEventListener("DOMContentLoaded", () => {
              for (let pS of document.querySelectorAll(".preload-style")) {
                pS.rel='stylesheet'
              }
            })
          </script>
        `)
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
        `)

        $("body").append(`
          <div class="load-snippet" data-target="pwaBanner" data-html data-css data-js></div>
        `)

        $("body").css({ display: "none" })

        let elements = $(".load-snippet").toArray()
        for (const el of elements) {
          const target = $(el).data("target")
          if ($(el).data("html") != undefined) {
            const snippetPath = path.join(srcFile, "..", "..", "..", "snippets", target, target + ".html")
            const $new = cheerio.load(await fs.readFile(snippetPath))
            $(el).replaceWith($new.html())
          }
          if ($(el).data("css") != undefined) {
            $("head").append(`<link class="preload-style" rel="preload" href="/snippets/${target}/${target}.css" as="style">`)
          }
          if ($(el).data("js") != undefined) {
            $("head").append(`<script src="/snippets/${target}/${target}.js" type="module" defer></script>`)
          }
        }

        fs.writeFile(destFile, $.html())
      }
      else {
        await fs.copy(srcFile, destFile);
      }
    }
  }
}

buildDirectory(sourceDir, destDir)
  .then(() => console.log("Successfully built html files"))
  .catch(err => console.error("Couldn't build html files:", err));
