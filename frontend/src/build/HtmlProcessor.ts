import { readFile, exists } from "fs-extra";
import { join } from "path";
import { load } from "cheerio";

type CheerioAPI = ReturnType<typeof load>;

export interface SnippetConfig {
  target: string;
  targetId?: string;
  hasHtml: boolean;
  hasTypeScript: boolean;
  hasScss: boolean;
}

export interface BuildContext {
  mode: "development" | "production";
  sourceDir: string;
  outputDir: string;
  snippetCache: Map<string, string>;
  processedFiles: Set<string>;
}

export class HtmlProcessor {
  private context: BuildContext;
  private titleMap: Record<string, string> = {
    "404": "Nicht gefunden",
    "about": "Über",
    "events": "Ereignisse",
    "feedback": "Feedback",
    "homework": "Hausaufgaben",
    "join": "Beitreten",
    "main": "Übersicht",
    "report": "Unangemessenen Inhalt melden",
    "settings": "Einstellungen"
  };

  constructor(context: BuildContext) {
    this.context = context;
  }

  async processHtml(filePath: string, content: string): Promise<string> {
    const fileName = this.extractFileName(filePath);
    const $ = load(content);

    // Inject metadata first
    await this.injectMetadata($, fileName);

    // Add standard body elements
    this.addStandardBodyElements($);

    // Process snippets recursively
    await this.injectSnippets($);

    // Group toast containers
    this.groupToastContainers($);

    // Hide body initially (as in original buildHtml.js)
    $("body").css({ display: "none" });

    return $.html();
  }

  private extractFileName(filePath: string): string {
    const parts = filePath.split("/");
    const htmlFile = parts[parts.length - 1];
    return htmlFile.replace(".html", "");
  }

  private async findGlobalJsFile(): Promise<string> {
    const { glob } = await import("glob");
    const globalDir = join(this.context.outputDir, "global");
    const assetsDir = join(this.context.outputDir, "assets");
    
    try {
      // First check if there's a global.js file in the global directory
      const globalFiles = await glob(join(globalDir, "global.js"));
      if (globalFiles.length > 0) {
        return "/global/global.js";
      }
      
      // Then check if there's a version in assets (with hash)
      const assetFiles = await glob(join(assetsDir, "global-*.js"));
      if (assetFiles.length > 0) {
        const fileName = assetFiles[0].split("/").pop();
        return `/assets/${fileName}`;
      }
    } 
    catch (error) {
      console.warn("Could not find global.js file:", error);
    }
    
    // Fallback to the old path if not found
    return "/global/global.js";
  }

  private async findSnippetJsFile(snippetName: string): Promise<string> {
    const { glob } = await import("glob");
    const assetsDir = join(this.context.outputDir, "assets");
    const snippetsDir = join(this.context.outputDir, "snippets");
    
    try {
      // First check if there's a version in assets (with hash)
      const assetFiles = await glob(join(assetsDir, `${snippetName}-*.js`));
      if (assetFiles.length > 0) {
        const fileName = assetFiles[0].split("/").pop();
        return `/assets/${fileName}`;
      }
      
      // Then check if there's a version in snippets directory
      const snippetFiles = await glob(join(snippetsDir, snippetName, `${snippetName}.js`));
      if (snippetFiles.length > 0) {
        return `/snippets/${snippetName}/${snippetName}.js`;
      }
    } 
    catch (error) {
      console.warn(`Could not find ${snippetName}.js file:`, error);
    }
    
    // Fallback to the old path if not found
    return `/snippets/${snippetName}/${snippetName}.js`;
  }

  private async injectMetadata($: CheerioAPI, fileName: string): Promise<void> {
    // Find the global.js file in the assets directory
    const globalJsPath = await this.findGlobalJsFile();
    
    // All pages should now have CSS files
    const cssPath = `/pages/${fileName}/${fileName}.css`;
    
    // Add all the head elements as in the original buildHtml.js
    $("head").append(`
      <link rel="icon" href="/static/favicon.ico" type="image/x-icon">
      <link rel="manifest" href="/static/manifest.json">
      <script src="/vendor/jquery/jquery.min.js" type="module" defer></script>
      <script src="/vendor/bootstrap/bootstrap.bundle.min.js" type="module" defer></script>
      <script src="/vendor/qrcode/qrcode.min.js" defer></script>
      <script src="${globalJsPath}" type="module" defer></script>
      <link class="preload-style" rel="preload" href="${cssPath}" as="style">
      <script src="/pages/${fileName}/${fileName}.js" type="module" defer></script>
      <title>${this.titleMap[fileName] || fileName} · TaskMinder</title>
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

    // Add color theme script
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
          document.head.appendChild(themeColor)
        })();
      </script>
    `);
  }



