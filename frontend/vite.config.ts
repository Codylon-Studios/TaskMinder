import { defineConfig } from "vite";
import path, { resolve } from "path";
import fs from "fs-extra";
import { load } from "cheerio";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function htmlInjectPlugin() {
  return {
    name: "html-inject",
    // eslint-disable-next-line complexity
    async transformIndexHtml(html: string, context: { path: string, filename: string }) {
      const fileName = path.basename(context.path, ".html");
      const titleMap: Record<string, string> = {
        404: "Nicht gefunden",
        about: "Über",
        events: "Ereignisse",
        feedback: "Feedback",
        homework: "Hausaufgaben",
        join: "Beitreten",
        main: "Übersicht",
        report: "Unangemessenen Inhalt melden",
        settings: "Einstellungen"
      };

      // Load HTML with Cheerio for DOM manipulation
      const $ = load(html);

      // Add head elements
      $("head").append(`
        <link rel="icon" href="/static/favicon.ico" type="image/x-icon">
        <link rel="manifest" href="/static/manifest.json">
        <script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossorigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
        <title>${titleMap[fileName] || fileName} · TaskMinder</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      `);

      // Add body prepend elements
      $("body").prepend(`
        <div class="load-snippet" data-target="pwaBanner"></div>
        <div class="load-snippet" data-target="navbar"></div>
      `);

      // Add body append elements
      $("body").append(`
        <div class="load-snippet" data-target="footer"></div>
        <div class="load-snippet" data-target="bottombar"></div>
      `);

      // Process load-snippet elements
      let elements;
      const srcDir = path.resolve(__dirname, "src");

      do {
        elements = $(".load-snippet").toArray();

        for (const el of elements) {
          const $el = $(el);
          const target = $el.data("target") as string;
          const targetId = $el.data("target-id") as string;

          if (!target) continue;

          const snippetFolder = path.join(srcDir, "snippets", target);
          const htmlPath = path.join(snippetFolder, `${target}.html`);
          const tsPath = path.join(snippetFolder, `${target}.ts`);
          const jsPath = path.join(snippetFolder, `${target}.js`);

          try {
            // Check if HTML file exists and load it
            if (await fs.exists(htmlPath)) {
              const snippetHtml = await fs.readFile(htmlPath, "utf8");
              const $snippet = load(snippetHtml);

              // eslint-disable-next-line max-depth
              if (targetId) {
                // Replace with specific element by ID
                const targetElement = $snippet(`#${targetId}`);
                // eslint-disable-next-line max-depth
                if (targetElement.length > 0) {
                  $el.replaceWith(targetElement.html() || "");
                } 
                else {
                  $el.remove();
                }
              } 
              else {
                // Replace with entire snippet content
                $el.replaceWith($snippet.html() || "");
              }
            } 
            else {
              // Remove snippet placeholder if no HTML file found
              $el.remove();
            }

            // Add TypeScript/JavaScript file if it exists
            const scriptPath = (await fs.exists(tsPath)) ? tsPath : (await fs.exists(jsPath)) ? jsPath : null;
            if (scriptPath) {
              path.extname(scriptPath).slice(1);
              const scriptTag = `<script src="/assets/snippets-${target}.js" type="module" defer></script>`;
              // Only add if not already present
              // eslint-disable-next-line max-depth
              if ($(`script[src="/assets/snippets-${target}.js"]`).length === 0) {
                $("head").append(scriptTag);
              }
            }
          } 
          catch (error) {
            console.warn(`Warning: Could not process snippet "${target}":`, error);
            $el.remove();
          }
        }
      } while (elements.length > 0);

      // Group all toast containers to disable overlapping
      const toastContainers = $(".toast-container");
      if (toastContainers.length > 0) {
        const combinedToastHtml = toastContainers
          .map((_, container) => $(container).html())
          .get()
          .join("");

        // Remove existing toast containers
        toastContainers.remove();

        // Add single combined toast container
        $("body").append(
          `<div class='toast-container position-fixed top-0 end-0 p-3'>${combinedToastHtml}</div>`
        );
      }

      // Apply display: none to prevent FOUC until everything is loaded
      $("body").css({ display: "none" });

      return $.html();
    }
  };
}