  private addStandardBodyElements($: CheerioAPI): void {
    // Add standard snippets to body as in original buildHtml.js
    $("body").prepend(`
      <div class="load-snippet" data-target="pwaBanner"></div>
      <div class="load-snippet" data-target="navbar"></div>
    `);

    $("body").append(`
      <div class="load-snippet" data-target="footer"></div>
      <div class="load-snippet" data-target="bottombar"></div>
    `);
  }

  async injectSnippets($: CheerioAPI): Promise<void> {
    let elements: unknown[];
    
    // Process snippets recursively until no more load-snippet elements exist
    do {
      elements = $(".load-snippet").toArray();
      
      for (const el of elements) {
        const $el = $(el);
        const target = $el.data("target") as string;
        const targetId = $el.data("target-id") as string;
        
        if (!target) continue;

        try {
          // Get snippet content
          const snippetContent = await this.loadSnippet(target);
          
          if (snippetContent) {
            const $snippet = load(snippetContent);
            
            if (targetId) {
              // Replace with specific element by ID
              const targetElement = $snippet(`#${targetId}`);
              if (targetElement.length > 0) {
                $el.replaceWith(targetElement.html() || "");
              } 
              else {
                console.warn(`Target ID "${targetId}" not found in snippet "${target}"`);
                $el.remove();
              }
            } 
            else {
              // Replace with entire snippet content
              $el.replaceWith($snippet.html() || "");
            }

            // Add TypeScript reference if exists
            await this.addSnippetScript($, target);
          } 
          else {
            // Remove the load-snippet div if no content found
            $el.remove();
          }
        } 
        catch (error) {
          console.warn(`Error processing snippet "${target}":`, error);
          $el.remove();
        }
      }
    } while (elements.length > 0);
  }

  private async loadSnippet(target: string): Promise<string | null> {
    // Check cache first
    if (this.context.snippetCache.has(target)) {
      return this.context.snippetCache.get(target) || null;
    }

    // Build path to snippet HTML file
    const snippetDir = join(this.context.sourceDir, "snippets", target);
    const snippetHtmlPath = join(snippetDir, `${target}.html`);

    try {
      if (await exists(snippetHtmlPath)) {
        const content = await readFile(snippetHtmlPath, "utf8");
        this.context.snippetCache.set(target, content);
        return content;
      }
    } 
    catch (error) {
      console.warn(`Could not load snippet "${target}":`, error);
    }

    return null;
  }

  private async addSnippetScript($: CheerioAPI, target: string): Promise<void> {
    const snippetDir = join(this.context.sourceDir, "snippets", target);
    const snippetTsPath = join(snippetDir, `${target}.ts`);

    try {
      if (await exists(snippetTsPath)) {
        // Find the snippet file in the assets directory
        const snippetJsPath = await this.findSnippetJsFile(target);
        
        // Add script reference to head
        $("head").append(
          `<script src="${snippetJsPath}" type="module" defer></script>`
        );
      }
    } 
    catch (error) {
      console.warn(`Could not check TypeScript file for snippet "${target}":`, error);
    }
  }

  private groupToastContainers($: CheerioAPI): void {
    // Group all toast containers to disable overlapping (as in original buildHtml.js)
    const toastContainers = $(".toast-container");
    
    if (toastContainers.length > 0) {
      // Collect all toast container content
      const allToastContent = toastContainers.map((index, element) => {
        const content = $(element).html();
        $(element).remove();
        return content;
      }).get().join("");

      // Add single toast container with all content
      $("body").append(
        $('<div class="toast-container position-fixed top-0 end-0 p-3"></div>').html(allToastContent)
      );
    }
  }
}