export default defineConfig({
  base: "/",
  plugins: [
    {
      ...htmlInjectPlugin(),
      enforce: "pre"
    },
    {
      name: "fix-html-output-paths",
      writeBundle: {
        sequential: true,
        async handler() {
          const distDir = path.resolve(__dirname, "dist");
          const srcPagesDir = path.join(distDir, "src", "pages");
          const pagesDir = path.join(distDir, "pages");
          
          // Ensure pages directory exists
          await fs.ensureDir(pagesDir);
          
          if (await fs.pathExists(srcPagesDir)) {
            // Get all page directories
            const pageDirs = await fs.readdir(srcPagesDir);
            
            for (const pageDir of pageDirs) {
              const pagePath = path.join(srcPagesDir, pageDir);
              const stat = await fs.stat(pagePath);
              
              if (stat.isDirectory()) {
                const htmlFile = path.join(pagePath, `${pageDir}.html`);
                
                if (await fs.pathExists(htmlFile)) {
                  // Read the HTML content
                  let htmlContent = await fs.readFile(htmlFile, "utf-8");
                  
                  // Fix asset paths to be absolute from root
                  htmlContent = htmlContent
                    .replace(/href="\.\/assets\//g, 'href="/assets/')
                    .replace(/src="\.\/assets\//g, 'src="/assets/')
                    .replace(/href="assets\//g, 'href="/assets/')
                    .replace(/src="assets\//g, 'src="/assets/');
                  
                  // Write to the pages directory
                  const targetFile = path.join(pagesDir, `${pageDir}.html`);
                  await fs.writeFile(targetFile, htmlContent);
                  
                  console.log(`✓ Moved and fixed paths for ${pageDir}.html`);
                }
              }
            }
            
            // Remove the src directory
            await fs.remove(path.join(distDir, "src"));
            console.log("✓ Removed src directory from dist");
          }
        }
      }
    }
  ],
  build: {
    rollupOptions: {
      input: (() => {
        // Dynamic input generation (synchronous)
        const inputs: Record<string, string> = {
          join: resolve(__dirname, "src/pages/join/join.html"),
          main: resolve(__dirname, "src/pages/main/main.html"),
          settings: resolve(__dirname, "src/pages/settings/settings.html"),
          about: resolve(__dirname, "src/pages/about/about.html"),
          feedback: resolve(__dirname, "src/pages/feedback/feedback.html"),
          report: resolve(__dirname, "src/pages/report/report.html"),
          events: resolve(__dirname, "src/pages/events/events.html"),
          homework: resolve(__dirname, "src/pages/homework/homework.html"),
          "404": resolve(__dirname, "src/pages/404/404.html")
        };

        // Add snippet JS/TS files synchronously
        const snippetsDir = resolve(__dirname, "src/snippets");
        
        try {
          if (fs.existsSync(snippetsDir)) {
            const snippetFolders = fs.readdirSync(snippetsDir);
            
            for (const folder of snippetFolders) {
              const folderPath = path.join(snippetsDir, folder);
              const stats = fs.statSync(folderPath);
              
              if (stats.isDirectory()) {
                // Look for TypeScript file first, then JavaScript
                const tsFile = path.join(folderPath, `${folder}.ts`);
                const jsFile = path.join(folderPath, `${folder}.js`);
                
                // eslint-disable-next-line max-depth
                if (fs.existsSync(tsFile)) {
                  inputs[`snippets-${folder}`] = tsFile;
                } 
                else if (fs.existsSync(jsFile)) {
                  inputs[`snippets-${folder}`] = jsFile;
                }
              }
            }
          }
        } 
        catch (error) {
          console.warn("Warning: Could not scan snippets directory:", error);
        }

        return inputs;
      })(),
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]"
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: [
          "import",
          "color-functions",
          "global-builtin"
        ]
      }
    }
  },
  // Add public directory for static assets
  publicDir: "public",
  
  server: {
    proxy: {
      // catch-all
      "^/(.*)": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true
      }
    }
  },
  
  preview: {
    proxy: {
      // catch-all
      "^/(.*)": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true
      }
    }
  }
});